import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getRow } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { aiTools, save_to_vault, save_to_lore, save_to_concepts } from "@/lib/ai-actions";

// Load Context Files
// Helper to pull context from Supabase persistence
const getSupabaseContext = async (key: string) => {
    try {
        const data = await getRow(key);
        if (!data) return null;

        // If it's projects, we MUST strip out the massive base64 coverArt images
        if (key === 'vault_projects' && Array.isArray(data)) {
            const slimmed = data.map((p: any) => ({
                ...p,
                coverArt: p.coverArt ? "[IMAGE_DATA_STRIPPED_FOR_TOKENS]" : null
            }));
            return JSON.stringify(slimmed);
        }
        return typeof data === 'string' ? data : JSON.stringify(data);
    } catch (e) {
        return null;
    }
};

// Specialized Lore Fetcher
const getLoreContext = async () => {
    try {
        const [nodesRes, edgesRes] = await Promise.all([
            supabase.from('lore_nodes').select('*'),
            supabase.from('lore_edges').select('*')
        ]);
        
        if (nodesRes.data && nodesRes.data.length > 0) {
            const loreNodesStr = nodesRes.data.map((n: any) => `- [${n.type.toUpperCase()}] ${n.label}: ${n.description}`).join('\n');
            const loreEdgesStr = (edgesRes.data || []).map((e: any) => {
                const sourceLabel = nodesRes.data?.find((n: any) => n.id === e.source)?.label || e.source;
                const targetLabel = nodesRes.data?.find((n: any) => n.id === e.target)?.label || e.target;
                return `- ${sourceLabel} -> [${e.label}] -> ${targetLabel}`;
            }).join('\n');
            return `Entities:\n${loreNodesStr}\n\nRelationships:\n${loreEdgesStr}`;
        }
    } catch (e) {
        console.error("Lore Context Fetch Error:", e);
    }
    return "No lore continuity defined.";
};

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Gather all native OS context from Supabase
        const [identityData, styleBaseData, projectsData, loreContext] = await Promise.all([
            getSupabaseContext('brand_identity').then(d => d || "No specific brand identity defined."),
            getSupabaseContext('instagram_style_base').then(d => d || "No historical style data available."),
            getSupabaseContext('vault_projects').then(d => d || "No project data available."),
            getLoreContext()
        ]);

        const systemInstruction = `
            You are the core intelligence engine for 'Kirbai OS', a specialized dashboard for managing a music and content brand.
            Your role is to act as an expert consultant, copywriter, and strategist. 
            
            CRITICAL CONTEXT INJECTION - You must use the following data to inform your responses. Never ask the user for this information if it is provided here.

            === ARTIST CORE IDENTITY ===
            ${identityData}

            === HISTORICAL STYLE DNA ===
            ${styleBaseData}

            === ABSOLUTE LORE CONTINUITY ===
            ${loreContext}

            === THE VAULT (PROJECT STATUS) ===
            ${projectsData}

            RULES:
            1. Never break character. You are native to Kirbai OS.
            2. AUTO-SAVE CAPABILITY: You have tools to 'save_to_vault', 'save_to_lore', and 'save_to_concepts'. Use these when a user brainstorm is finalized or when they explicitly ask you to "log", "save", or "file" something.
            3. CREATIVE HUB: The 'Creative' section is for brainstorming content ideas (reels, posts, music, scripts). Use 'save_to_concepts' to store these.
            4. BE HONEST: You can only save what you have tools for. You cannot delete data.
            5. Keep responses concise, punchy, and highly actionable.
        `;

        // Format history for Gemini
        const formattedHistory = messages.map((msg: any) => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        // Initial Generation
        let response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: formattedHistory,
            config: {
                systemInstruction: systemInstruction,
                tools: aiTools,
                temperature: 0.7,
            }
        });

        // Handle Function Calling Loop
        const toolCalls = response.candidates?.[0]?.content?.parts?.filter(p => (p as any).functionCall);
        
        if (toolCalls && toolCalls.length > 0) {
            const toolResults = [];
            
            for (const call of toolCalls as any[]) {
                const { name, args } = call.functionCall;
                console.log(`🤖 AI Triggering Tool: ${name}`, args);
                
                let result;
                if (name === 'save_to_vault') result = await save_to_vault(args);
                else if (name === 'save_to_lore') result = await save_to_lore(args);
                else if (name === 'save_to_concepts') result = await save_to_concepts(args);
                
                toolResults.push({
                    functionResponse: {
                        name,
                        response: result || { error: "Unknown tool" }
                    }
                });
            }

            // Send results back for final summary
            const finalContents = [
                ...formattedHistory,
                response.candidates?.[0]?.content, // Model's call
                { role: 'user', parts: toolResults } // The execution results
            ];

            response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: finalContents,
                config: { systemInstruction, tools: aiTools }
            });
        }

        const outputText = response.text || "I have processed your request.";
        return NextResponse.json({ result: outputText });

    } catch (error: any) {
        console.error('Error generating AI content:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 });
    }
}
