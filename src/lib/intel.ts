import { GoogleGenAI, Type } from "@google/genai";
import { IntelItem, logApiUsageAsync } from "@/lib/db";

/**
 * Utility to call Gemini with basic 429 (Rate Limit) handling.
 * On the Free Tier, we hit 429s often (especially on Pro).
 */
export async function safeCallGemini(
    modelName: "gemini-2.5-flash" | "gemini-2.5-pro" | "gemini-2.0-flash" | "gemini-1.5-flash",
    options: any,
    retries = 2
): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Masked logging for debugging
    const keyHint = apiKey ? `[${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 3)}] (Len: ${apiKey.length})` : 'MISSING';
    console.log(`🤖 [Gemini] Key Check: ${keyHint} | Model: ${modelName}`);

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in environment. Use 'npm run dev' locally or check Vercel Environment Variables.");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const res = await (ai.models as any).generateContent({
            model: modelName,
            ...options
        });
        return res;
    } catch (e: any) {
        if (retries > 0 && (e.message?.includes("429") || e.message?.includes("503"))) {
            const label = e.message?.includes("429") ? "429 Rate limit" : "503 Unavailable";
            console.warn(`[Gemini ${label}] hit for ${modelName}. Retrying in 3s...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return safeCallGemini(modelName, options, retries - 1);
        }
        throw e;
    }
}

/**
 * Fallback AI call via OpenRouter using free-tier models.
 * Used when all Gemini quota is exhausted.
 */
export async function callOpenRouter(prompt: string, systemInstruction: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

    const FREE_MODELS = [
        "google/gemma-4-31b-it:free",           // 262k ctx, newest Gemma, strong JSON
        "nvidia/nemotron-3-super-120b-a12b:free", // 262k ctx, large NVIDIA model
        "openai/gpt-oss-120b:free",              // 131k ctx, OpenAI open-source
        "nousresearch/hermes-3-llama-3.1-405b:free", // 131k ctx, excellent instruction following
        "meta-llama/llama-3.3-70b-instruct:free", // 65k ctx, reliable fallback
        "google/gemma-3-27b-it:free",            // 131k ctx, proven working
    ];

    let lastError: any;
    for (const model of FREE_MODELS) {
        try {
            console.log(`[OpenRouter] Trying ${model}`);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10s per model
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://kirbai-os.vercel.app",
                    "X-Title": "Kirbai OS",
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: prompt },
                    ],
                    response_format: { type: "json_object" },
                }),
            });
            clearTimeout(timeout);

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`OpenRouter ${res.status}: ${err}`);
            }

            const data = await res.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) throw new Error("OpenRouter returned empty content");

            // Validate it's parseable JSON with expected shape
            const parsed = JSON.parse(text);
            if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
                throw new Error(`OpenRouter ${model} returned malformed structure`);
            }
            const firstCard = parsed.cards[0];
            if (!firstCard.title || !firstCard.type || !firstCard.description) {
                throw new Error(`OpenRouter ${model} returned cards missing required fields`);
            }

            console.log(`[OpenRouter] Success with ${model}`);
            return text;
        } catch (e: any) {
            console.warn(`[OpenRouter] ${model} failed: ${e.message?.slice(0, 80)}`);
            lastError = e;
        }
    }
    throw lastError;
}

/**
 * Fallback AI call via Groq's free tier.
 * Fast inference, separate quota pool from Gemini and OpenRouter.
 */
export async function callGroq(prompt: string, systemInstruction: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");

    const GROQ_MODELS = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
    ];

    let lastError: any;
    for (const model of GROQ_MODELS) {
        try {
            console.log(`[Groq] Trying ${model}`);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: prompt },
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.8,
                }),
            });
            clearTimeout(timeout);

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Groq ${res.status}: ${err}`);
            }

            const data = await res.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) throw new Error("Groq returned empty content");

            const parsed = JSON.parse(text);
            if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
                throw new Error(`Groq ${model} returned malformed structure`);
            }
            const firstCard = parsed.cards[0];
            if (!firstCard.title || !firstCard.type || !firstCard.description) {
                throw new Error(`Groq ${model} returned cards missing required fields`);
            }

            console.log(`[Groq] Success with ${model}`);
            return text;
        } catch (e: any) {
            console.warn(`[Groq] ${model} failed: ${e.message?.slice(0, 80)}`);
            lastError = e;
        }
    }
    throw lastError;
}

export async function getLatestNewslettersAsync(): Promise<IntelItem[]> {
    try {
        const postsRes = await fetch("https://aiguerrilla.com/posts", {
            cache: "no-store",
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const data = await postsRes.json();
        const latestPosts = data.posts?.slice(0, 2) || [];

        const newsletterIntel: IntelItem[] = [];

        for (const post of latestPosts) {
            const postUrl = `https://aiguerrilla.com/p/${post.slug}`;
            const postContentRes = await fetch(postUrl);
            const postHtml = await postContentRes.text();
            
            const contentStart = postHtml.indexOf('<article') !== -1 ? postHtml.indexOf('<article') : postHtml.indexOf('<body');
            const truncatedHtml = postHtml.slice(contentStart, contentStart + 15000);

            const systemInstruction = `
                You are an elite tactical analyst for a high-volume AI music brand.
                Your job is to extract actionable intelligence from the provided newsletter content.
                The user runs a "Music Factory" project generating high volumes of AI tracks targeting YouTube SEO.
                
                Based on the content, output exactly:
                1. 'summary': A 1-2 sentence compelling summary of the core insight/strategy discussed.
                2. 'actionItems': An array of EXACTLY 2 specific, aggressive tasks the user must physically do inside their OS or workflow to leverage this info.
            `;

            const response = await safeCallGemini("gemini-2.5-flash", {
                contents: `Analyze this newsletter post for a music creator.
                
                Title: ${post.web_title}
                Content Fragment: ${truncatedHtml}`,
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
                await logApiUsageAsync("/api/sync-newsletter", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
            }

            if (response.text) {
                const parsed = JSON.parse(response.text);
                newsletterIntel.push({
                    id: `newsletter-${post.slug}`,
                    tag: "NEWSLETTER",
                    date: new Date(post.override_scheduled_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    title: `Guerrilla: ${post.web_title}`,
                    summary: parsed.summary,
                    actionItems: parsed.actionItems,
                    url: postUrl
                });
            }
        }
        return newsletterIntel;
    } catch (e) {
        console.error("Shared Newsletter Sync Error:", e);
        return [];
    }
}
