import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
    try {
        const { prompt, currentState } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Only pass a slim summary of nodes/edges to the AI — no positions, no history
        // This prevents the context from getting bloated and the AI losing focus
        const slimContext = {
            nodes: (currentState?.nodes || []).map((n: any) => ({
                id: n.id,
                type: n.type,
                label: n.data?.label || n.id,
                description: n.data?.description || '',
                traits: n.data?.traits || ''
            })),
            edges: (currentState?.edges || []).map((e: any) => ({
                source: e.source,
                target: e.target,
                label: e.label
            }))
        };

        const systemInstruction = `
You are an expert lore database manager for Kirbai OS, a Pokémon-themed music universe.
The user will give you instructions to modify a lore board. Your job is to output a JSON array of actions.

CURRENT LORE BOARD STATE:
${JSON.stringify(slimContext, null, 2)}

OUTPUT: A JSON array of action objects. Supported actions:

1. ADD_NODE — create a new node
   { "action": "ADD_NODE", "node": { "id": "snake_case_id", "type": "character|organization|artifact|location|event", "position": { "x": 400, "y": 300 }, "data": { "label": "Display Name", "description": "1-2 sentence lore.", "traits": "Only if user provides trait info." } } }

2. UPDATE_NODE — edit an existing node's data  
   { "action": "UPDATE_NODE", "nodeId": "existing_id", "updates": { "label"?: "...", "description"?: "...", "traits"?: "..." } }

3. DELETE_NODE — remove a node and its connections
   { "action": "DELETE_NODE", "nodeId": "existing_id" }

4. ADD_EDGE — link two nodes
   { "action": "ADD_EDGE", "edge": { "source": "node_id", "target": "node_id", "label": "verb phrase" } }

RULES (follow all of them):
- EXECUTE EVERY INSTRUCTION. Never skip any request. If user says "add X and also add Y", output actions for both X and Y.
- Check existing node IDs before using ADD_NODE. If a node already exists (check by id), use UPDATE_NODE instead.
- For groups/teams: one "organization" node + "member of" edge for each member.
- Stagger node positions: space each new node ~200px apart so they don't overlap.
- For traits: ONLY include if the user explicitly tells you what the trait is. Do NOT invent or guess. If none provided, omit "traits" entirely.
- For descriptions: brief, factual, lore-appropriate. Do not repeat info from traits.
- IDs must be snake_case (no spaces, no capitals).

EXAMPLE — adding two characters and an edge:
[
  { "action": "ADD_NODE", "node": { "id": "ditto", "type": "character", "position": { "x": 300, "y": 400 }, "data": { "label": "Ditto", "description": "A shapeshifting Pokémon with a mysterious role in the universe." } } },
  { "action": "ADD_NODE", "node": { "id": "meowscarada", "type": "character", "position": { "x": 500, "y": 400 }, "data": { "label": "Meowscarada", "description": "A captivating Pokémon known for her flair and agility." } } },
  { "action": "ADD_EDGE", "edge": { "source": "ditto", "target": "meowscarada", "label": "allied with" } }
]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                temperature: 0.1,
                thinkingConfig: { thinkingBudget: 5000 }
            }
        });

        const rawText = response.text || "[]";
        let actions;
        try {
            actions = JSON.parse(rawText);
        } catch (parseErr) {
            // Try to extract JSON array from response if it has extra text
            const match = rawText.match(/\[[\s\S]*\]/);
            actions = match ? JSON.parse(match[0]) : [];
        }

        if (!Array.isArray(actions)) {
            throw new Error(`AI returned unexpected format: ${rawText.slice(0, 200)}`);
        }

        return NextResponse.json({ actions, count: actions.length });

    } catch (error: any) {
        console.error('Error in generate-lore-action:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate action' }, { status: 500 });
    }
}
