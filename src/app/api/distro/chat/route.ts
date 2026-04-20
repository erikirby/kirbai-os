import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { safeCallGemini, callOpenRouter, callGroq } from '@/lib/intel';
import { logApiUsageAsync, getCompetitorsAsync, saveDistroSessionAsync } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const mode = url.searchParams.get('mode') || 'kirbai';
        const key = mode === 'factory' ? 'distro_session_factory' : 'distro_session_kirbai';
        const { data } = await supabase.from('persistence').select('value').eq('key', key).maybeSingle();
        return NextResponse.json(data?.value || { messages: [], platforms: null });
    } catch (e: any) {
        return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { messages, mode } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
        }

        // 1. Context Gathering (Self-Intelligence)
        const competitors = await getCompetitorsAsync(mode);
        const { data: brandIdentity } = await supabase.from('brand_identity').select('value').eq('key', 'brand_identity').maybeSingle();
        
        const compContext = competitors.length > 0 
            ? `COMPETITOR RADAR DATA:\n${competitors.map(c => `- ${c.name} (${c.platform}): ${c.handleUrl} | Notes: ${c.notes}`).join('\n')}`
            : "No specific competitors tracked yet.";

        const identityContext = brandIdentity?.value 
            ? `BRAND DNA:\nObjective: ${brandIdentity.value.ultimateGoal}\nAesthetic Rules: ${brandIdentity.value.aestheticRules}\nNarrative Style: ${brandIdentity.value.narrativeRules}`
            : "No specific brand identity saved.";

        const systemInstruction = `
            You are the Elite Kirbai OS Description Generator & Distribution Strategist.
            Your role is to craft and iteratively refine platform-specific content for: TikTok, YouTube Shorts, Instagram Reels, and Facebook.
            
            Current Mode: ${mode === 'kirbai' ? 'Brand "Kirbai" (High Fidelity, Storytelling)' : 'Music Factory (SEO Utility, Quantity)'}
            
            CONTEXT RECOGNITION:
            ${identityContext}
            
            ${compContext}
            
            1. You MUST use the Google Search tool to look up CURRENT algorithm trends and active hashtags. 
            2. Cross-reference the user's concept with the COMPETITOR RADAR data matches if relevant.
            3. Return your response as a RAW JSON object. DO NOT include markdown code blocks.Return ONLY the JSON.
            
            JSON STRUCTURE:
            {
              "reply": "Conversational reply in markdown",
              "platforms": {
                "tiktok": "caption",
                "youtube": "caption",
                "instagram": "caption",
                "facebook": "caption"
              }
            }
        `;

        const history = messages.map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.text }]
        }));

        const lastMessage = history.pop()?.parts[0]?.text || "Hello";
        let textResponse = "";
        let attempt = "Gemini";

        // --- 3-TIER FALLBACK CHAIN ---
        try {
            const response = await safeCallGemini("gemini-2.5-flash", {
                contents: lastMessage,
                config: {
                    systemInstruction: systemInstruction,
                    tools: [{ googleSearch: {} }],
                }
            });
            if (response.usageMetadata) await logApiUsageAsync("/api/distro/chat", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
            textResponse = typeof (response as any).text === 'function' ? (response as any).text() : response.text;
        } catch (geminiErr: any) {
            console.warn(`[Distro API] Gemini Failed: ${geminiErr.message?.slice(0, 80)}. Switching to Fallback...`);
            attempt = "OpenRouter Fallback";
            try {
                textResponse = await callOpenRouter(lastMessage, systemInstruction, true);
            } catch (orErr: any) {
                console.warn(`[Distro API] OpenRouter Failed. Switching to final fallback...`);
                attempt = "Groq Final Fallback";
                textResponse = await callGroq(lastMessage, systemInstruction, true);
            }
        }

        if (!textResponse) throw new Error("All AI providers failed to return a response.");

        // Clean any accidental markdown wrap
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResponse = JSON.parse(textResponse);

        // PERSIST the session immediately
        const finalSession = {
            messages: [...messages, { role: 'ai', text: parsedResponse.reply }],
            platforms: parsedResponse.platforms
        };
        await saveDistroSessionAsync(mode, finalSession);

        return NextResponse.json({ 
            success: true, 
            reply: (attempt !== "Gemini") ? `[${attempt}] ${parsedResponse.reply}` : parsedResponse.reply,
            platforms: parsedResponse.platforms
        });

    } catch (error: any) {
        console.error("Distro Chat Error:", error);
        return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
    }
}
