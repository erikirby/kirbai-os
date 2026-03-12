import { GoogleGenAI, Type } from "@google/genai";
import { IntelItem, logApiUsageAsync } from "@/lib/db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-lite",
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
