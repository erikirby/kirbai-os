import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { logApiUsage } from '@/lib/db';

// Initialize the Gemini client using the existing key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API Key missing in environment." }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { projectId, tracklist, rawText } = body;

        console.log(`[Batch Lyrics] Incoming payload for project: ${projectId}`);
        console.log(`[Batch Lyrics] Tracks provided: ${tracklist.join(', ')}`);

        if (!tracklist || tracklist.length === 0) {
            return NextResponse.json({ error: "No tracklist provided." }, { status: 400 });
        }

        if (!rawText || rawText.trim() === '') {
            return NextResponse.json({ error: "No raw lyrics text provided." }, { status: 400 });
        }

        const prompt = `
You are an intelligent data-ingestion agent for a music database.
You are given a massive wall of raw text that contains lyrics for multiple songs.
You are also given the official tracklist for this album/project.

3. Your primary objective: The user is relying on YOU to decode, organize, and recreate these lyric files into a beautifully formatted, consistent state.
4. How to match: The user almost always includes the song name inside the actual lyrics themselves (e.g. in the chorus). Look for track titles within the text blocks to identify which lyrics belong where.
5. Formatting Rules: 
   - Clean up the lyrics. Create consistent, clean stanza breaks (use \n for line breaks).
   - Remove messy artifacts, leftover copy-paste fluff, or unnecessary timestamps.
   - When the user views the result, it should look like a professionally formatted lyric sheet.
   
CRITICAL: 
Look for strong matches between the provided tracklist and keywords found in the text. Even if a header isn't at the top, if the word is repeated in the paragraph, that whole paragraph belongs to that track.

OFFICIAL TRACKLIST:
${tracklist.map((t: string) => `- ${t}`).join('\n')}

RAW LYRICS TEXT:
---
${rawText}
---
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            trackName: { type: Type.STRING, description: "The exact name of the track from the official tracklist." },
                            content: { type: Type.STRING, description: "The parsed, decoded, and cleanly formatted lyrics for this track." }
                        },
                        required: ["trackName", "content"]
                    }
                }
            }
        });

        if (response.usageMetadata) {
            logApiUsage("/api/batch-lyrics", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }

        // Bypass strict typing to handle both SDK version returns
        let textResponse = typeof (response as any).text === 'function' ? (response as any).text() : response.text;

        if (!textResponse) textResponse = "";

        if (!textResponse) {
            throw new Error("Empty response from AI");
        }

        let parsedContexts = [];
        try {
            // Because we are using responseSchema + application/json, 
            // the response text is guaranteed to be a structurally valid JSON array.
            textResponse = textResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            parsedContexts = JSON.parse(textResponse);
            console.log("[Batch Lyrics] Structured generation mapping successful.");
        } catch (initialError) {
            console.error("[Batch Lyrics] FATAL JSON Parse Error on string:", textResponse);
            throw new Error("AI returned unreadable formatting. Please try ingesting a smaller chunk of lyrics.");
        }

        // Map the parsed data back to the local database Lyric schema so the frontend can just save it
        const newLyrics = parsedContexts.map((item: any) => ({
            id: crypto.randomUUID(),
            projectId,
            trackName: item.trackName || "Unknown Track",
            content: item.content || "",
            updatedAt: Date.now()
        }));

        console.log(`[Batch Lyrics] Successfully parsed ${newLyrics.length} distinct track lyric files.`);

        return NextResponse.json({ success: true, data: newLyrics });

    } catch (e: any) {
        console.error("[Batch Lyrics] AI Ingestion Error:", e);
        return NextResponse.json({ error: "Failed to parse and route the batch upload: " + e.message }, { status: 500 });
    }
}
