import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getDb, setIntelCache, IntelItem, logApiUsage } from "@/lib/db";
import crypto from "crypto";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: "No text provided" }, { status: 400 });
        }

        const systemInstruction = `
            You are an elite music marketing analyst working for 'Kirbai OS'.
            Your job is to analyze raw email newsletters and extract ONLY the intelligence that is highly actionable or relevant to:
            1. An indie music brand focusing on high-fidelity, high-concept art (Kirbai).
            2. A high-volume AI music 'Factory' project targeting YouTube SEO and virality.
            
            CRITICAL DIRECTIVE: Ignore general tech journalism (hardware, corporate drama, layoffs) UNLESS it mentions:
            - Spotify, Apple Music, TikTok, or DistroKid changing their terms of service.
            - "Editorial discretion", shadowbans, or AI music crackdowns.
            - Copyright lawsuits or rulings affecting AI-generated works.
            
            Based on the provided text, output exactly:
            1. 'summary': A 1-2 sentence compelling summary of the core insight/strategy discussed. If compliance news is detected, make it the primary focus. If nothing is relevant to music/IP, say "No immediate actionable intelligence detected for music operations."
            2. 'actionItems': An array of EXACTLY 2-3 specific tasks the user must physically do based on the news (e.g., audit metadata, backup files, change release cadence). Be highly imperative.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: `Analyze this raw newsletter text and extract music/marketing/IP insights:
            
            Raw Text:
            ${text.slice(0, 10000)}`,
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
            logApiUsage("/api/parse-newsletter", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }

        if (!response.text) {
            throw new Error("No response from Gemini");
        }

        const parsed = JSON.parse(response.text);

        const newIntelItem: IntelItem = {
            id: `manual-${crypto.randomUUID().split('-')[0]}`,
            tag: "FACTORY",
            date: "Just Now",
            title: "AIGuerrilla: Manual Intel Drop",
            summary: parsed.summary,
            actionItems: parsed.actionItems || [],
            url: "#"
        };

        // Prepend to database cache if it exists, so manual intel stays at the top
        const db = getDb();
        const currentCache = db.intelCache || [];
        const updatedCache = [newIntelItem, ...currentCache].slice(0, 15); // keep last 15 items

        setIntelCache(updatedCache);

        return NextResponse.json({ intel: newIntelItem, success: true });
    } catch (e: any) {
        console.error("Parse Newsletter Error:", e);
        return NextResponse.json({ error: "Failed to parse newsletter", details: e.message }, { status: 500 });
    }
}
