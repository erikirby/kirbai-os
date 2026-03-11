import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    const tracklist = ["Wild Battle", "Pallet Town Tears"];
    const rawText = `I'm walking through the tall grass, hoping you'll appear.
A wild battle starts but I only see my fear.

(Wait, this belongs to the Pallet Town song)
Tears falling on the Gameboy screen,
washing away the places we've been.`;

    const prompt = `
You are an intelligent data-ingestion agent for a music database.
You are given a massive wall of raw text that contains lyrics for multiple songs.
You are also given the official tracklist for this album/project.

Your job is to read the raw text, figure out which chunks of text belong to which track on the tracklist, and separate them.
The user might have included the track title in the text, or they might just start the lyrics. Use your best judgment based on context, spacing, and obvious transitions between songs.

OFFICIAL TRACKLIST:
${tracklist.map(t => `- ${t}`).join('\n')}

RAW LYRICS TEXT:
---
${rawText}
---

INSTRUCTIONS:
1. Return ONLY a pure JSON array. No markdown blocks, no conversational text.
2. The JSON array must contain objects matching this exact structure:
   {
       "trackName": "The exact name of the track from the tracklist provided",
       "content": "The parsed out lyrics that belong to this track. Preserve original line breaks (\\n) and spacing."
   }
3. If lyrics are found that don't seem to match any track, assign them to a track name like "Unknown/Bonus Track". 
4. If a track from the tracklist has no corresponding lyrics in the text, DO NOT include it in the array.
5. The output MUST be strictly valid JSON.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        const text = response.text();
        console.log("Raw Response:", text);
        const parsed = JSON.parse(text);
        console.log("Parsed Array Length:", parsed.length);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
