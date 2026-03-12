import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getDbAsync, setIntelCacheAsync, IntelItem, logApiUsageAsync } from "@/lib/db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(req: Request) {
    try {
        // 1. Fetch the posts archive page
        const postsRes = await fetch("https://aiguerrilla.com/posts", {
            cache: "no-store",
        });
        const html = await postsRes.text();
        
        // 2. Extract post slugs and titles using regex (since we don't have a DOM parser in standard edge runtime)
        // Looking for patterns like: href="/p/slug-name" and the title nearby
        // Beehiiv posts are usually in a structure like: <a class="..." href="/p/slug">Title</a>
        const postRegex = /href="\/p\/([^"]+)"[^>]*>([^<]+)<\/a>/g;
        const missions: { slug: string, title: string }[] = [];
        let match;
        
        while ((match = postRegex.exec(html)) !== null && missions.length < 2) {
            const slug = match[1];
            const title = match[2].trim();
            // Avoid duplicates
            if (!missions.some(m => m.slug === slug)) {
                missions.push({ slug, title });
            }
        }

        const newsletterIntel: IntelItem[] = [];

        for (const post of missions) {
            const postUrl = `https://aiguerrilla.com/p/${post.slug}`;
            
            // Fetch raw post content for analysis
            const postContentRes = await fetch(postUrl);
            const postHtml = await postContentRes.text();
            
            // Extract the main content. Beehiiv usually has it in a div or we can just grab a large chunk.
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
                
                Title: ${post.title}
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
                    date: "Recent", // We don't have easy date extraction from HTML regex, but Gemini can probably find it if we asked
                    title: `Guerrilla: ${post.title}`,
                    summary: parsed.summary,
                    actionItems: parsed.actionItems,
                    url: postUrl
                });
            }
        }

        if (newsletterIntel.length === 0) {
            // Backup/Mock if scraper fails to find anything
            console.error("Scraper found 0 posts. HTML length:", html.length);
        }

        return NextResponse.json({ success: true, intel: newsletterIntel });
    } catch (e: any) {
        console.error("Newsletter Sync Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
