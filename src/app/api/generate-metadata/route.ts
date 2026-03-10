import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    try {
        const { keyword, alias } = await req.json();

        if (!keyword || !alias) {
            return NextResponse.json({ error: "Missing keyword or alias" }, { status: 400 });
        }

        const systemInstruction = `
            You are an elite YouTube Music SEO specialist. 
            Your goal is to generate exactly 5 highly optimized YouTube video metadata packages.
            The user will provide a 'Core Keyword' and a target 'Alias'.
            
            If ALIAS is AELOW: Target a global, English-speaking audience. Use aesthetics like Dark Synthwave, Cyberpunk, Drift, or Ominous. Emphasize "No Copyright", "Stream Safe", and target gaming/creator communities.
            If ALIAS is KURAO: Target a Japanese-focused audience. Use aesthetics like City Pop, Hyperpop, Anime OP, or Shibuya Ku. Use a mix of Romaji, Kanji, and English. Note "KURAO Official Upload".
            
            For each of the 5 variations, provide:
            1. An aggressive, highly clickable Title.
            2. A description featuring a strong hook, the target keyword, and an SEO-optimized tag block at the bottom (max 5 hashtags).
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Core Keyword: ${keyword}\nAlias: ${alias}`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    description: "An array of exactly 5 generated YouTube metadata items.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: {
                                type: Type.STRING,
                                description: "The optimized YouTube video title."
                            },
                            description: {
                                type: Type.STRING,
                                description: "The optimized description including hashtags."
                            }
                        },
                        required: ["title", "description"]
                    }
                }
            }
        });

        if (response.text) {
            const generatedData = JSON.parse(response.text);
            return NextResponse.json({ metadata: generatedData });
        }

        throw new Error("Empty response from AI");

    } catch (e: any) {
        console.error("Metadata Generation Error:", e);
        return NextResponse.json({ error: "Failed to generate metadata", details: e.message }, { status: 500 });
    }
}
