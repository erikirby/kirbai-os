import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { saveMissionAsync, logApiUsageAsync, getTelemetryAsync } from "@/lib/db";
import { safeCallGemini, extractJsonFromText } from "@/lib/intel";

export async function POST(req: NextRequest) {
    try {
        const { concept, lyrics, mode, alias, references, cameos, targetRuntime } = await req.json();

        if (!concept || !lyrics) {
            return NextResponse.json({ error: "Missing concept or lyrics" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const brainstormContent = concept.description || concept.body || "";
        const lyricLines = lyrics.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        const expectedShotCount = lyricLines.length;
        const totalSec = parseInt(targetRuntime || "60");
        const missionId = `mission-${Date.now()}`;
        
        // --- PHASE 1: DRAFT & CRITIQUE (DIRECTOR, STRATEGIST & AUDIENCE COLLABORATION) ---
        const mainPlanningPrompt = `
            You are a collaborative team consisting of:
            1. "The Director": Specialized in narrative music videos for Kirbai OS (mode: ${mode}, alias: ${alias}).
            2. "The Retention Strategist": Specialized in TikTok/Reels high-engagement pacing, hooks, and social trends.
            3. "The Audience Critic": Representing Pokemon fans and the camp/slay/drag aesthetic.
            
            We are planning a narrative music video based on:
            CONCEPT: ${concept.title} - ${brainstormContent}
            LYRICS: ${lyrics}
            MODE: ${mode}

            Provide a collaborative final script, shot plan draft, and critiques.
            Also, identify all Pokemon name cameos mentioned in the concept or lyrics.
            
            Return a JSON object with this exact structure:
            {
              "cameos": ["List of Pokemon names found in the concept/lyrics"],
              "directorDraft": "Detailed cinematic shot-by-shot draft of the video, describing visual flow and character emotion.",
              "strategistCritique": "Retention and engagement notes for the plan.",
              "audienceCritique": "Blunt critique on how to maximize the camp and fan appeal."
            }
        `;

        const directorParts: any[] = [{ text: mainPlanningPrompt }];
        if (references && references.length > 0) {
            references.forEach((ref: string) => {
                const base64Data = ref.split(',')[1] || ref;
                directorParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
            });
            const updatedPrompt = mainPlanningPrompt + "\nNote: Reference images for the Art Style and Character Poses are provided. Ensure the vision matches these exactly.";
            directorParts[0].text = updatedPrompt;
        }

        const mainPlanningResult = await safeCallGemini("gemini-2.5-flash", { 
            contents: [{ role: 'user', parts: directorParts }],
            config: { 
                responseMimeType: "application/json",
                responseSchema: { 
                    type: Type.OBJECT, 
                    properties: {
                        cameos: { type: Type.ARRAY, items: { type: Type.STRING } },
                        directorDraft: { type: Type.STRING },
                        strategistCritique: { type: Type.STRING },
                        audienceCritique: { type: Type.STRING }
                    },
                    required: ["cameos", "directorDraft", "strategistCritique", "audienceCritique"]
                } 
            }
        });

        if (mainPlanningResult.usageMetadata) {
            await logApiUsageAsync("/api/director/plan (Planning)", mainPlanningResult.usageMetadata.promptTokenCount || 0, mainPlanningResult.usageMetadata.candidatesTokenCount || 0);
        }

        const parsedPlanning = JSON.parse(extractJsonFromText(mainPlanningResult.text || "{}"));
        const extractedCameos = parsedPlanning.cameos || [];
        const allCameos = Array.from(new Set([...(cameos || []), ...extractedCameos]));
        const directorDraft = parsedPlanning.directorDraft || "";
        const strategistCritique = parsedPlanning.strategistCritique || "";
        const audienceCritique = parsedPlanning.audienceCritique || "";

        // --- PHASE 2: THE VISUALIST (SHOT MATRIX) ---
        const visualistPrompt = `
            You are "The Visualist". Take the Director's FINAL CUT and critiques, and produce a structured Shot Matrix.
            FINAL CUT: ${directorDraft}
            SOCIAL CRITIQUE: ${strategistCritique}
            AUDIENCE CRITIQUE: ${audienceCritique}
            LYRICS: ${lyricLines.join('\n')}
            TARGET RUNTIME: ${totalSec} seconds
            EXPECTED SHOT COUNT: ${expectedShotCount}
            CAMEOS: ${allCameos.join(", ")}
            
            RULES:
            1. MANDATORY: EXACTLY ${expectedShotCount} shots.
            2. Each shot MUST map to exactly one lyric line from the provided lyrics.
            3. CATEGORIZED SOURCES: Identify needed "Character", "Location", "Object" refs. Character rule: any outfit/pose is a "Character" ref.
            4. CAMEO RULE: MUST create a Character requirement for every cameo: [${allCameos.join(", ")}].
            5. PROMPTS: bananaPromptV2 for 9:16 high-fidelity images. grokPromptV2 for movement. 
            6. NOTES: Populate directorNote, strategistNote, and audienceNote for each shot based on the final cut and critiques.

            Return a JSON object: { requiredReferences: [], shots: [] }
        `;

        const visualistResult = await safeCallGemini("gemini-2.5-flash", {
            contents: [{ role: 'user', parts: [{ text: visualistPrompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        requiredReferences: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    category: { type: Type.STRING, enum: ["Character", "Location", "Object"] }
                                },
                                required: ["label", "description", "category"]
                            }
                        },
                        shots: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    timestamp: { type: Type.STRING },
                                    visualDescription: { type: Type.STRING },
                                    bananaPromptV2: { type: Type.STRING },
                                    grokPromptV2: { type: Type.STRING },
                                    syncedLyrics: { type: Type.STRING },
                                    refLabels: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    directorNote: { type: Type.STRING },
                                    strategistNote: { type: Type.STRING },
                                    audienceNote: { type: Type.STRING }
                                },
                                required: ["timestamp", "visualDescription", "bananaPromptV2", "grokPromptV2", "syncedLyrics", "refLabels"]
                            }
                        }
                    },
                    required: ["shots", "requiredReferences"]
                }
            }
        });

        if (visualistResult.usageMetadata) {
            await logApiUsageAsync("/api/director/plan (Visualist)", visualistResult.usageMetadata.promptTokenCount || 0, visualistResult.usageMetadata.candidatesTokenCount || 0);
        }

        const rawText = visualistResult.text || "{}";
        let responseData: any = { shots: [], requiredReferences: [] };
        try {
            responseData = JSON.parse(extractJsonFromText(rawText));
        } catch (e) {
            console.error("Visualist Parse Error:", e);
        }
        
        const shotsData = Array.isArray(responseData.shots) ? responseData.shots : [];
        const requiredReferencesData = Array.isArray(responseData.requiredReferences) ? responseData.requiredReferences : [];

        // --- PHASE 6: PERSISTENCE ---
        const mission = {
            id: missionId,
            conceptId: concept.id || `promoted-${Date.now()}`,
            title: concept.title || "Untitled Mission",
            conceptDescription: brainstormContent,
            alias: alias || (mode === 'kirbai' ? 'Kirbai' : 'AELOW'),
            mode: mode,
            references: references || [],
            requiredReferences: requiredReferencesData,
            cameos: allCameos,
            shots: shotsData.map((s: any, i: number) => ({
                id: `${missionId}-shot-${i}`,
                timestamp: s?.timestamp || `${i * 5}s`,
                lyric: s?.syncedLyrics || "",
                visualDescription: s?.visualDescription || "A clear visual path.",
                personaCritiques: {
                    director: s?.directorNote || "",
                    strategist: s?.strategistNote || "",
                    audience: s?.audienceNote || ""
                },
                bananaPromptV2: s?.bananaPromptV2 || "",
                grokPromptV2: s?.grokPromptV2 || "",
                refLabels: s?.refLabels || [],
                status: "planned"
            })),
            targetRuntime: totalSec.toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveMissionAsync(mission as any);
        const telemetry = await getTelemetryAsync();
        return NextResponse.json({ success: true, mission, telemetry });

    } catch (e: any) {
        console.error("Director Plan Fatal Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
