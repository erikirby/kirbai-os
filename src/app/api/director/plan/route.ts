import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { saveMissionAsync, logApiUsageAsync, getTelemetryAsync } from "@/lib/db";
import { safeCallGemini } from "@/lib/intel";

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
        
        // --- PHASE 0: ASSET EXTRACTION ---
        const extractorPrompt = `
            You are "The Asset Scanner". Identify every Pokemon name mentioned in the following concept and lyrics.
            CONCEPT: ${concept.title} - ${brainstormContent}
            LYRICS: ${lyrics}
            Return ONLY a JSON array of names.
        `;
        const extractorResult = await safeCallGemini("gemini-2.5-flash", { 
            contents: [{ role: 'user', parts: [{ text: extractorPrompt }] }],
            config: { 
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } 
            }
        });
        const extractedCameos = JSON.parse(extractorResult.text || "[]");
        const allCameos = Array.from(new Set([...(cameos || []), ...extractedCameos]));

        // --- PHASE 1: THE DIRECTOR DRAFTS THE VISION ---
        let directorPrompt = `
            You are "The Director", a specialist in narrative music videos for Kirbai OS.
            CONCEPT: ${concept.title} - ${brainstormContent}
            LYRICS: ${lyrics}
            MODE: ${mode}
            CAMEOS: ${allCameos.join(", ") || "None"}

            Your goal is to draft a cinematic shot list. Each shot must have a timestamp and a clear visual description.
            Focus on camera angles (Wide, Medium, Close-up), lighting, and character emotion.
            Ensure the narrative is clear even without the lyrics.
        `;
        const directorParts: any[] = [{ text: directorPrompt }];
        if (references && references.length > 0) {
            references.forEach((ref: string) => {
                const base64Data = ref.split(',')[1] || ref;
                directorParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
            });
            directorPrompt += "\nNote: I have provided reference images for the Art Style and Character Poses. Please ensure the vision matches these exactly.";
            directorParts[0].text = directorPrompt;
        }

        const directorResult = await safeCallGemini("gemini-2.5-flash", { contents: [{ role: 'user', parts: directorParts }] });
        const directorDraft = directorResult.text;
        if (directorResult.usageMetadata) await logApiUsageAsync("/api/director/plan (Director)", directorResult.usageMetadata.promptTokenCount || 0, directorResult.usageMetadata.candidatesTokenCount || 0);

        // --- PHASE 2 & 3: PARALLEL CRITIQUES (Strategist & Audience) ---
        const [strategistResult, audienceResult] = await Promise.all([
            safeCallGemini("gemini-2.5-flash", {
                contents: [{ role: 'user', parts: [{ text: `
                    You are "The Retention Strategist". You specialize in TikTok/Reels and high-engagement social content.
                    The Director has proposed this plan:
                    ${directorDraft}

                    Critique this plan for SOCIAL SUCCESS. Focus on Hooks, Pacing, and Clarity. Suggest specific improvements.
                ` }] }]
            }),
            safeCallGemini("gemini-2.5-flash", {
                contents: [{ role: 'user', parts: [{ text: `
                    You are "The Audience Critic", representing Pokemon fans and camp/drag enthusiasts.
                    DIRECTOR DRAFT: ${directorDraft}
                    Evaluate if this mission hits the "Cunt/Slay" aesthetic. Focus on Niche Appeal and Emotional Climax. Provide a blunt critique.
                ` }] }]
            })
        ]);
        const strategistCritique = strategistResult.text;
        const audienceCritique = audienceResult.text;

        // --- PHASE 4: THE REFINED "FINAL CUT" ---
        const refinementPrompt = `
            You are "The Director". Refine your vision based on feedback.
            ORIGINAL VISION: ${directorDraft}
            SOCIAL CRITIQUE: ${strategistCritique}
            AUDIENCE CRITIQUE: ${audienceCritique}
            Produce your REVISED FINAL CUT. Resolve the narrative confusion and implement the pacing requested.
        `;
        const refinedResult = await safeCallGemini("gemini-2.5-flash", { contents: [{ role: 'user', parts: [{ text: refinementPrompt }] }] });
        const finalCut = refinedResult.text;

        // --- PHASE 5: THE VISUALIST (SHOT MATRIX) ---
        const visualistPrompt = `
            You are "The Visualist". Take the Director's FINAL CUT and produce a structured Shot Matrix.
            FINAL CUT: ${finalCut}
            LYRICS: ${lyricLines.join('\n')}
            TARGET RUNTIME: ${totalSec} seconds
            EXPECTED SHOT COUNT: ${expectedShotCount}
            CAMEOS: ${allCameos.join(", ")}
            
            RULES:
            1. MANDATORY: EXACTLY ${expectedShotCount} shots.
            2. Each shot MUST map to exactly one lyric line.
            3. CATEGORIZED SOURCES: Identify needed "Character", "Location", "Object" refs. Character rule: and outfit/pose is a "Character" ref.
            4. CAMEO RULE: MUST create a Character requirement for every cameo: [${allCameos.join(", ")}].
            5. PROMPTS: bananaPromptV2 for 9:16 high-fidelity images. grokPromptV2 for movement. 

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

        const rawText = visualistResult.text || "{}";
        let responseData: any = { shots: [], requiredReferences: [] };
        try {
            responseData = JSON.parse(rawText.replace(/```json|```/g, '').trim());
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
