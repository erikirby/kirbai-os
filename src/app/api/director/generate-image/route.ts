import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, SubjectReferenceImage } from '@google/genai';
import { logImageUsageAsync, getTelemetryAsync } from "@/lib/db";

// Increase Vercel function timeout — image generation takes 15-40s
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

        const prompt = customPrompt || shot.bananaPromptV2 || shot.bananaPrompt;
        if (!prompt) {
            return NextResponse.json({ error: "No prompt found for this shot. Please generate a shot prompt first." }, { status: 400 });
        }

        const fullPrompt = `${prompt}\n\nVibrant, high-fashion, premium Pokémon aesthetic. Ultra-detailed, 8k resolution. 9:16 aspect ratio. No humans or real people.`;

        // Collect reference images
        const refImages: SubjectReferenceImage[] = [];

        if (shot.refLabels && mission.requiredReferences && mission.references) {
            console.log(`--- BUILDING REFERENCE PAYLOAD (${shot.refLabels.length} labels) ---`);
            shot.refLabels.forEach((label: string, idx: number) => {
                const reqRef = mission.requiredReferences.find((r: any) => r.label === label);
                if (reqRef && reqRef.uploadedIndex !== undefined && mission.references[reqRef.uploadedIndex]) {
                    const rawRef = mission.references[reqRef.uploadedIndex];
                    const base64Data = rawRef.startsWith('data:') ? rawRef.split(',')[1] : rawRef;
                    console.log(`[ATTACHED] ${label} (ref index ${reqRef.uploadedIndex})`);
                    
                    // SubjectReferenceImage properties are set directly (no constructor args)
                    const subjectRef = new SubjectReferenceImage();
                    subjectRef.referenceId = idx + 1;
                    subjectRef.referenceImage = { imageBytes: base64Data };
                    subjectRef.config = { subjectDescription: label };
                    refImages.push(subjectRef);
                } else {
                    console.log(`[SKIPPED] ${label} — no uploaded image`);
                }
            });
        }

        // Add previous generation as reference for edits
        if (isEdit && shot.thumbnailUrl) {
            const base64Prev = shot.thumbnailUrl.startsWith('data:') ? shot.thumbnailUrl.split(',')[1] : shot.thumbnailUrl;
            const editRef = new SubjectReferenceImage();
            editRef.referenceId = refImages.length + 1;
            editRef.referenceImage = { imageBytes: base64Prev };
            editRef.config = { subjectDescription: "Previous generation to refine" };
            refImages.push(editRef);
        }

        let imageBytes: string;
        const mimeType = 'image/png';

        if (refImages.length > 0) {
            // PATH A: editImage — reference-conditioned generation (style + character consistency)
            console.log(`--- CALLING IMAGEN editImage (${refImages.length} references) ---`);
            const editPrompt = `${fullPrompt}\n\nIMPORTANT: Mirror the exact art style, character design, and line-work from the provided reference images with strict accuracy.`;

            const result = await ai.models.editImage({
                model: 'imagen-3.0-capability-001',
                prompt: editPrompt,
                referenceImages: refImages,
                config: {
                    numberOfImages: 1,
                    aspectRatio: '9:16',
                }
            });

            const img = result.generatedImages?.[0]?.image?.imageBytes;
            if (!img) throw new Error("Imagen returned no images. The references may be too complex or the prompt may conflict with safety filters. Try removing some references.");
            imageBytes = img;
        } else {
            // PATH B: generateImages — pure text-to-image
            console.log(`--- CALLING IMAGEN generateImages (text-only) ---`);
            const result = await ai.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: fullPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: '9:16',
                    negativePrompt: 'humans, real people, text, watermark, blurry, low quality',
                }
            });

            const img = result.generatedImages?.[0]?.image?.imageBytes;
            if (!img) throw new Error("Imagen returned no images. Please adjust the prompt or try again.");
            imageBytes = img;
        }

        const base64Image = `data:${mimeType};base64,${imageBytes}`;
        await logImageUsageAsync(1, 'imagen-3.0');
        const telemetry = await getTelemetryAsync();
        return NextResponse.json({ 
            success: true, 
            thumbnailUrl: base64Image,
            prompt: prompt,
            telemetry
        });

    } catch (e: any) {
        console.error("Generation Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
