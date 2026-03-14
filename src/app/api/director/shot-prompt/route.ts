import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { mission, shot } = await req.json();

        if (!mission || !shot) {
            return NextResponse.json({ error: "Missing mission or shot data" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
            You are "The Visualist". Your goal is to rethink and refine the "Banana Image Prompt" for a specific shot in a music video mission.
            
            MISSION: ${mission.title}
            SHOT DESCRIPTION: ${shot.visualDescription}
            LYRIC: ${shot.lyric}
            REFERENCES AVAILABLE: ${shot.refLabels?.join(", ") || "None"}
            
            RULES (STRICT):
            1. Output ONLY the finalized prompt. NO conversational text.
            2. MANDATORY PREFIX: You MUST start every response with "Based on the [labels] sources, ".
            3. **STATIC START FRAME**: This is an ingredient for future animation. DO NOT include "motion blur", "speed lines", "motion trails", or "blurring past".
            4. **NO EDITING TERMINOLOGY**: Strictly forbid video editing terms like "match cut", "transition", "fade", "split screen", or "cut to". Describe a SINGLE, frozen, high-fidelity moment.
            5. **PROMPT SYNC**: Explicitly reference the asset labels in brackets exactly as provided (e.g. "[Pheromosa Character]").
            6. **LENS & LIGHTING**: Specify cinematic lighting and lens details (e.g. "35mm lens, rim lighting, professional studio lighting, 8k resolution").
            7. **NO PEOPLE**: Include the literal phrase "no people".
            8. ASPECT RATIO: Include "9:16 aspect ratio".
            
            Focus on creating a visually arresting, premium "start frame" that the animator can then bring to life.
        `;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        const generatedPrompt = result.text;

        return NextResponse.json({ prompt: generatedPrompt });
    } catch (e: any) {
        console.error("Shot Prompt Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
