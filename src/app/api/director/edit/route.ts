import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { getRow, saveMissionAsync, logApiUsage } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { instruction, mission } = await req.json();

        if (!instruction || !mission) {
            return NextResponse.json({ error: "Missing instruction or mission data" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const ai = new GoogleGenAI({ apiKey });

        // Phase 1: The Director evaluates the instruction in context of the mission
        const directorPrompt = `
            You are "The Director". A user has given an instruction to modify an existing mission.
            MISSION TITLE: ${mission.title}
            MISSION DESCRIPTION: ${mission.conceptDescription || "No description"}
            CURRENT CAMEOS: ${mission.cameos ? mission.cameos.join(", ") : "None"}
            USER INSTRUCTION: "${instruction}"

            Analyze how this instruction affects the narrative and the asset list.
            If the instruction is to add cameos, identify the best Pokemon for the niche (Drag Race x Pokemon).
            If it's about the shots, describe the necessary changes.
        `;

        const directorResult = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: [{ role: 'user', parts: [{ text: directorPrompt }] }]
        });
        const directorAnalysis = directorResult.text;

        // Phase 2: Combined Critique & Visualist Mapping (Flash for speed)
        const visualistPrompt = `
            You are the "Synthesizer" (Strategist, Audience Critic, and Visualist).
            USER INSTRUCTION: "${instruction}"
            DIRECTOR'S ANALYSIS: ${directorAnalysis}
            MISSION DATA: ${JSON.stringify(mission)}

            1. Evaluate if these changes maintain narrative clarity and social media "hook" potential.
            2. Ensure the "Cunt/Slay" aesthetic is preserved.
            3. Apply the changes to the mission object. **MANDATORY: Scan the instruction and analysis for any new Pokemon names and ensure they are added to the 'cameos' array.**
            4. UPDATE VISUAL REQUIREMENTS: Maintain a list of 4-6 required reference assets in 'requiredReferences' (Array of {label, description, category: "Character" | "Location" | "Object"}).
               - CATEGORIZATION: Ensure everything is categorized correctly.
               - CAMEO SYNC: If you add or find cameos, ensure there is a "Character" requirement for each.
            5. EXPLICIT PROMPTING: For all bananaPromptV2, EXPLICITLY reference the labels in 'requiredReferences' (e.g. "Based on uploaded [Label] ref...").
               - MULTI-REF: Shots should link to multiple labels in 'refLabels' (Array of strings).
            6. Output the UPDATED MISSION object in JSON.
        `;

        const visualistResult = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: visualistPrompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mission: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                title: { type: Type.STRING },
                                conceptDescription: { type: Type.STRING },
                                alias: { type: Type.STRING },
                                mode: { type: Type.STRING },
                                cameos: { type: Type.ARRAY, items: { type: Type.STRING } },
                                references: { type: Type.ARRAY, items: { type: Type.STRING } },
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
                                            id: { type: Type.STRING },
                                            timestamp: { type: Type.STRING },
                                            lyric: { type: Type.STRING },
                                            visualDescription: { type: Type.STRING },
                                            personaCritiques: {
                                                type: Type.OBJECT,
                                                properties: {
                                                    director: { type: Type.STRING },
                                                    strategist: { type: Type.STRING },
                                                    audience: { type: Type.STRING }
                                                }
                                            },
                                            bananaPromptV2: { type: Type.STRING },
                                            grokPromptV2: { type: Type.STRING },
                                            refLabels: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            status: { type: Type.STRING }
                                        },
                                        required: ["id", "timestamp", "visualDescription", "bananaPromptV2", "grokPromptV2", "refLabels"]
                                    }
                                }
                            }
                        }
                    },
                    required: ["mission"]
                }
            }
        });

        const updatedData = JSON.parse(visualistResult.text || "{}");
        const aiMission = updatedData.mission;

        if (aiMission) {
            // GHOST PROTECTION: Fetch the FULL mission from DB to ensure we don't wipe binary references
            const dbKey = mission.mode === 'factory' ? 'missions_factory' : 'missions_kirbai';
            const missions = await getRow(dbKey) || [];
            const existingMission = missions.find((m: any) => m.id === mission.id);

            if (!existingMission) {
                // If not found, fall back to the provided mission (though this shouldn't happen)
                console.warn(`[edit] Mission ${mission.id} not found in DB. Falling back to request payload.`);
            }

            const sourceOfTruth = existingMission || mission;

            // SAFE MERGE: Preserve existing fields unless explicitly updated by AI
            const updatedMission = {
                ...sourceOfTruth,
                title: aiMission.title || sourceOfTruth.title,
                conceptDescription: aiMission.conceptDescription || sourceOfTruth.conceptDescription,
                requiredReferences: aiMission.requiredReferences || sourceOfTruth.requiredReferences,
                cameos: aiMission.cameos || sourceOfTruth.cameos,
                shots: aiMission.shots || sourceOfTruth.shots,
                updatedAt: new Date().toISOString()
            };
            
            await saveMissionAsync(updatedMission);
            return NextResponse.json({ success: true, mission: updatedMission });
        } else {
            throw new Error("Failed to parse updated mission.");
        }

    } catch (e: any) {
        console.error("Director Edit Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
