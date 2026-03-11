import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { logApiUsage } from "@/lib/db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { youtubeStats, tiktokStats, instagramStats } = body;

        const systemInstruction = `
            You are a ruthless, highly elite cross-platform growth hacker advising a music project.
            The user runs a high-fidelity brand (Kirbai) and two high-volume AI SEO music aliases (AELOW, KURAO).
            
            CRITICAL DIRECTIVE: Synthesize all provided metrics across YouTube, TikTok, and Instagram.
            Detect where the momentum is strongest and where it is weakest.
            
            Based on the data, output exactly:
            1. 'summary': A 1-2 sentence brutal summary of current cross-platform health.
            2. 'actionItems': An array of EXACTLY 3 specific, imperative tasks on where to shift budget, content focus, or release bandwidth this week.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: `Analyze these cross-platform stats:
            YouTube: ${JSON.stringify(youtubeStats)}
            TikTok: ${JSON.stringify(tiktokStats)}
            Instagram: ${JSON.stringify(instagramStats)}`,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        actionItems: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["summary", "actionItems"]
                }
            }
        });

        if (response.usageMetadata) {
            logApiUsage("/api/synthesize-analytics", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }

        if (!response.text) {
            throw new Error("No response from Gemini");
        }

        const parsed = JSON.parse(response.text);

        return NextResponse.json({ analysis: parsed, success: true });
    } catch (e: any) {
        console.error("Synthesis Error:", e);
        return NextResponse.json({ error: "Failed to synthesize analytics", details: e.message }, { status: 500 });
    }
}
