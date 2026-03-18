import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getRow, logApiUsageAsync } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { aiTools, save_to_vault, save_to_lore, save_to_concepts } from "@/lib/ai-actions";

// Load Context Files
// Helper to pull context from Supabase persistence
const getSupabaseContext = async (key: string, mode?: string) => {
    try {
        // Handle partitioning for keys that need it
        let effectiveKey = key;
        if (key === 'concepts' && mode === 'factory') effectiveKey = 'concepts_factory';
        if (key === 'roadmap' && mode === 'factory') effectiveKey = 'roadmap_factory';
        // Lore is handled by getLoreContext separately

        const data = await getRow(effectiveKey);
        if (!data) return null;

        if (key === 'vault_projects' && Array.isArray(data)) {
            // Filter projects by alias based on mode
            const filtered = data.filter((p: any) => {
                if (mode === 'factory') return p.alias === 'AELOW' || p.alias === 'KURAO';
                return p.alias === 'Kirbai';
            });
            const slimmed = filtered.map((p: any) => ({
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
const getLoreContext = async (mode: string) => {
    try {
        const key = mode === 'factory' ? 'lore_factory' : 'lore_kirbai';
        const data = await getRow(key);
        
        if (data && data.nodes && data.nodes.length > 0) {
            const loreNodesStr = data.nodes.map((n: any) => `- [${n.type?.toUpperCase() || 'NODE'}] ${n.data?.label || n.id}: ${n.data?.description || ''}`).join('\n');
            const loreEdgesStr = (data.edges || []).map((e: any) => {
                const sourceLabel = data.nodes.find((n: any) => n.id === e.source)?.data?.label || e.source;
                const targetLabel = data.nodes.find((n: any) => n.id === e.target)?.data?.label || e.target;
                return `- ${sourceLabel} -> [${e.label}] -> ${targetLabel}`;
            }).join('\n');
            return `Entities:\n${loreNodesStr}\n\nRelationships:\n${loreEdgesStr}`;
        }
    } catch (e) {
        console.error("Lore Context Fetch Error:", e);
    }
    return "No lore continuity defined.";
};

// Specialized Finance Fetcher
const getFinanceContext = async () => {
    try {
        const db = await getRow('main_db');
        const finance = db?.financeAnalysis;
        if (!finance) return "No financial data available yet.";

        const { totals, platforms, tracks, persistedAt } = finance;
        const topPlatforms = platforms?.slice(0, 3).map((p: any) => `- ${p.store}: $${p.revenue.toFixed(2)} (${p.streams} streams)`).join('\n');
        const topTracks = tracks?.slice(0, 5).map((t: any) => `- ${t.title}: $${t.revenue.toFixed(2)}`).join('\n');

        return `
Revenue Data (Uploaded: ${persistedAt || 'Unknown'}):
TOTAL REVENUE: $${totals?.revenue?.toFixed(2) || '0.00'}
TOTAL STREAMS: ${totals?.streams || '0'}

Top Platforms:
${topPlatforms}

Top Tracks:
${topTracks}
        `.trim();
    } catch (e) {
        return "Error fetching finance context.";
    }
};

// Specialized Analytics Fetcher
const getAnalyticsContext = async (mode: string) => {
    try {
        const key = mode === 'factory' ? 'pulse_state_factory' : 'pulse_state_kirbai';
        const state = await getRow(key);
        if (!state) return "No social analytics data available.";

        const { lastUpdated, instagram, youtube } = state;
        const igSummary = instagram ? `IG: ${instagram.followers || 0} followers, ${instagram.reach || 0} reach.` : "IG Data missing.";
        const ytSummary = youtube ? `YT: ${youtube.subscribers || 0} subs, ${youtube.views || 0} views.` : "YT Data missing.";

        return `Last Pulse Sync: ${lastUpdated || 'Never'}\n${igSummary}\n${ytSummary}`;
    } catch (e) {
        return "Error fetching analytics context.";
    }
};

// Specialized Roadmap Fetcher
const getRoadmapContext = async (mode: string) => {
    try {
        const key = mode === 'factory' ? 'roadmap_factory' : 'roadmap_kirbai';
        const roadmap = await getRow(key);
        if (!roadmap || !roadmap.phases) return "No roadmap defined.";

        const currentPhase = roadmap.phases.find((p: any) => p.status === 'Current Objective');
        const pendingPhases = roadmap.phases.filter((p: any) => p.status === 'Pending Trajectory').map((p: any) => `- ${p.title}`).join('\n');

        return `
CURRENT OBJECTIVE: ${currentPhase ? currentPhase.title + ' - ' + currentPhase.description : 'None set'}
FUTURE TRAJECTORY:
${pendingPhases || 'TBD'}
        `.trim();
    } catch (e) {
        return "Error fetching roadmap context.";
    }
};

// Specialized Muse Fetcher (Cards & Psyche)
const getMuseContext = async () => {
    try {
        const [cards, psyche] = await Promise.all([
            getRow('muse_cards'),
            getRow('user_psyche')
        ]);

        const activeCards = (cards || [])
            .filter((c: any) => c.status === 'pending')
            .slice(0, 3)
            .map((c: any) => `- [${c.type.toUpperCase()}] ${c.title}: ${c.reason}`)
            .join('\n');

        const psycheStr = psyche ? 
            `MOOD: ${psyche.mood || 'Unknown'} | MOTIVATION: ${psyche.motivationLevel || 0}/100 | BURNOUT RISK: ${psyche.burnoutRisk || 0}/100` : 
            "No psyche data tracked.";

        return `
CREATIVE DEBATES (Active):
${activeCards || 'No active debates.'}

USER PSYCHE:
${psycheStr}
        `.trim();
    } catch (e) {
        return "Error fetching muse context.";
    }
};

export async function POST(req: NextRequest) {
    try {
        const { messages, activeTab = 'kirbai' } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Gather all native OS context from Supabase (mode-aware)
        const [identityData, styleBaseData, projectsData, loreContext, financeContext, analyticsContext, roadmapContext, museContext] = await Promise.all([
            getSupabaseContext('brand_identity', activeTab).then(d => d || "No specific brand identity defined."),
            getSupabaseContext('instagram_style_base', activeTab).then(d => d || "No historical style data available."),
            getSupabaseContext('vault_projects', activeTab).then(d => d || "No project data available."),
            getLoreContext(activeTab),
            getFinanceContext(),
            getAnalyticsContext(activeTab),
            getRoadmapContext(activeTab),
            getMuseContext()
        ]);

        const systemInstruction = `
            You are the core intelligence engine for 'Kirbai OS', a specialized dashboard for managing a music and content brand.
            Your role is to act as an expert consultant, copywriter, and strategist. 
            
            CURRENT MODE: ${activeTab === 'kirbai' ? 'KIRBAI (Main Brand Lore)' : 'MUSIC FACTORY (SEO & Utility monetization)'}
            
            CRITICAL CONTEXT INJECTION - You must use the following data to inform your responses. Never ask the user for this information if it is provided here.

            === ARTIST CORE IDENTITY ===
            ${identityData}

            === FINANCIAL INTELLIGENCE (DISTROKID EARNINGS) ===
            ${financeContext}

            === PERFORMANCE PULSE (SOCIAL ANALYTICS) ===
            ${analyticsContext}

            === STRATEGIC ROADMAP ===
            ${roadmapContext}

            === MUSE SANCTUARY (CREATIVE DEBATES & PSYCHE) ===
            ${museContext}

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

        if (response.usageMetadata) {
            await logApiUsageAsync("/api/generate-content (pre-tool)", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }

        // Handle Function Calling Loop
        const toolCalls = response.candidates?.[0]?.content?.parts?.filter(p => (p as any).functionCall);
        
        if (toolCalls && toolCalls.length > 0) {
            const toolResults = [];
            
            for (const call of toolCalls as any[]) {
                const { name, args } = call.functionCall;
                console.log(`🤖 AI Triggering Tool: ${name}`, args);
                
                let result;
                if (name === 'save_to_vault') result = await save_to_vault(args, activeTab);
                else if (name === 'save_to_lore') result = await save_to_lore(args, activeTab);
                else if (name === 'save_to_concepts') result = await save_to_concepts(args, activeTab);
                
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

            if (response.usageMetadata) {
                await logApiUsageAsync("/api/generate-content (final)", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
            }
        }

        const outputText = response.text || "I have processed your request.";
        return NextResponse.json({ result: outputText });

    } catch (error: any) {
        console.error('Error generating AI content:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 });
    }
}
