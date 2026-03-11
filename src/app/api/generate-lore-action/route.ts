import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { prompt, currentState } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const systemInstruction = `
            You are the continuity and worldbuilding engine for Kirbai OS.
            The user will give you a short narrative prompt. Your job is to translate that prompt into structured graph modifications (nodes and edges) for a visual Figma-style Lore Board.
            
            Current Lore Board State:
            ${JSON.stringify(currentState, null, 2)}

            Output a strict JSON array of 'actions'. 
            Valid actions: 'ADD_NODE' and 'ADD_EDGE'.
            
            When adding a node:
            Provide a unique lowercase 'id' (no spaces), 'type' (character, artifact, location, event), 'data' object with 'label' (capitalized name) and 'description' (short 1-2 sentence lore).
            'position' should be loosely scattered around x: 400, y: 300 to start, staggered so they don't exactly overlap.

            When adding an edge:
            Provide 'source' (node id), 'target' (node id), and a short 'label' (e.g., 'created', 'corrupted by', 'owns').
            
            Example output format:
            [
               { "action": "ADD_NODE", "node": { "id": "meloetta", "type": "character", "position": { "x": 400, "y": 300 }, "data": { "label": "Meloetta", "description": "An innocent idol." } } },
               { "action": "ADD_EDGE", "edge": { "id": "mel-knot", "source": "meloetta", "target": "destiny_knot", "label": "corrupted by" } }
            ]
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                temperature: 0.2, // Low temp for reliable JSON formatting
            }
        });

        const actions = JSON.parse(response.text || "[]");
        return NextResponse.json({ actions });

    } catch (error: any) {
        console.error('Error in generate-lore-action:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate action' }, { status: 500 });
    }
}
