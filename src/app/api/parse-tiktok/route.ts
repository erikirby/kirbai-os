import { NextResponse } from "next/server";
import { logApiUsageAsync, getRow, setRow } from "@/lib/db";
import { safeCallGemini } from "@/lib/intel";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { files } = body; // Array of { name, content }

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files provided" }, { status: 400 });
        }

        const systemInstruction = `
            You are a Master Tactical Strategist for an elite music brand.
            Your goal is to perform a deep-scan of all provided TikTok CSV exports and extract a cohesive strategy.
            
            RULES FOR FLEXIBLE INTELLIGENCE:
            1. DO NOT give up if a specific column name (like 'Reach' or 'Followers') is missing. 
            2. SCAN ALL FILES to triangulate values. If 'Follower Count' isn't in a summary, look at the last entry in 'FollowerHistory.csv'.
            3. If a specific metric is completely missing, use a STRATEGIC PROXY. For example, use 'Video Views' or 'Total Play Time' to determine 'The Hook' performance.
            4. If interaction rates aren't pre-calculated, calculate them yourself (Interactions / Views).
            
            EXTRACTION GOALS:
            - Totals: Reach (Views), Followers, Likes, Shares.
            - The Hook (Video Length): Determine the duration range that most correlates with high completion/views.
            - The Windows: Top 3 Day/Time segments for posting based on engagement or follower activity.
            - The Voice: Top keywords, emojis, and tones extracted from video descriptions.
            - The Magnets: Top 3 videos that converted the most 'Followers' (or had highest relative engagement).
            - The Anchors: Top 3 videos with the most Interaction density (Likes+Comments+Shares per view).
            - The Crowd: Top Gender and Top 3 Territories.
            
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
                "demographics": {
                    "topGender": string,
                    "topTerritories": string[]
                },
                "descriptions": string[],
                "narrative": string (2-sentence direct tactical recommendation)
            }
        `;

        // Concatenate all files into a single prompt
        const combinedContent = files.map((f: any) => `--- File: ${f.name} ---\n${f.content}\n`).join('\n');

        const response = await safeCallGemini("gemini-2.5-flash", {
            contents: `Parse these raw TikTok CSVs:\n\n${combinedContent}`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
            }
        });

        if (response.usageMetadata) {
            await logApiUsageAsync("/api/parse-tiktok", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }

        const text = typeof (response as any).text === 'function' ? (response as any).text() : response.text;

        if (!text) {
            console.error("Gemini Response Empty:", response);
            throw new Error("No response from Gemini");
        }

        let parsed;
        try {
            const targetJson = text.replace(/\`\`\`(json)?/g, '').trim();
            parsed = JSON.parse(targetJson);
        } catch (parseErr) {
            console.error("Failed to parse Gemini JSON:", text);
            return NextResponse.json({ 
                error: "AI returned invalid format", 
                details: text.slice(0, 100) + "..." 
            }, { status: 500 });
        }

        // Persistent Style Persistence
        if (parsed.descriptions && parsed.descriptions.length > 0) {
            const existingStyle = await getRow('tiktok_style_base') || [];
            const newDescriptions = [...new Set([...existingStyle, ...parsed.descriptions])];
            await setRow('tiktok_style_base', newDescriptions);
        }

        return NextResponse.json({ 
            data: {
                followers: parsed.totals.followers,
                reach: parsed.totals.reach,
                trends: parsed.trends,
                demographics: parsed.demographics,
                narrative: parsed.narrative
            }, 
            success: true 
        });
    } catch (e: any) {
        console.error("AI TikTok Parse Error:", e);
        return NextResponse.json({ error: "Failed to parse TikTok CSVs", details: e.message }, { status: 500 });
    }
}
