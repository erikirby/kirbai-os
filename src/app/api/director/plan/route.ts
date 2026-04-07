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
        
        // --- PHASE 1: ATTEMPT FULL MULTI-AGENT PLANNING ---
        let shots = [];
        let requiredReferences = [];
        let allCameos = cameos || [];
        let isFallback = false;

        try {
            // Step 0: Asset Extraction
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
            allCameos = Array.from(new Set([...allCameos, ...extractedCameos]));

            // Step 1: Sequential Planning (Combined for Speed)
            const masterPrompt = `
                You are "The Director". Take this brainstorm and lyrics and produce a final shot list.
                CONCEPT: ${concept.title} - ${brainstormContent}
                LYRICS: ${lyricLines.join('\n')}
                CAMEOS: ${allCameos.join(", ")}
                
                Produce exactly ${expectedShotCount} shots. Each shot must map to one lyric line.
                Return a JSON object: { requiredReferences: [], shots: [] }
                Shots must have: timestamp, visualDescription, bananaPromptV2, grokPromptV2, syncedLyrics, refLabels.
            `;

            const masterResult = await safeCallGemini("gemini-2.5-flash", {
                contents: [{ role: 'user', parts: [{ text: masterPrompt }] }],
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
                                        refLabels: { type: Type.ARRAY, items: { type: Type.STRING } }
                                    },
                                    required: ["timestamp", "visualDescription", "bananaPromptV2", "grokPromptV2", "syncedLyrics", "refLabels"]
                                }
                            }
                        },
                        required: ["shots", "requiredReferences"]
                    }
                }
            });

            const responseData = JSON.parse(masterResult.text || "{}");
            shots = responseData.shots || [];
            requiredReferences = responseData.requiredReferences || [];
            
            if (masterResult.usageMetadata) await logApiUsageAsync("/api/director/plan (Master)", masterResult.usageMetadata.promptTokenCount || 0, masterResult.usageMetadata.candidatesTokenCount || 0);

        } catch (planningError) {
            console.error("Full Planning Failed, Falling back to Draft Mode:", planningError);
            isFallback = true;
            // --- FALLBACK: DETERMINISTIC DRAFT ---
            // Just map the lyrics to basic shots based on description
            shots = lyricLines.map((line: string, i: number) => ({
                timestamp: `${Math.round((i * (totalSec / expectedShotCount)) * 10) / 10}s`,
                visualDescription: `Automatic Draft: ${line} - Based on ${concept.title}`,
                bananaPromptV2: `A cinematic scene for ${concept.title}. ${line}. Based on ${brainstormContent}. Style: 90s aesthetic. [High Fidelity]`,
                grokPromptV2: `models stay consistent and do not morph. no music. ${line}`,
                syncedLyrics: line,
                refLabels: []
            }));
            requiredReferences = [
                { label: alias || "Protagonist", description: `Primary actor for ${concept.title}`, category: "Character" as const }
            ];
        }

        // --- PHASE 2: PERSISTENCE ---
        const mission = {
            id: missionId,
            conceptId: concept.id || `promoted-${Date.now()}`,
            title: concept.title || "Untitled Mission",
            conceptDescription: brainstormContent,
            alias: alias || (mode === 'kirbai' ? 'Kirbai' : 'AELOW'),
            mode: mode,
            references: references || [],
            requiredReferences: requiredReferences,
            cameos: allCameos,
            shots: shots.map((s: any, i: number) => ({
                id: `${missionId}-shot-${i}`,
                timestamp: s.timestamp,
                lyric: s.syncedLyrics,
                visualDescription: s.visualDescription,
                personaCritiques: {
                    director: s.directorNote || (isFallback ? "Draft Mode triggered (High Traffic fallback)" : ""),
                    strategist: s.strategistNote || "",
                    audience: s.audienceNote || ""
                },
                bananaPromptV2: s.bananaPromptV2,
                grokPromptV2: s.grokPromptV2,
                refLabels: s.refLabels,
                status: "planned"
            })),
            targetRuntime: totalSec.toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveMissionAsync(mission as any);
        const telemetry = await getTelemetryAsync();
        return NextResponse.json({ success: true, mission, telemetry, isFallback });

    } catch (e: any) {
        console.error("Director Plan Fatal Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
