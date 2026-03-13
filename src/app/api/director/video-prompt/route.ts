import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { logApiUsage } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { thumbnailUrl, visualDescription, shotId } = await req.json();

        if (!thumbnailUrl) {
            return NextResponse.json({ error: "Missing image for analysis" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

        const ai = new GoogleGenAI({ apiKey });
        const base64Data = thumbnailUrl.split(',')[1] || thumbnailUrl;

        const prompt = `
            You are "The Video Architect". Your goal is to write a stable, high-fidelity command for a video generation model (like Grok, Sora, or Runway).
            
            INPUT:
            - Character/Scene Image: [Provided]
            - Action Intent: "${visualDescription || 'Subtle character motion'}"
            
            STRICT ANTI-MORPHING RULES:
            1. MANDATORY PREFIX: Start exactly with: "models stay consistent and do not morph. no music, only sound effects. "
            2. STABILITY: If the action does not explicitly require facial movement, add: "facial expression stays frozen. "
            3. NO PIXAR: Do NOT use emotional adjectives (e.g., "sad", "happy", "depressed"). 
            4. PHYSICALITY: Convert emotions into physical actions.
               - Instead of "sad", describe: "a single tear rolling down the cheek, steady gaze".
               - Instead of "angry", describe: "furrowed brow, tense jaw, eyes narrowed".
               - Instead of "happy", describe: "corners of the mouth subtly upturned, bright eyes".
            5. FOCUS: Describe the camera movement and the specific physical motion of the subject.
            6. LENGTH: Keep the final output concise and punchy.
            
            OUTPUT FORMAT:
            Just the raw prompt string.
        `;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64Data
                        }
                    }
                ]
            }]
        });

        const videoPrompt = result.text;

        // Log usage (Flash token rates)
        if (result.usageMetadata) {
            logApiUsage(`/api/director/video-prompt`, result.usageMetadata.promptTokenCount || 0, result.usageMetadata.candidatesTokenCount || 0);
        }

        return NextResponse.json({ success: true, prompt: videoPrompt });
    } catch (e: any) {
        console.error("Video Prompt Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
