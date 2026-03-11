import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function test() {
    const csvPath = "/Users/erikhenry2/Desktop/Kirbai_OS/Sep-01-2025_Mar-10-2026_1229348579404961.csv";
    const csvText = fs.readFileSync(csvPath, "utf-8");

    const systemInstruction = `
        You are a tactical data scientist for an elite music brand.
        Your goal is to extract deep patterns from messy Meta Business Suite CSV exports to inform content strategy.
        
        USER GOAL: 
        1. Total Metrics: Sum Reach, Follows, Likes, and Shares across all rows.
        2. Strategic Sweet Spots:
           - Identify the specific second-range (e.g., '15-20s') that correlates with highest Reach.
           - Identify the peak Virality Window (Specific Day + Hour) from the 'Publish time' column.
           - Detect 'Follower Magnets': Which post had the highest follows-per-reach ratio? (Note the title).
           - Stylistic DNA: Identify common keywords, emojis, or tones across high-performing descriptions.
        3. Style Mapping: Create a list of all unique descriptions.

        CRITICAL: If no 'Total' row is present, YOU MUST SUM THE COLUMNS MANUALLY for every single post row provided.
        
        Return exactly a JSON object:
        {
            "totals": { "reach": number, "followers": number, "likes": number, "shares": number },
            "trends": { 
                "optimalLengthRange": string, 
                "peakPostingWindows": string, 
                "topKeywords": string[], 
                "efficiencyLeader": string 
            },
            "descriptions": string[],
            "narrative": string (2-sentence tactical recommendation)
        }
    `;

    console.log("🚀 Starting Strategic Extraction...");
    
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `Parse this raw Instagram CSV:\n\n${csvText}` }] }],
        generationConfig: {
            responseMimeType: "application/json",
        },
        systemInstruction: systemInstruction
    });

    const parsed = JSON.parse(result.response.text());
    console.log("\n✅ SUCCESS: ENGINES ONLINE");
    console.log("-----------------------------------");
    console.log("TOTAL REACH:", parsed.totals.reach.toLocaleString());
    console.log("TOTAL FOLLOWERS GAINED:", parsed.totals.followers);
    console.log("-----------------------------------");
    console.log("TRENDS DETECTED:");
    console.log("Optimal Length:", parsed.trends.optimalLengthRange);
    console.log("Virality Window:", parsed.trends.peakPostingWindows);
    console.log("Efficiency Leader:", parsed.trends.efficiencyLeader);
    console.log("Keywords:", parsed.trends.topKeywords.join(", "));
    console.log("-----------------------------------");
    console.log("ADVICE:", parsed.narrative);
    console.log("-----------------------------------");
    console.log(`STYLE MAPPING: Extracted ${parsed.descriptions.length} templates.`);
}

test();
