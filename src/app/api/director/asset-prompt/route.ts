import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { mission, requirement } = await req.json();

        if (!mission || !requirement) {
            return NextResponse.json({ error: "Missing mission or requirement data" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
            You are "The Asset Artist". Your goal is to generate a high-fidelity image generation prompt for a specific visual source material.
            
            MISSION CONTEXT:
            - Title: ${mission.title}
            - Description: ${mission.conceptDescription}
            - Style: Kirbai OS (90s Anime, High-Fashion, Camp, Pokemon aesthetic).
            
            TARGET ASSET:
            - Label: ${requirement.label}
            - Category: ${requirement.category}
            - Description: ${requirement.description}
            
            RULES:
            1. Output ONLY the finalized prompt for Banana (Image Generator).
            2. Hardcode "9:16 aspect ratio" if it's a character or location.
            3. Ensure the prompt describes textures, lighting (e.g. vaporwave, soft glow), and specific pokemon features.
            4. If it's a character, describe the specific outfit and pose based on the description.
            5. The prompt should be descriptive enough to act as a standalone generation for this asset.
        `;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        const generatedPrompt = result.text;

        return NextResponse.json({ prompt: generatedPrompt });
    } catch (e: any) {
        console.error("Asset Prompt Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
