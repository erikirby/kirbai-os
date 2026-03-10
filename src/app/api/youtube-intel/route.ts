import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { YoutubeTranscript } from "@danielxceron/youtube-transcript";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const CHANNEL_ID = "UCnsL7Nh-e09D1W5TmC6Yklw"; // Jesse from AI Guerrilla

export async function GET() {
    try {
        // 1. Fetch RSS Feed from Jesse's Channel
        const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
            // Next.js aggressive caching bypass for live feeds
            cache: "no-store",
        });
        const rssText = await rssRes.text();

        // 2. High-Reliability Extraction: Split by entry and scan for tags
        const videos = [];
        const entries = rssText.split(/<entry/i).slice(1);

        for (const part of entries) {
            if (videos.length >= 2) break;
            const entry = part.split(/<\/entry>/i)[0];

            const getTag = (tag: string) => {
                const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
                const match = regex.exec(entry);
                return match ? match[1] : null;
            };

            const id = getTag("yt:videoId") || getTag("id")?.split("yt:video:")[1];
            const title = getTag("title");
            const published = getTag("published");
            const description = getTag("media:description");

            if (id && title && published) {
                videos.push({
                    id: id.trim(),
                    title: title.trim(),
                    published: new Date(published.trim()),
                    description: (description || "").trim()
                });
            }
        }

        const intelFeed = [];
        const systemInstruction = `
            You are an elite music marketing analyst. Your job is to extract actionable intelligence from the provided YouTube video data.
            The user runs a "Music Factory" project generating high volumes of AI tracks (using aliases AELOW and KURAO) targeting YouTube SEO.
            
            Based on the content, output exactly:
            1. 'summary': A 1-2 sentence compelling summary of the core insight/strategy discussed.
            2. 'actionItems': An array of EXACTLY 2 specific tasks the user must physically do. Be highly imperative.
        `;

        // 3. Loop through videos and hit Gemini
        for (const video of videos) {
            let summary = "AI analysis pending/throttled. Refresh in 30s.";
            let actionItems = ["Review the video manually for insights."];

            try {
                // Staggered delay to avoid hitting "Requests Per Minute" limits on Free Tier
                if (intelFeed.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                let text = "";
                try {
                    const transcriptData = await YoutubeTranscript.fetchTranscript(video.id);
                    text = transcriptData.map((t: any) => t.text).join(" ");
                } catch (transcriptErr: any) {
                    text = video.description || "";
                }

                text = text.slice(0, 4000);

                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: `ACT AS A MARKETING ANALYST. Summarize this YouTube content for a music creator named Kirbai.
                    
                    Video Title: ${video.title}
                    Content: ${text}`,
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

                if (response.text) {
                    const parsed = JSON.parse(response.text);
                    summary = parsed.summary;
                    actionItems = parsed.actionItems;
                }
            } catch (err: any) {
                console.error(`AI extraction failed for ${video.id}:`, err.message);
                summary = `AI skipped this video due to rate limits. Try refreshing in a minute.`;
            }

            // Format "X Days Ago"
            const diffDays = Math.floor((new Date().getTime() - video.published.getTime()) / (1000 * 3600 * 24));
            const dateStr = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : `${diffDays} Days Ago`;

            intelFeed.push({
                id: video.id,
                tag: "FACTORY",
                date: dateStr,
                title: `AIGuerrilla: ${video.title}`,
                summary: summary,
                actionItems: actionItems,
                url: `https://www.youtube.com/watch?v=${video.id}`
            });
        }

        // 4. Inject a simulated Kirbai Trend Event (For UI Context)
        intelFeed.unshift({
            id: "trend-1",
            tag: "KIRBAI",
            date: "Trending",
            title: "Massive Trend: Poképia Release (Major Event)",
            summary: "The global launch of Poképia has caused a massive 1200% spike in general Pokémon search volume. This is a rare, macro-level cultural event that you need to ride immediately.",
            actionItems: [
                "Pivot the next Kirbai release to themes heavily rooted in Poképia avatars or social mechanics.",
                "Use high-volume generic Pokémon tags vs niche competitive VGC tags to capture the casual audience wave."
            ],
            url: "https://x.com/Pokemon"
        });

        return NextResponse.json({ intel: intelFeed });
    } catch (e: any) {
        console.error("Intel Feed Error:", e);
        return NextResponse.json({ error: "Failed to generate intel feed", details: e.message }, { status: 500 });
    }
}
