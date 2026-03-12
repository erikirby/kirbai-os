import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { saveMissionAsync, logApiUsage } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { concept, lyrics, mode, alias } = await req.json();

        if (!concept || !lyrics) {
            return NextResponse.json({ error: "Missing concept or lyrics" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const ai = new GoogleGenAI({ apiKey });

        // Phase 1: The Director Drafts the Vision
        const directorPrompt = `
            You are "The Director", a specialist in narrative music videos for Kirbai OS.
            CONCEPT: ${concept.title} - ${concept.description}
            LYRICS: ${lyrics}
            MODE: ${mode}

            Your goal is to draft a cinematic shot list. Each shot must have a timestamp and a clear visual description.
            Focus on camera angles (Wide, Medium, Close-up), lighting, and character emotion.
            Ensure the narrative is clear even without the lyrics.
        `;

        const directorResult = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: [{ role: 'user', parts: [{ text: directorPrompt }] }]
        });
        const directorDraft = directorResult.text;
        
        if (directorResult.usageMetadata) {
            logApiUsage("/api/director/plan (Director)", directorResult.usageMetadata.promptTokenCount || 0, directorResult.usageMetadata.candidatesTokenCount || 0);
        }

        // Phase 2: The Strategist Critiques for Retention
        const strategistPrompt = `
            You are "The Retention Strategist". You specialize in TikTok/Reels and high-engagement music videos.
            The Director has proposed this plan:
            ${directorDraft}

            Critique this plan. Focus on:
            1. The Hook: Is the first 3 seconds visually arresting?
            2. Pacing: Are there enough pattern interrupts (visual changes)?
            3. Clarity: Will a scrolling user understand what's happening?

            Suggest specific improvements to the Director's plan.
        `;

        const strategistResult = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: [{ role: 'user', parts: [{ text: strategistPrompt }] }]
        });
        const strategistCritique = strategistResult.text;

        if (strategistResult.usageMetadata) {
            logApiUsage("/api/director/plan (Strategist)", strategistResult.usageMetadata.promptTokenCount || 0, strategistResult.usageMetadata.candidatesTokenCount || 0);
        }

        // Phase 3: The Visualist Finalizes and Generates Prompts (Structured Output)
        const visualistPrompt = `
            You are "The Visualist". Your job is to take the Director's draft and the Strategist's critique and finalize a 
            structured Shot Matrix. You must also generate technical prompts for "Gemini Nano Banana" (Image Generation) 
            and "Grok" (Animation/Video motion).

            DIRECTOR DRAFT: ${directorDraft}
            STRATEGIST CRITIQUE: ${strategistCritique}

            Output a JSON array of shots. Each shot must include:
            - timestamp (e.g. "0:00 - 0:03")
            - visualDescription
            - bananaPrompt (Highly detailed descriptive prompt for image gen)
            - grokTrigger (Movement/animation instructions)
            - directorNote (Summary of narrative intent)
            - strategistNote (Summary of why this shot keeps people watching)
        `;

        const visualistResult = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: [{ role: 'user', parts: [{ text: visualistPrompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            timestamp: { type: Type.STRING },
                            visualDescription: { type: Type.STRING },
                            bananaPrompt: { type: Type.STRING },
                            grokTrigger: { type: Type.STRING },
                            directorNote: { type: Type.STRING },
                            strategistNote: { type: Type.STRING }
                        },
                        required: ["timestamp", "visualDescription", "bananaPrompt", "grokTrigger"]
                    }
                }
            }
        });

        if (visualistResult.usageMetadata) {
            logApiUsage("/api/director/plan (Visualist)", visualistResult.usageMetadata.promptTokenCount || 0, visualistResult.usageMetadata.candidatesTokenCount || 0);
        }

        const responseText = visualistResult.text;
        if (!responseText) {
            throw new Error("Visualist failed to generate structured shot matrix.");
        }
        const shots = JSON.parse(responseText);

        // Format into a Mission
        const missionId = `mission-${Date.now()}`;
        const mission = {
            id: missionId,
            conceptId: concept.id,
            title: concept.title,
            alias: alias || (mode === 'kirbai' ? 'Kirbai' : 'AELOW'),
            mode: mode,
            shots: shots.map((s: any, i: number) => ({
                id: `${missionId}-shot-${i}`,
                timestamp: s.timestamp,
                visualDescription: s.visualDescription,
                personaCritiques: {
                    director: s.directorNote,
                    strategist: s.strategistNote
                },
                bananaPrompt: s.bananaPrompt,
                grokTrigger: s.grokTrigger,
                status: "planned"
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveMissionAsync(mission as any);

        return NextResponse.json({ success: true, mission });

    } catch (e: any) {
        console.error("Director Plan Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
