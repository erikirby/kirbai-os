import { GoogleGenAI, Type } from "@google/genai";
import { IntelItem, logApiUsageAsync } from "@/lib/db";

/**
 * Utility to call Gemini with basic 429 (Rate Limit) handling.
 * On the Free Tier, we hit 429s often (especially on Pro).
 */
export async function safeCallGemini(
    modelName: "gemini-2.5-flash" | "gemini-2.5-pro" | "gemini-2.0-flash",
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
