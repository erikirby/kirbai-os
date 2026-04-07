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
            You are a tactical data scientist for an elite music brand.
            Your goal is to extract deep patterns from messy TikTok CSV exports to inform content strategy.
            You have been provided with multiple CSV files exported from TikTok.

            USER GOAL: 
            1. Total Metrics: Synthesize total Reach (Views), Followers, Likes, and Shares across the dataset. Use the most accurate macro file (like Overview or FollowerHistory) for totals.
            2. Strategic Sweet Spots:
               - Detect 'Top 3 Windows': Identify the 3 specific Day/Time combinations that correlate with highest engagement or active followers (from FollowerActivity).
               - Detect 'Top 3 Magnets': The 3 posts with highest follows-per-1k-views (use Content.csv and triangulate). 
               - Detect 'Top 3 Anchors': The 3 posts with most interactions (likes+comments+shares) per 1k views.
               - Stylistic DNA: Identify common keywords, video length ranges, emojis, or tones across high-performing videos.
            3. Demographics: Extract the Top Gender variation and Top 3 Territories.
            4. Style Mapping: Create a list of all unique descriptions/titles.

            Return exactly a JSON object:
            {
                "totals": { "reach": number, "followers": number, "likes": number, "shares": number },
                "trends": { 
                    "optimalLengthRange": string, 
                    "topWindows": Array<{ "time": string, "reach": number }>, 
                    "topKeywords": string[], 
                    "topMagnets": Array<{ "text": string, "rate": number }>, // Follows per 1k views
                    "topAnchors": Array<{ "text": string, "rate": number }>  // Interactions per 1k views
                },
                "demographics": {
                    "topGender": string,
                    "topTerritories": string[]
                },
                "descriptions": string[],
                "narrative": string (2-sentence tactical recommendation)
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
