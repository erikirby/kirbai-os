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
             You are "The Asset Artist". Your goal is to generate an EXTREMELY CONCISE visual prompt for a specific source asset.
            
            MISSION CONTEXT:
            - Title: ${mission.title}
            - Description: ${mission.conceptDescription}
            
            STORYBOARD (BLOCKING):
            ${mission.shots.map((s: any) => `[${s.timestamp}] ${s.visualDescription}`).join("\n")}
            
            TARGET ASSET:
            - Label: ${requirement.label}
            - Category: ${requirement.category}
            - Description: ${requirement.description}
            
            RULES (STRICT):
            1. Output ONLY the finalized prompt. NO conversational text.
            2. MANDATORY PREFIX: You MUST start every response with the exact words "generate image of a ".
            3. BACKGROUND: If Category is "Character" or "Object", YOU MUST include the phrase "grey background" to ensure asset isolation.
            4. STORYBOARD SYNC: Scan the MISSION CONTEXT and STORYBOARD above. If this asset or its environment is described in any shot (e.g., "pristine white floor" or "dark industrial setting"), YOU MUST incorporate those specific visual details into the prompt to ensure consistency.
            5. MINIMALISM: Use short, punchy phrases. Avoid flowery adjectives.
            6. NO PEOPLE: Unless explicitly stated as a main character, do NOT include humans, figures, or people. Focus on the architecture/object. YOU MUST INCLUDE the literal phrase "no people" to ensure the generator avoids humanoids.
            7. ASPECT RATIO: You MUST include the exact phrase "9:16 aspect ratio".
            8. NO SELF-REFERENCE: Do NOT mention "see ref image" or "following style". This prompt IS the source of truth for the reference.
            9. FOCUS: Describe the subject, key physical features, materials, and lighting.
            
            The goal is for this prompt to generate a high-fidelity reference image that serves as the visual anchor for future video shots.
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
