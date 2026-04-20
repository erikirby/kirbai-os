import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getRow, getMissionsAsync, getRoadmapAsync, getUserPsycheAsync, MuseCard, UserPsyche, getPulseStateAsync, logApiUsageAsync } from "@/lib/db";
import { safeCallGemini, callOpenRouter, callGroq } from "@/lib/intel";
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { mode = 'kirbai', existingTitles = [] } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }
        
        // 1. Gather Context
        const [lore, missions, roadmap, psyche, pulse, liveNews, allVaultProjects] = await Promise.all([
            getRow(mode === 'factory' ? 'lore_factory' : 'lore_kirbai'),
            getMissionsAsync(mode),
            getRoadmapAsync(mode),
            getUserPsycheAsync(),
            getPulseStateAsync(mode),
            getRow('pokemon_news'),
            getRow('vault_projects')
        ]);

        const kirbaiProjects = (allVaultProjects ?? [])
            .filter((p: any) => p.alias === 'Kirbai')
            .map((p: any) => ({
                title: p.title,
                status: p.status,
                lore: p.lore ? String(p.lore).slice(0, 400) : '',
                visualVibe: p.visualVibe,
                tracklist: p.tracklist,
            }));

        const primaryProject = kirbaiProjects.find((p: any) => p.status === 'Primary') || null;

        const contextSummary = `
            CURRENT DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            CURRENT ERA (PRIMARY PROJECT — focus suggestions here): ${JSON.stringify(primaryProject || "None set")}
            LORE: ${JSON.stringify(lore?.nodes?.slice(0, 10) || "Empty")}
            ALL KIRBAI PROJECTS (Vault): ${JSON.stringify(kirbaiProjects.slice(0, 5) || "None")}
            RECENT MISSIONS: ${JSON.stringify(missions?.slice(0, 3) || "None")}
            CURRENT ROADMAP: ${JSON.stringify(roadmap?.phases?.find((p: any) => p.status === 'Current Objective') || "None")}
            USER PSYCHE: ${JSON.stringify(psyche || "No memory yet")}
            ANALYTICS: ${JSON.stringify(pulse?.summary || "No data")}
            ALREADY SUGGESTED (DO NOT REPEAT): ${JSON.stringify(existingTitles)}
            LIVE PLATFORM INTEL (NEWS): ${JSON.stringify(liveNews || "No news data")}
        `;

        // 2. Define the Symposium Prompt
        const symposiumPrompt = `
            You are a board of 5 specialized agents advising Erik on his project 'Kirbai OS'.
            Your goal is to debate and produce 3 actionable 'Proposal Cards' for today.
            
            SOOTHING DIRECTIVE: This is a stress-free, soothing sanctuary. Suggestions should be inspiring and manageable, not overwhelming. 
            Avoid high-stress "grind" culture. Focus on "soulful" progress.

            THE AGENTS:
            1. THE LOREKEEPER: Obsessed with Pokemon narrative, character soul, and world-building. Hates generic content.
            2. THE EFFICIENCY EXPERT: Wants Erik to do 10% of the work for 100% of the result. Pushes for automation and AI-driven workflows.
            3. THE STRATEGIST/SCOUT: Monitors competitors and trends. Knows why other AI Creators are winning.
            4. THE MONETIZER: Only cares about the bottom line. DistroKid, YouTube AdRev, and scaling the business.
            5. THE ADVOCATE: Erik's emotional anchor. Knows his anxiety, his motivation dips, and his wins. Ensures the other agents don't burn him out.
            6. THE MUSE (CLEFAIRY): The synthesizer. She watches the debate with starry-eyed wonder but grounded wisdom. She provides a final, comforting, yet insightful summary of why these choices matter for Erik's soul.

            STRICT RULE: Do NOT repeat any titles from the ALREADY SUGGESTED list. We need fresh, evolving inspiration every day.

            DEBATE TOPICS:
            - Content ideas for IG/TikTok rooted in the ACTIVE KIRBAI PROJECTS and LORE provided in the context. Draw from the actual characters, narratives, and visual vibes present there — not generic Pokémon references.
            - Workflow improvements for Kirbai OS (Autopilot features, better analytics parsing).
            - Monetization strategies tied to the current active projects (DistroKid, merch, content).
            - Competitive pivots based on the current era of Erik's work as shown in the context.
            - Mental health/Motivation check-ins.

            SPECIFIC INSTRUCTIONS:
            - THE LOREKEEPER: Ground every suggestion in the CURRENT ERA project and lore nodes from the context. Do not reference other vault projects unless directly relevant.
            - THE ADVOCATE: If Erik's motivation is low, PUSH for low-effort, high-reward "rest weeks" or "automation wins".
            - THE STRATEGIST: Base trend suggestions on the LIVE PLATFORM INTEL in the context, not hardcoded assumptions.
            - THE MUSE: Provide a high-level "Clefairy Comment" for the entire session.

            OUTPUT FORMAT (JSON ONLY):
            {
                "cards": [
                    {
                        "type": "content" | "workflow" | "monetization" | "competitor" | "mental_health",
                        "title": "Short punchy title",
                        "description": "The specific proposal",
                        "reason": "Justification from the Strategist/Scout or Lorekeeper",
                        "debateLog": "A summary of the 5-agent debate (who agreed, who fought, why)",
                        "actionMatrix": { "time": "low|med|high", "revenue": "low|med|high", "creativeValue": "low|med|high" }
                    }
                ],
                "psycheUpdate": {
                    "notes": ["New insight about Erik based on this session"],
                    "motivationLevel": number
                },
                "clefairyComment": "A 1-2 sentence soulful synthesis from The Muse",
                "clefairyEmotion": "idle" | "thinking" | "happy" | "starry-eyed" | "worried" | "surprised"
            }
        `;

        const musePrompt = `CONTEXT:\n${contextSummary}\n\nTask: Generate the Daily Symposium Presentation.`;
        let responseText = "";

        // Primary: OpenRouter free tier (no quota drain on Gemini)
        try {
            console.log('[Muse] Trying OpenRouter...');
            responseText = await callOpenRouter(musePrompt, symposiumPrompt, true);
        } catch (orErr: any) {
            console.warn(`[Muse] OpenRouter failed: ${orErr.message?.slice(0, 80)}`);
            let resolved = false;

            // Second: Groq free tier
            try {
                console.log('[Muse] Trying Groq...');
                responseText = await callGroq(musePrompt, symposiumPrompt, true);
                resolved = true;
            } catch (groqErr: any) {
                console.warn(`[Muse] Groq failed: ${groqErr.message?.slice(0, 80)}`);
            }

            // Third: Gemini models in sequence, fail fast
            if (!resolved) {
                const geminiModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'] as const;
                let geminiResponse: any = null;
                for (const model of geminiModels) {
                    try {
                        console.warn(`[Muse] Trying Gemini fallback: ${model}`);
                        geminiResponse = await safeCallGemini(model, {
                            contents: [{ role: 'user', parts: [{ text: musePrompt }] }],
                            config: { systemInstruction: symposiumPrompt, temperature: 0.8, responseMimeType: 'application/json' }
                        }, 0);
                        break;
                    } catch (e: any) {
                        console.warn(`[Muse] ${model} failed: ${e.message?.slice(0, 60)}`);
                    }
                }
                if (!geminiResponse) throw orErr; // All models exhausted
                if (geminiResponse.usageMetadata) {
                    await logApiUsageAsync("/api/muse/generate", geminiResponse.usageMetadata.promptTokenCount || 0, geminiResponse.usageMetadata.candidatesTokenCount || 0);
                }
                responseText = geminiResponse.text || "";
            }
        }

        const parsed = JSON.parse(responseText);
        if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
            throw new Error("AI response missing cards array");
        }

        // Store the cards (pending status)
        const cards: MuseCard[] = parsed.cards.map((c: any) => ({
            ...c,
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `muse_${Date.now()}_${Math.random()}`,
            status: 'pending',
            createdAt: new Date().toISOString()
        }));

        // In a real scenario, we might merge the psyche update here
        
        return NextResponse.json({ 
            cards, 
            clefairyComment: parsed.clefairyComment,
            clefairyEmotion: parsed.clefairyEmotion 
        });

    } catch (error: any) {
        console.error('Muse Generation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
