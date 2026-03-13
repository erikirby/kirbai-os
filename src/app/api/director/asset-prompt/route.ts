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
            3. **ISOLATION & BACKGROUND**: 
               - If Category is "Character" or "Object": You MUST generate an isolated model in a "neutral standing pose" or "T-pose" on a "plain grey studio background". NO environment, NO props.
               - If Category is "Location": You MUST generate a "full-screen environmental wide shot" with "NO characters, NO pokemon, and NO people". It must be a completely empty architectural or natural space.
            4. **OFFICIAL DESIGNS**: Adhere to official designs and colors. However, YOU MUST include the phrase "adhering to the design, shape, and colors of the provided reference image" to ensure variant accuracy (like Shinies).
            5. **TEXTURE & MATERIALS**: For all assets, specify realistic textures: "hyper-realistic fur, detailed skin texture, subsurface scattering, reflective metallic surfaces, or photorealistic environmental materials."
            6. **LIGHTING**: Use "professional studio lighting, cinematic high-fidelity, 8k resolution."
            7. **NO PEOPLE**: Include the literal phrase "no people".
            8. ASPECT RATIO: Include "9:16 aspect ratio".
            
            The goal is for this prompt to generate a high-fidelity "ingredient" (an isolated asset or an empty room) that serves as the visual anchor for future video shots. It should NOT be a cinematic story-driven shot itself.
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
