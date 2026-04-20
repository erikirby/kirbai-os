import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { safeCallGemini, callOpenRouter, callGroq } from '@/lib/intel';

export async function POST(req: NextRequest) {
    try {
        const { mission, shot, currentPrompt, entropy } = await req.json();

        if (!mission || !shot) {
            return NextResponse.json({ error: "Missing mission or shot data" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

        const prompt = `
            You are "The Visualist". Your goal is to EXCISE and RETHINK a single frame from a Director's vision.
            
            MISSION: ${mission.title}
            LEGACY VISION (Original intent): ${shot.visualDescription}
            CURRENT ERRONEOUS PROMPT (Must be fixed): ${currentPrompt}
            LYRIC: ${shot.lyric}
            REFERENCES AVAILABLE: ${shot.refLabels?.join(", ") || "None"}
            
            CRITICAL DIRECTIVE:
            The Current Erroneous Prompt incorrectly includes video editing terms like "match cut", "transitions", "fades", or "cuts to". 
            YOU MUST DISCARD ALL EDITING LOGIC found in the Current Prompt and Legacy Vision.
            Choose ONE specific moment from that vision and describe it as a single, high-fidelity, motionless "Start Frame".
            
            RULES (STRICT):
            1. Output ONLY the finalized prompt. NO conversational text.
            2. MANDATORY PREFIX: You MUST start every response with "Based on the [labels] sources, ".
            3. **STRICTLY STATIC**: Forbid "motion blur", "speed lines", "motion trails", or "blurring past".
            4. **MANDATORY PREFIX**: You MUST start every response with "A high-fidelity cinematic 8k render of ".
            5. **NO EDITING TERMINOLOGY**: NEVER use terms like "match cut", "transition", "split screen".
            6. **PROMPT SYNC**: Reference labels in brackets exactly (e.g. "[Pheromosa Character]").
            7. **LENS & LIGHTING**: Specify cinematic lighting (e.g. "35mm lens, rim lighting, 8k resolution").
            8. **NO PEOPLE**: Include "no people". 9:16 aspect ratio.
            Focus on creating a visually arresting, premium "start frame" that the animator can then bring to life.
            [ENTROPY: ${entropy}]
        `;

        let generatedPrompt = "";
        try {
            const result = await safeCallGemini("gemini-2.5-flash", {
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            generatedPrompt = result.text || "";
        } catch (geminiErr: any) {
            console.warn(`[shot-prompt] Gemini failed: ${geminiErr.message?.slice(0, 60)}`);
            try {
                generatedPrompt = await callOpenRouter(prompt, "", false);
            } catch (orErr: any) {
                console.warn(`[shot-prompt] OpenRouter failed: ${orErr.message?.slice(0, 60)}`);
                generatedPrompt = await callGroq(prompt, "", false);
            }
        }

        return NextResponse.json({ prompt: generatedPrompt });
    } catch (e: any) {
        console.error("Shot Prompt Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
