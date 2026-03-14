import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { saveMissionAsync, logApiUsage, getTelemetryAsync } from "@/lib/db";

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

        const ai = new GoogleGenAI({ apiKey });

        // Phase 0: Asset Extraction (Fast Flash Step)
        const extractorPrompt = `
            You are "The Asset Scanner". Identify every Pokemon name mentioned in the following concept and lyrics.
            CONCEPT: ${concept.title} - ${concept.description || concept.body}
            LYRICS: ${lyrics}
            
            Return ONLY a JSON array of names. e.g. ["Pikachu", "Munchlax", "Trubbish", "Ditto"].
        `;
        const extractorResult = await ai.models.generateContent({
             model: "gemini-2.5-flash",
             contents: [{ role: 'user', parts: [{ text: extractorPrompt }] }],
             config: { 
                 responseMimeType: "application/json",
                 responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } 
             }
        });
        const extractedCameos = JSON.parse(extractorResult.text || "[]");
        const allCameos = Array.from(new Set([...(cameos || []), ...extractedCameos]));

        // Phase 1: The Director Drafts the Vision
        let directorPrompt = `
            You are "The Director", a specialist in narrative music videos for Kirbai OS.
            CONCEPT: ${concept.title} - ${concept.description || concept.body}
            LYRICS: ${lyrics}
            MODE: ${mode}
            CAMEOS: ${allCameos.join(", ") || "None"}

            Your goal is to draft a cinematic shot list. Each shot must have a timestamp and a clear visual description.
            Focus on camera angles (Wide, Medium, Close-up), lighting, and character emotion.
            Ensure the narrative is clear even without the lyrics.
        `;

        // If references exist, provide them to the Director
        const directorParts: any[] = [{ text: directorPrompt }];
        if (references && references.length > 0) {
            references.forEach((ref: string, i: number) => {
                const base64Data = ref.split(',')[1] || ref;
                directorParts.push({
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Data
                    }
                });
            });
            directorPrompt += "\nNote: I have provided reference images for the Art Style and Character Poses. Please ensure the vision matches these exactly.";
            // Update the text part in directorParts since we appended to directorPrompt
            directorParts[0].text = directorPrompt;
        }

        const directorResult = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: [{ role: 'user', parts: directorParts }]
        });
        const directorDraft = directorResult.text;
        
        if (directorResult.usageMetadata) {
            await logApiUsage("/api/director/plan (Director)", directorResult.usageMetadata.promptTokenCount || 0, directorResult.usageMetadata.candidatesTokenCount || 0);
        }

        // Phase 2 & 3: Parallel Critiques (Strategist & Audience Critic)
        // Switch to Flash for subsidiary reviews to save time/cost
        const [strategistResult, audienceResult] = await Promise.all([
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: 'user', parts: [{ text: `
                    You are "The Retention Strategist". You specialize in TikTok/Reels and high-engagement social content.
                    The Director has proposed this plan:
                    ${directorDraft}

                    Critique this plan for SOCIAL SUCCESS. Focus on:
                    1. The Hook: Is the first 3 seconds visually arresting?
                    2. Pacing: Are there enough pattern interrupts? Look for a "Build vs. Payoff" rhythm.
                    3. Clarity: Will a scrolling user understand the stakes immediately?

                    Suggest specific improvements.
                ` }] }]
            }),
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: 'user', parts: [{ text: `
                    You are "The Audience Critic", representing the core niche: Pokemon fans, Drag Race enthusiasts, and high-fashion/camp enjoyers.
                    DIRECTOR DRAFT: ${directorDraft}

                    Evaluate if this mission hits the "Cunt/Slay" aesthetic. Focus on:
                    1. Niche Appeal: Does this feel like a Pokémon x Drag Race crossover?
                    2. Narrative Clarity: Since there is no dialogue, is the story too confusing?
                    3. Emotional Climax: Is there a genuine "SLAY" moment?

                    Provide a blunt, aesthetic-focused critique.
                ` }] }]
            })
        ]);

        const strategistCritique = strategistResult.text;
        const audienceCritique = audienceResult.text;

        if (strategistResult.usageMetadata) await logApiUsage("/api/director/plan (Strategist)", strategistResult.usageMetadata.promptTokenCount || 0, strategistResult.usageMetadata.candidatesTokenCount || 0);
        if (audienceResult.usageMetadata) await logApiUsage("/api/director/plan (Audience)", audienceResult.usageMetadata.promptTokenCount || 0, audienceResult.usageMetadata.candidatesTokenCount || 0);

        // Phase 4: The Director's Revised "Final Cut"
        const refinementPrompt = `
            You are "The Director". You have received feedback from your Strategist and your Audience Critic.
            ORIGINAL VISION: ${directorDraft}
            SOCIAL CRITIQUE: ${strategistCritique}
            AUDIENCE CRITIQUE: ${audienceCritique}

            Produce your REVISED FINAL CUT. Resolve the narrative confusion flagged by the Audience, 
            and implement the pacing/hooks requested by the Strategist. 
            Ensure the "Build vs Payoff" is balanced.
        `;

        const refinedResult = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: [{ role: 'user', parts: [{ text: refinementPrompt }] }]
        });
        const finalCut = refinedResult.text;

        if (refinedResult.usageMetadata) {
            await logApiUsage("/api/director/plan (Refinement)", refinedResult.usageMetadata.promptTokenCount || 0, refinedResult.usageMetadata.candidatesTokenCount || 0);
        }

        // Pre-process lyrics to determine expected shot count
        const lyricLines = lyrics.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        const expectedShotCount = lyricLines.length;
        const totalSec = parseInt(targetRuntime || "60");
        const secPerShot = totalSec / expectedShotCount;
        // Phase 5: The Visualist Finalizes and Generates Prompts (Structured Output)
        const visualistPrompt = `
            You are "The Visualist". Take the Director's FINAL CUT and produce a structured Shot Matrix.
            
            FINAL CUT: ${finalCut}
            LYRICS: ${lyricLines.join('\n')}
            TARGET RUNTIME: ${totalSec} seconds
            EXPECTED SHOT COUNT: ${expectedShotCount}
            CAMEOS: ${allCameos.join(", ")}
            
            RULES:
            1. MANDATORY 1:1 MAPPING: You MUST generate EXACTLY ${expectedShotCount} shots.
            2. Each shot MUST correspond to exactly one line of the LYRICS in order.
            3. TIMESTAMPS: Distribute them evenly over ${totalSec}s.
            4. CATEGORIZED SOURCE MATERIAL: Identify exactly what source material photos are needed.
               - Categories: "Character", "Location", "Object".
               - CHARACTER RULE: Outfits, alternate looks, or specific poses for a character MUST be categorized as "Character", NOT "Object".
               - CAMEO RULE: You MUST create a "Character" requirement for EVERY cameo listed above (${allCameos.join(", ")}).
               - SHOT COMPOSITION: Each shot should typically link to multiple references (e.g. 1 Character + 1 Location).
            5. PROMPT SYNC: The Banana prompts MUST explicitly use the labels (e.g. "Based on the [Pheromosa Character] and [90s City Location] sources...").
            6. STRICTLY STATIC: These are "Start Frames" for future animation. DO NOT include "motion blur", "speed lines", "motion trails", or "blurring past". Characters should be in a static, high-fidelity pose.
            7. SINGLE MOMENT IN TIME: Strictly forbid video editing/transition terminology (e.g. "match cut", "transitioning from", "fades to", "cut to", "split screen"). The prompt must describe a SINGLE, frozen, high-fidelity moment.
            8. LENS & LIGHTING: Specify cinematic lighting and lens details (e.g. "35mm lens, rim lighting") to ensure premium quality.

            AGENT NOTES:
            - Incorporate feedback from Director/Strategist/Audience into the visualDescription.
            - Provide brief feedback summaries for each shot.

            RULES FOR PROMPTS:
            - bananaPromptV2: High-fidelity (9:16). EXPLICITLY reference multiple asset labels in brackets.
            - grokPromptV2: Movement instructions for Grok/Sora. MUST start with "models stay consistent and do not morph. no music, only sound effects. ". Use physical descriptions instead of emotions. No morphing.
            - syncedLyrics: The EXACT lyric line.

            Return a JSON object containing:
            1. requiredReferences: Array of { label: string, description: string, category: "Character" | "Location" | "Object" }.
            2. shots: Array of shot objects with "refLabels" array.
        `;

        const visualistResult = await ai.models.generateContent({
            model: "gemini-2.5-flash",
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
            await logApiUsage("/api/director/plan (Visualist)", visualistResult.usageMetadata.promptTokenCount || 0, visualistResult.usageMetadata.candidatesTokenCount || 0);
        }

        const responseData = JSON.parse(visualistResult.text || "{}");
        const shots = responseData.shots || [];
        const requiredReferences = responseData.requiredReferences || [];

        // Format into a Mission
        const missionId = `mission-${Date.now()}`;
        const mission = {
            id: missionId,
            conceptId: concept.id,
            title: concept.title,
            conceptDescription: concept.description || concept.body, // Use description or body
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
                    director: s.directorNote,
                    strategist: s.strategistNote,
                    audience: s.audienceNote
                },
                bananaPromptV2: s.bananaPromptV2,
                grokPromptV2: s.grokPromptV2,
                refLabels: s.refLabels,
                status: "planned"
            })),
            targetRuntime: targetRuntime || "60",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveMissionAsync(mission as any);
        const telemetry = await getTelemetryAsync();
        return NextResponse.json({ success: true, mission, telemetry });

    } catch (e: any) {
        console.error("Director Plan Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
