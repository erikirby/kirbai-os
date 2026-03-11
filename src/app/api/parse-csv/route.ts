import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { logApiUsage } from "@/lib/db";
import fs from 'fs';
import path from 'path';

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
            model: "gemini-1.5-flash",
            contents: `Parse this raw ${platform} CSV:\n\n${csvText}`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
            }
        });

        if (response.usageMetadata) {
            logApiUsage("/api/parse-csv", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }

        if (!response.text) {
            console.error("Gemini Response Empty:", response);
            throw new Error("No response from Gemini");
        }

        const parsed = JSON.parse(response.text);

        // --- Persistent Style Persistence ---
        if (platform === 'instagram' && parsed.descriptions) {
            const stylePath = path.join(process.cwd(), 'data', 'vault', 'analytics', 'style_base.json');
            let existingStyle: string[] = [];
            if (fs.existsSync(stylePath)) {
                try {
                    existingStyle = JSON.parse(fs.readFileSync(stylePath, 'utf-8'));
                } catch (e) {
                    existingStyle = [];
                }
            }
            // Merge unique descriptions
            const newDescriptions = [...new Set([...existingStyle, ...parsed.descriptions])];
            fs.writeFileSync(stylePath, JSON.stringify(newDescriptions, null, 2));
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
