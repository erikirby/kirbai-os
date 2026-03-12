import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getRow, getMissionsAsync, getRoadmapAsync, getUserPsycheAsync, MuseCard, UserPsyche, getPulseStateAsync } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { mode = 'kirbai' } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // 1. Gather Context
        const [lore, missions, roadmap, psyche, pulse] = await Promise.all([
            getRow(mode === 'factory' ? 'lore_factory' : 'lore_kirbai'),
            getMissionsAsync(mode),
            getRoadmapAsync(mode),
            getUserPsycheAsync(),
            getPulseStateAsync(mode)
        ]);

        const contextSummary = `
            LORE: ${JSON.stringify(lore?.nodes?.slice(0, 10) || "Empty")}
            RECENT MISSIONS: ${JSON.stringify(missions?.slice(0, 3) || "None")}
            CURRENT ROADMAP: ${JSON.stringify(roadmap?.phases?.find((p: any) => p.status === 'Current Objective') || "None")}
            USER PSYCHE: ${JSON.stringify(psyche || "No memory yet")}
            ANALYTICS: ${JSON.stringify(pulse?.summary || "No data")}
        `;

        // 2. Define the Symposium Prompt
        const symposiumPrompt = `
            You are a board of 5 specialized agents advising Erik on his project 'Kirbai OS'.
            Your goal is to debate and produce 3 actionable 'Proposal Cards' for today.

            THE AGENTS:
            1. THE LOREKEEPER: Obsessed with Pokemon narrative, character soul, and world-building. Hates generic content.
            2. THE EFFICIENCY EXPERT: Wants Erik to do 10% of the work for 100% of the result. Pushes for automation and AI-driven workflows.
            3. THE STRATEGIST/SCOUT: Monitors competitors and trends. Knows why other AI Creators are winning.
            4. THE MONETIZER: Only cares about the bottom line. DistroKid, YouTube AdRev, and scaling the business.
            5. THE ADVOCATE: Erik's emotional anchor. Knows his anxiety, his motivation dips, and his wins. Ensures the other agents don't burn him out.

            DEBATE TOPICS:
            - Content ideas for IG/TikTok.
            - Workflow improvements for Kirbai OS.
            - Monetization strategies.
            - Competitive pivots.
            - Mental health/Motivation check-ins.

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
                }
            }
        `;

        const model = ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ role: 'user', parts: [{ text: `CONTEXT:\n${contextSummary}\n\nTask: Generate the Daily Symposium Presentation.` }] }],
            config: {
                systemInstruction: symposiumPrompt,
                temperature: 0.8,
                responseMimeType: 'application/json'
            }
        });

        const responseText = (await model).text || "";
        const parsed = JSON.parse(responseText);

        // Store the cards (pending status)
        const cards: MuseCard[] = parsed.cards.map((c: any) => ({
            ...c,
            id: crypto.randomUUID(),
            status: 'pending',
            createdAt: new Date().toISOString()
        }));

        // In a real scenario, we might merge the psyche update here
        
        return NextResponse.json({ cards });

    } catch (error: any) {
        console.error('Muse Generation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
