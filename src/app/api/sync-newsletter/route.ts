import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getDbAsync, setIntelCacheAsync, IntelItem, logApiUsageAsync } from "@/lib/db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(req: Request) {
    try {
        // 1. Fetch the posts list from beehiiv public endpoint
        const postsRes = await fetch("https://aiguerrilla.com/posts", {
            cache: "no-store",
            headers: {
                'Accept': 'application/json'
            }
        });
        const postsData = await postsRes.json();
        const latestPosts = postsData.posts.slice(0, 2); // Get the 2 most recent

        const newsletterIntel: IntelItem[] = [];

        for (const post of latestPosts) {
            const postUrl = `https://aiguerrilla.com/p/${post.slug}`;
            
            // Fetch raw post content for analysis
            const postContentRes = await fetch(postUrl);
            const html = await postContentRes.text();
            
            // Basic extraction of text to avoid overwhelming Gemini with HTML
            // We want the main article body. Beehiiv usually wraps it in a specific tag or we can just send the whole thing and let Gemini handle it.
            // Limiting to first 6000 chars of HTML is usually enough for a newsletter.
            const truncatedHtml = html.slice(0, 10000);

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
                Subtitle: ${post.web_subtitle}
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
                    id: `newsletter-${post.id}`,
                    tag: "NEWSLETTER",
                    date: new Date(post.override_scheduled_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    title: `Guerrilla: ${post.web_title}`,
                    summary: parsed.summary,
                    actionItems: parsed.actionItems,
                    url: postUrl
                });
            }
        }

        return NextResponse.json({ success: true, intel: newsletterIntel });
    } catch (e: any) {
        console.error("Newsletter Sync Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
