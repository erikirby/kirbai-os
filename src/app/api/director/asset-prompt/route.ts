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
            You are "The Asset Artist". Your goal is to generate an EXTREMELY CONCISE, technical visual prompt for a high-fidelity reference asset.
            
            MISSION CONTEXT:
            - Title: ${mission.title}
            - Description: ${mission.conceptDescription}
            
            TARGET ASSET:
            - Label: ${requirement.label}
            - Category: ${requirement.category}
            - Description: ${requirement.description}
            
            RULES (STRICT):
            1. Output ONLY the finalized prompt. NO conversational text.
            2. MANDATORY PREFIX: You MUST start every response with "generate image of a ".
            3. BACKGROUND: If Category is "Character" or "Object", YOU MUST include "grey studio background" for isolation.
            4. **OFFICIAL DESIGNS**: You MUST adhere to the official Pokemon designs, shapes, and colors. Do NOT hallucinate colors (e.g., if a Pokemon is teal/cream, do not call it 'blue').
            5. **TEXTURE & MATERIALS**: For all assets, specify realistic textures: "hyper-realistic fur, detailed skin texture, subsurface scattering, reflective metallic surfaces, or photorealistic environmental materials."
            6. **POSE & PROPS**: For Characters, enforce a "neutral standing pose" or "T-pose". Do NOT add props, food, snacks, or accessories unless explicitly in the Description. Focus purely on the character's physical model.
            7. **LIGHTING**: Use "professional studio lighting, cinematic high-fidelity, 8k resolution."
            8. **NO PEOPLE**: Include the literal phrase "no people".
            9. STORYBOARD SYNC: If the STORYBOARD below mentions specific physical states (e.g., "damaged armor", "glow-in-the-dark eyes"), incorporate those. Otherwise, stay neutral.
            10. ASPECT RATIO: Include "9:16 aspect ratio".
            
            STORYBOARD (ORPHAN CONTEXT):
            ${mission.shots.map((s: any) => `[${s.timestamp}] ${s.visualDescription}`).join("\n")}
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
