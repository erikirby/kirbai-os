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
            3. **ISOLATION**: This is a REFERENCE ASSET. You MUST generate an isolated model/sprite. NO background scene, NO action, NO secondary characters, and NO environmental context from the mission. 
            4. **BACKGROUND**: You MUST include "grey studio background" to ensure the asset can be used in any scene.
            5. **OFFICIAL DESIGNS**: You MUST adhere to the official Pokemon designs, shapes, and colors. However, YOU MUST include the phrase "adhering to the design, shape, and colors of the provided reference image" to ensure the generator follows the specific variant (like a Shiny) that the user has uploaded.
            6. **TEXTURE & MATERIALS**: For all assets, specify realistic textures: "hyper-realistic fur, detailed skin texture, subsurface scattering, reflective metallic surfaces, or photorealistic environmental materials."
            7. **POSE**: For Characters, enforce a "neutral standing pose" or "T-pose".
            8. **LIGHTING**: Use "professional studio lighting, cinematic high-fidelity, 8k resolution."
            9. **NO PEOPLE**: Include the literal phrase "no people".
            10. ASPECT RATIO: Include "9:16 aspect ratio".
            
            The goal is for this prompt to generate a high-fidelity reference image that serves as the visual anchor for future video shots. It should NOT be a cinematic shot itself.
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
