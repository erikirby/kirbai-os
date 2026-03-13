import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { logApiUsage, logImageUsage } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { mission, shot, isEdit, customPrompt } = await req.json();

        if (!mission || !shot) {
            return NextResponse.json({ error: "Missing mission or shot data" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

        const ai = new GoogleGenAI({ apiKey });
        
        // CONFIRMED ID: Nano Banana 2 = gemini-3.1-flash-image-preview
        const modelName = "gemini-3.1-flash-image-preview"; 

        const prompt = customPrompt || shot.bananaPromptV2 || shot.bananaPrompt;

        const parts: any[] = [{ 
            text: `ACTION: Generate a high-fidelity image accurately representing the prompt below.
STRICT REQUIREMENT: You MUST mirror the exact art style, character design, and line-work found in the provided REFERENCE images.
CORE STYLE: Vibrant, high-fashion, premium aesthetic. Use the visual references as the ABSOLUTE PRIMARY source for the final render's style and details. See ref image for model and art style.

PROMPT: ${prompt}
`
        }];

        // 1. Add predetermined reference images based on refLabels
        console.log("--- MULTIMODAL PAYLOAD PREP ---");
        if (shot.refLabels && mission.requiredReferences && mission.references) {
            console.log(`Found ${shot.refLabels.length} refLabels for this shot:`, shot.refLabels);
            shot.refLabels.forEach((label: string) => {
                const req = mission.requiredReferences.find((r: any) => r.label === label);
                if (req && req.uploadedIndex !== undefined && mission.references[req.uploadedIndex]) {
                    console.log(`[VERIFIED] Attaching reference image for: ${label} (index ${req.uploadedIndex})`);
                    console.log(`[DEBUG] Reference details: label=${label}, uploadedIndex=${req.uploadedIndex}, reference_length=${mission.references[req.uploadedIndex].length}`);
                    const base64Data = mission.references[req.uploadedIndex].split(',')[1] || mission.references[req.uploadedIndex];
                    parts.push({
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64Data
                        }
                    });
                } else {
                    console.log(`[WARNING] Missing reference image for label: ${label}`);
                    console.log(`[DEBUG] req: ${JSON.stringify(req)}, uploadedIndex: ${req?.uploadedIndex}, mission.references[req?.uploadedIndex] exists: ${!!mission.references[req?.uploadedIndex]}`);
                }
            });
        }

        // 2. Add "Edit" context if requested
        if (isEdit && shot.thumbnailUrl) {
            const base64Prev = shot.thumbnailUrl.split(',')[1] || shot.thumbnailUrl;
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Prev
                }
            });
            parts[0].text += "\n\nNOTE: I have provided the previous generation. Please refine it based on the prompt while maintaining structural consistency.";
        }

        console.log(`--- CALLING NANO BANANA (Total Parts: ${parts.length}) ---`);
        parts.forEach((p, i) => {
            if (p.inlineData) console.log(`Part ${i}: IMAGE (${p.inlineData.mimeType}, ${p.inlineData.data.length} bytes)`);
            if (p.text) console.log(`Part ${i}: TEXT (${p.text.substring(0, 50)}...)`);
        });

        const result = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts }]
        });

        if (result.usageMetadata) {
            logApiUsage(`/api/director/generate-image (${isEdit ? 'Edit' : 'New'})`, result.usageMetadata.promptTokenCount || 0, result.usageMetadata.candidatesTokenCount || 0);
        }

        const candidate = result.candidates?.[0];
        if (!candidate) throw new Error("Nano Banana returned no candidates. Try a different prompt.");
        if (candidate.finishReason === 'SAFETY') throw new Error("Generation blocked by Safety Filters.");

        const imagePart = candidate.content?.parts?.find(p => (p as any).inlineData);
        
        if (imagePart && (imagePart as any).inlineData) {
            const base64Image = `data:${(imagePart as any).inlineData.mimeType};base64,${(imagePart as any).inlineData.data}`;
            logImageUsage(1, modelName); // Track high-res image cost
            return NextResponse.json({ 
                success: true, 
                thumbnailUrl: base64Image,
                prompt: prompt 
            });
        } else {
            throw new Error("Nano Banana generated text but no image. Ensure the prompt is focused on visual output.");
        }

    } catch (e: any) {
        console.error("Generation Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
