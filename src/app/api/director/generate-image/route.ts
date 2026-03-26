import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { logImageUsageAsync, getTelemetryAsync } from "@/lib/db";

// Image generation takes 15-40s — must extend Vercel timeout
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { mission, shot, isEdit, customPrompt } = await req.json();

        if (!mission || !shot) {
            return NextResponse.json({ error: "Missing mission or shot data" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

        const ai = new GoogleGenAI({ apiKey });

        // This is the ONLY Gemini model that can output image data via the standard API key
        // (Imagen models require Vertex AI, NOT the standard API key)
        const modelName = "gemini-2.0-flash-exp-image-generation";

        const prompt = customPrompt || shot.bananaPromptV2 || shot.bananaPrompt;
        if (!prompt) {
            return NextResponse.json({ error: "No prompt found for this shot. Please generate a shot prompt first." }, { status: 400 });
        }

        // Build multimodal parts array: text prompt first, then reference images
        const parts: any[] = [{
            text: `Generate a high-fidelity image of the following scene:

${prompt}

Requirements:
- Mirror the art style, character design, and aesthetics from any provided reference images.
- Vibrant, premium Pokémon aesthetic.
- 9:16 aspect ratio.
- No human people.
${isEdit ? '- Refine the provided previous generation while maintaining structural consistency.' : ''}`
        }];

        // Attach reference images for style/character conditioning
        if (shot.refLabels && mission.requiredReferences && mission.references) {
            console.log(`--- ATTACHING REFERENCES (${shot.refLabels.length} labels) ---`);
            shot.refLabels.forEach((label: string) => {
                const reqRef = mission.requiredReferences.find((r: any) => r.label === label);
                if (reqRef && reqRef.uploadedIndex !== undefined && mission.references[reqRef.uploadedIndex]) {
                    const rawRef = mission.references[reqRef.uploadedIndex];
                    const base64Data = rawRef.startsWith('data:') ? rawRef.split(',')[1] : rawRef;
                    console.log(`[ATTACHED] ${label} (ref[${reqRef.uploadedIndex}])`);
                    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
                } else {
                    console.log(`[SKIPPED] ${label} — no image uploaded`);
                }
            });
        }

        // For edits, attach the previous generation as context
        if (isEdit && shot.thumbnailUrl) {
            const base64Prev = shot.thumbnailUrl.startsWith('data:') ? shot.thumbnailUrl.split(',')[1] : shot.thumbnailUrl;
            parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Prev } });
        }

        console.log(`--- CALLING ${modelName} (${parts.length} parts) ---`);

        const result = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts }],
            config: {
                // CRITICAL: responseModalities tells the model to output IMAGE data, not text
                responseModalities: ['IMAGE', 'TEXT'],
            }
        });

        const candidate = result.candidates?.[0];
        if (!candidate) {
            throw new Error("No candidates returned. Try again or simplify the prompt.");
        }

        if (candidate.finishReason === 'SAFETY') {
            throw new Error("Generation blocked by safety filters. Try a less complex prompt.");
        }

        // Find the image part in the response
        const imagePart = candidate.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
        const textPart = candidate.content?.parts?.find((p: any) => p.text);

        if (imagePart?.inlineData) {
            const base64Image = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            await logImageUsageAsync(1, modelName);
            const telemetry = await getTelemetryAsync();
            return NextResponse.json({
                success: true,
                thumbnailUrl: base64Image,
                prompt,
                telemetry
            });
        } else {
            // Log what the model returned so we can debug via Vercel logs
            const aiText = textPart?.text?.substring(0, 100) || "no text";
            console.error(`[NO IMAGE] Model returned text only. finishReason=${candidate.finishReason}. Text: "${aiText}"`);
            throw new Error(`Image generation failed — model returned text only (finishReason: ${candidate.finishReason}). Try simplifying the prompt or reducing the number of reference images.`);
        }

    } catch (e: any) {
        console.error("Generation Error:", e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
