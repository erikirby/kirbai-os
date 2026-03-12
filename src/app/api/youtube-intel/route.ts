import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { YoutubeTranscript } from "@danielxceron/youtube-transcript";
import { getDbAsync, setIntelCacheAsync, IntelItem, logApiUsageAsync } from "@/lib/db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const CHANNEL_ID = "UCnsL7Nh-e09D1W5TmC6Yklw"; // Jesse from AI Guerrilla

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("force") === "true";

    try {
        const db = await getDbAsync();
        const cachedIntel = db.intelCache;

        // Check for 24-hour cache expiration
        const lastUpdated = (db as any).intelLastUpdated || 0;
        const now = Date.now();
        const isExpired = now - lastUpdated > 24 * 60 * 60 * 1000;

        if (cachedIntel && cachedIntel.length > 0 && !forceRefresh && !isExpired) {
            return NextResponse.json({ intel: cachedIntel, cached: true });
        }

        // 1. Fetch RSS Feed from Jesse's Channel
        const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
            cache: "no-store",
        });
        const rssText = await rssRes.text();

        // 2. High-Reliability Extraction
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

        const intelFeed: IntelItem[] = [];
        const systemInstruction = `
            You are an elite music marketing analyst. Your job is to extract actionable intelligence from the provided YouTube video data.
            The user runs a "Music Factory" project generating high volumes of AI tracks (using aliases AELOW and KURAO) targeting YouTube SEO.
            
            CRITICAL DIRECTIVE: The user's AI music operations are under threat from platform bans ("editorial discretion"). 
            You MUST actively hunt for and heavily prioritize any mentions of:
            - Spotify, Apple Music, or DistroKid Terms of Service (TOS) updates.
            - "Editorial discretion" bans, copyright strikes, or shadowbans.
            - New rules regarding AI-generated music, metadata spam, or profanity compliance.
            
            Based on the content, output exactly:
            1. 'summary': A 1-2 sentence compelling summary of the core insight/strategy discussed. If compliance news is detected, make it the primary focus.
            2. 'actionItems': An array of EXACTLY 2 specific tasks the user must physically do. If platform threats are detected, formulate tasks to audit or protect their existing aliases. Be highly imperative.
        `;

        // 3. Loop through videos and hit Gemini
        for (const video of videos) {
            let summary = "AI analysis pending/throttled. Refresh in 30s.";
            let actionItems = ["Review the video manually for insights."];

            try {
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
                    model: "gemini-2.5-flash-lite",
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

                if (response.usageMetadata) {
                    await logApiUsageAsync("/api/youtube-intel", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
                }

                if (response.text) {
                    const parsed = JSON.parse(response.text);
                    summary = parsed.summary;
                    actionItems = parsed.actionItems;
                }
            } catch (err: any) {
                console.error(`AI extraction failed for ${video.id}:`, err.message);
                summary = `AI skipped this video due to rate limits. Try refreshing in a minute.`;
            }

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

        // 4. Sync Newsletter Intel
        try {
            const origin = new URL(req.url).origin;
            const newsRes = await fetch(`${origin}/api/sync-newsletter`, { cache: 'no-store' });
            const newsData = await newsRes.json();
            if (newsData.success && newsData.intel) {
                intelFeed.push(...newsData.intel);
            }
        } catch (newsErr) {
            console.error("Newsletter integration failed:", newsErr);
        }

        // 5. Inject a simulated Platform Trend Event
        intelFeed.unshift({
            id: "trend-1",
            tag: "KIRBAI",
            date: "Trending",
            title: "CRITICAL: Platform Compliance Shift Detected",
            summary: "Multiple independent artists report sudden 'editorial discretion' takedowns from DistroKid impacting high-volume AI creators without warning.",
            actionItems: [
                "Audit all pending KURAO and AELOW releases for potentially flagged metadata or controversial lyrics immediately.",
                "Throttle daily release volume to human-passing limits (max 1-2 tracks per alias per week) to evade automated spam detection algorithms."
            ],
            url: "https://x.com/search?q=distrokid+ban"
        });

        // Save to cache with timestamp
        const updatedDb = await getDbAsync();
        updatedDb.intelCache = intelFeed;
        (updatedDb as any).intelLastUpdated = Date.now();
        await setIntelCacheAsync(intelFeed);
        // Note: setIntelCacheAsync only sets intelCache, we might need a dedicated db.setRow for the timestamp if we want it clean
        const { setRow } = await import("@/lib/db");
        await setRow('intel_last_updated', Date.now());

        return NextResponse.json({ intel: intelFeed, cached: false });
    } catch (e: any) {
        console.error("Intel Feed Error:", e);
        return NextResponse.json({ error: "Failed to generate intel feed", details: e.message }, { status: 500 });
    }
}
