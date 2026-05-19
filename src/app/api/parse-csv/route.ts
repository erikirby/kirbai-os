import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { logApiUsageAsync, getRow, setRow } from "@/lib/db";
import { safeCallGemini, callOpenRouter, callGroq, extractJsonFromText } from "@/lib/intel";



export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { platform, csvText } = body;

        if (!csvText) {
            return NextResponse.json({ error: "No CSV text provided" }, { status: 400 });
        }

        const systemInstruction = `
            You are a Master Tactical Strategist for an elite music brand.
            Your goal is to extract deep patterns from messy Meta Business Suite CSV exports to inform content strategy.
            
            RULES FOR FLEXIBLE INTELLIGENCE:
            1. DO NOT give up if a specific column name (like 'Reach' or 'Followers') is missing. 
            2. SCAN ALL ROWS to triangulate values. If a 'Total' row is missing, YOU MUST SUM THE COLUMNS MANUALLY.
            3. If a specific metric is completely missing, use a STRATEGIC PROXY. For example, use 'Engaged Accounts' or 'Impressions' to determine general virality.
            4. If interaction rates aren't pre-calculated, calculate them yourself (Interactions / Reach).
            
            EXTRACTION GOALS:
            - Totals: Reach, Follows, Likes, Shares.
            - The Hook (Video Length): Determine the duration range that most correlates with high performance (if video length data exists).
            - The Windows: Top 3 Day/Time segments (e.g., 'Sunday 6PM-8PM') that correlate with highest Reach.
            - The Voice: Top keywords, emojis, and tones extracted from post descriptions.
            - The Magnets: Top 3 posts with highest Follows-per-1k-Reach.
            - The Anchors: Top 3 posts with most interactions per 1k Reach.
            
            Return exactly a JSON object:
            {
                "totals": { "reach": number, "followers": number, "likes": number, "shares": number },
                "trends": { 
                    "optimalLengthRange": string, 
                    "topWindows": Array<{ "time": string, "reach": number }>, 
                    "topKeywords": string[], 
                    "topMagnets": Array<{ "text": string, "rate": number }>, 
                    "topAnchors": Array<{ "text": string, "rate": number }>
                },
                "descriptions": string[],
                "narrative": string (2-sentence direct tactical recommendation)
            }
        `;

        const userPrompt = `Parse this raw ${platform} CSV:\n\n${csvText}`;
        let text = "";
        try {
            const response = await safeCallGemini("gemini-2.5-flash", {
                contents: userPrompt,
                config: { systemInstruction: systemInstruction, responseMimeType: "application/json" }
            });
            if (response.usageMetadata) await logApiUsageAsync("/api/parse-csv", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
            text = typeof (response as any).text === 'function' ? (response as any).text() : response.text;
        } catch (geminiErr: any) {
            console.warn(`[parse-csv] Gemini failed: ${geminiErr.message?.slice(0, 60)}`);
            try {
                text = await callOpenRouter(userPrompt, systemInstruction, true);
            } catch (orErr: any) {
                console.warn(`[parse-csv] OpenRouter failed: ${orErr.message?.slice(0, 60)}`);
                text = await callGroq(userPrompt, systemInstruction, true);
            }
        }

        if (!text) {
            throw new Error("No response from AI providers");
        }

        let parsed;
        try {
            // Strip markdown if AI ignored the JSON-only instruction
            const targetJson = extractJsonFromText(text);
            parsed = JSON.parse(targetJson);
        } catch (parseErr) {
            console.error("Failed to parse Gemini JSON:", text);
            return NextResponse.json({ 
                error: "AI returned invalid format", 
                details: text.slice(0, 100) + "..." 
            }, { status: 500 });
        }

        // --- Persistent Style Persistence (Supabase) ---
        if (platform === 'instagram' && parsed.descriptions) {
            const existingStyle = await getRow('instagram_style_base') || [];
            // Merge unique descriptions
            const newDescriptions = [...new Set([...existingStyle, ...parsed.descriptions])];
            await setRow('instagram_style_base', newDescriptions);
        }

        return NextResponse.json({ 
            data: {
                followers: parsed.totals.followers,
                reach: parsed.totals.reach,
                trends: parsed.trends,
                narrative: parsed.narrative
            }, 
            success: true 
        });
    } catch (e: any) {
        console.error("AI CSV Parse Error:", e);
        return NextResponse.json({ error: "Failed to parse CSV", details: e.message }, { status: 500 });
    }
}
