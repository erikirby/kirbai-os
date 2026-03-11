import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { logApiUsage } from '@/lib/db';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API Key missing in environment." }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { url } = body;

        console.log(`[Master Sheet] Intercepted Link: ${url}`);

        if (!url || !url.includes("docs.google.com/spreadsheets/d/")) {
            return NextResponse.json({ error: "Invalid Google Sheets URL provided." }, { status: 400 });
        }

        // 1. Convert the public View URL into a direct CSV Export URL
        const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const gidMatch = url.match(/[#&]gid=([0-9]+)/);

        if (!idMatch) {
            return NextResponse.json({ error: "Could not extract Sheet ID from URL." }, { status: 400 });
        }

        const sheetId = idMatch[1];
        const gid = gidMatch ? gidMatch[1] : "0";

        const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        console.log(`[Master Sheet] Fetching raw CSV from: ${csvExportUrl}`);

        // 2. Fetch the CSV string
        const sheetRes = await fetch(csvExportUrl);

        if (!sheetRes.ok) {
            console.error("[Master Sheet] Failed to download CSV. Status:", sheetRes.status);
            return NextResponse.json({ error: "Failed to read Google Sheet. Is it set to 'Anyone with the link can view'?" }, { status: 403 });
        }

        const csvText = await sheetRes.text();

        // 3. Send to Gemini for schema synthesis with a much more precise prompt
        const prompt = `
You are a precise data-extraction agent for a music project management database called The Vault.
The user has provided a raw CSV export from their Google Sheets Master Plan.

CSV DATA:
---
${csvText}
---

CRITICAL INSTRUCTIONS (follow these exactly, in order):

STEP 1 — FIND THE NUMBERED TRACKLIST:
Look for rows that have a NUMBER in the first column (like 1, 2, 3, 4...). These numbered rows represent the official track listing. The second column in those numbered rows contains the TRACK TITLE. Extract EVERY row that starts with a number as a track. Do not skip any.

STEP 2 — IDENTIFY THE PROJECT TITLE:
The project title is likely the name of the album/EP found in the sheet title area, header rows, or implied by the project name. It may not be spelled out — use context clues from the sheet.

STEP 3 — EXTRACT THE VIBE:
Look for a column or section describing the "Sound Profile", "Vibe", or "Genre" for the overall project. Summarize it in a short phrase.

STEP 4 — SYNTHESIZE THE LORE:
Look for any narrative descriptions, character descriptions, hidden truths ("Dark Truth", "The Truth", etc.), or story sections. Synthesize these into ONE compelling 2-3 sentence lore paragraph that captures the emotional core of the project.

STEP 5 — OUTPUT ONLY PURE JSON:
Return ONLY a raw JSON object. Zero markdown. Zero extra text. Zero explanation.

Required JSON schema:
{
    "title": "string — the project/album name",
    "visualVibe": "string — short vibe/sound description",
    "lore": "string — 2-3 sentence narrative synthesis",
    "tracklist": ["array", "of", "every", "track", "title", "from", "numbered rows"]
}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        if (response.usageMetadata) {
            logApiUsage("/api/ingest-sheet", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }

        // Robustly strip any markdown wrapping
        let textResponse = typeof (response as any).text === 'function' ? (response as any).text() : response.text;
        if (!textResponse) textResponse = "";
        textResponse = textResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

        const parsedContext = JSON.parse(textResponse);

        console.log(`[Master Sheet] Successfully synthesized: "${parsedContext.title}" — ${parsedContext.tracklist?.length} tracks`);

        return NextResponse.json({ success: true, data: parsedContext });

    } catch (e: any) {
        console.error("[Master Sheet] Auto-Ingestion Error:", e);
        return NextResponse.json({ error: "Failed to parse Master Sheet: " + e.message }, { status: 500 });
    }
}
