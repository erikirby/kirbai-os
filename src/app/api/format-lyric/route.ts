import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { logApiUsage } from '@/lib/db';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API Key missing in environment." }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { rawText, trackName } = body;

        if (!rawText || rawText.trim() === '') {
            return NextResponse.json({ error: "No raw lyrics text provided." }, { status: 400 });
        }

        const prompt = `
You are a master lyric formatter for a high-end music IP database.
You are receiving the raw lyrics for a track called "${trackName || 'the track'}".

Your mission is to transform these lyrics into a "Museum Grade" format suitable for long-term LLM stylistic analysis.

CRITICAL RULES:
1. Strip all generation "noise". Remove any Suno AI prompt tags like [Heavy Bass Drop], [Female Vocal], [Upbeat Pop], etc.
2. PRESERVE structural tags. If there is a structural marker, standardize it perfectly (e.g., change "[V1]" or "[verse one]" to "[Verse 1]").
3. Keep valid structural tags like [Chorus], [Bridge], [Pre-Chorus], [Outro].
4. Remove annoying RTF or HTML formatting artifacts (like \\pard, \\b, or weird font codes) if they exist.
5. Ensure perfect double-spacing between stanzas, and single-spacing between lines within a stanza.

Return ONLY the cleaned, perfectly formatted lyric string.

RAW LYRICS:
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
                    type: Type.OBJECT,
                    properties: {
                        formattedLyrics: {
                            type: Type.STRING,
                            description: "The pristine, formatted lyric sheet with all noise removed and structural tags standardized."
                        }
                    },
                    required: ["formattedLyrics"]
                }
            }
        });

        if (response.usageMetadata) {
            logApiUsage("/api/format-lyric", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }

        let textResponse = typeof (response as any).text === 'function' ? (response as any).text() : response.text;
        if (!textResponse) throw new Error("Empty response from AI");

        textResponse = textResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(textResponse);

        return NextResponse.json({ success: true, data: parsed.formattedLyrics });

    } catch (e: any) {
        console.error("[Format Lyric] Error:", e);
        return NextResponse.json({ error: "Failed to format lyrics: " + e.message }, { status: 500 });
    }
}
