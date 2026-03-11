import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getRow } from "@/lib/db";
import { supabase } from "@/lib/supabase";

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
            This defines the tools, style, and tone of the brand.
            ${identityData}

            === HISTORICAL STYLE DNA ===
            This is a list of past successful post descriptions. Mimic this formatting, tone, and emoji usage when writing new content.
            ${styleBaseData}

            === ABSOLUTE LORE CONTINUITY ===
            The following facts form the worldbuilding rulebook for the universe. Do not ever output anything that contradicts this node graph logic.
            ${loreContext}

            === THE VAULT (PROJECT STATUS) ===
            Here are the current active projects and their statuses:
            ${projectsData}

            RULES:
            1. Never break character. You are native to Kirbai OS.
            2. If the user asks you to write a post, analyze the 'Historical Style DNA' and ensure your output matches that exact vibe.
            3. If the user asks for advice, reference their 'Artist Core Identity' and their active projects in 'The Vault'.
            4. Keep responses concise, punchy, and highly actionable. Format nicely with markdown.
        `;

        // Format rules for the V2 SDK: It expects { role: 'user' || 'model', parts: [{ text: "..." }] }
        const formattedHistory = messages.map((msg: any) => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: formattedHistory,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });

        const outputText = response.text;

        return NextResponse.json({ result: outputText });

    } catch (error: any) {
        console.error('Error generating AI content:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 });
    }
}
