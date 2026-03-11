import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { logApiUsage, getRow, setRow } from "@/lib/db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { platform, csvText } = body;

        if (!csvText) {
            return NextResponse.json({ error: "No CSV text provided" }, { status: 400 });
        }

        const systemInstruction = `
            You are a tactical data scientist for an elite music brand.
            Your goal is to extract deep patterns from messy Meta Business Suite CSV exports to inform content strategy.
            
            USER GOAL: 
            1. Total Metrics: Sum Reach, Follows, Likes, and Shares across all rows.
            2. Strategic Sweet Spots:
               - Identify the specific second-range (e.g., '15-20s') that correlates with highest Reach.
               - Detect 'The Window': Identify the general peak Virality Window (Specific Day of the Week + General Time, e.g., 'Sunday Evenings'). DO NOT return a list of dates.
               - Detect 'The Magnet': Which post had the highest follows-per-reach ratio? (Return a 40-character snippet of the 'Description' column).
               - Detect 'The Anchor': Which post had the most overall interactions (Likes + Shares + Comments)? (Return a 40-character snippet of the 'Description' column).
               - Stylistic DNA: Identify common keywords, emojis, or tones across high-performing descriptions.
            3. Style Mapping: Create a list of all unique descriptions.

            CRITICAL: If no 'Total' row is present, YOU MUST SUM THE COLUMNS MANUALLY for every single post row provided.
            IMPORTANT: For both 'followerMagnet' and 'engagementLeader', DO NOT use IDs. Use the actual text from the 'Description' column.
            
            Return exactly a JSON object:
            {
                "totals": { "reach": number, "followers": number, "likes": number, "shares": number },
                "trends": { 
                    "optimalLengthRange": string, 
                    "peakPostingWindows": string, 
                    "topKeywords": string[], 
                    "followerMagnet": string,
                    "engagementLeader": string 
                },
                "descriptions": string[],
                "narrative": string (2-sentence tactical recommendation)
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Parse this raw ${platform} CSV:\n\n${csvText}`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
            }
        });

        if (response.usageMetadata) {
            logApiUsage("/api/parse-csv", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }

        // Use robust text extraction
        const text = typeof (response as any).text === 'function' ? (response as any).text() : response.text;

        if (!text) {
            console.error("Gemini Response Empty:", response);
            throw new Error("No response from Gemini");
        }

        let parsed;
        try {
            // Strip markdown if AI ignored the JSON-only instruction
            const targetJson = text.replace(/\`\`\`(json)?/g, '').trim();
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
