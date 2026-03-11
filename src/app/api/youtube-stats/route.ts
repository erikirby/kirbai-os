import { NextResponse } from "next/server";

const CHANNELS = [
    { id: "kirbai", handle: "@KirbaiMusic", name: "Kirbai" },
    { id: "kurao", handle: "@kuraomusic", name: "KURAO" },
    { id: "aelow", handle: "@AelowMusic", name: "AELOW" }
];

export async function GET() {
    try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            throw new Error("Missing YOUTUBE_API_KEY in environment variables.");
        }

        const stats = await Promise.all(CHANNELS.map(async (channel) => {
            try {
                // Official Google YouTube Data API v3 fetch
                let res = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&forHandle=${channel.handle}&key=${apiKey}`, {
                    cache: 'no-store'
                });
                let data = await res.json();

                if (data.error) {
                    console.error(`YouTube API Error for ${channel.handle}:`, data.error);
                }

                // Retry without @ if no results
                if ((!data.items || data.items.length === 0) && channel.handle.startsWith('@')) {
                    const handleNoAt = channel.handle.substring(1);
                    console.log(`No results for ${channel.handle}, retrying with ${handleNoAt}`);
                    res = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&forHandle=${handleNoAt}&key=${apiKey}`, {
                        cache: 'no-store'
                    });
                    data = await res.json();
                }

                if (data.items && data.items.length > 0) {
                    const item = data.items[0];
                    return {
                        id: channel.id,
                        name: channel.name,
                        handle: channel.handle,
                        subscribers: parseInt(item.statistics?.subscriberCount) || 0,
                        views: parseInt(item.statistics?.viewCount) || 0,
                        videoCount: parseInt(item.statistics?.videoCount) || 0,
                        avatarUrl: item.snippet?.thumbnails?.default?.url || ""
                    };
                }

                // Fallback if handle doesn't return data
                return {
                    id: channel.id,
                    name: channel.name,
                    handle: channel.handle,
                    subscribers: 0,
                    views: 0,
                    videoCount: 0,
                    avatarUrl: ""
                };
            } catch (err) {
                console.error(`Failed to fetch official API stats for ${channel.handle}`, err);
                return {
                    id: channel.id,
                    name: channel.name,
                    handle: channel.handle,
                    subscribers: 0,
                    views: 0,
                    videoCount: 0,
                    avatarUrl: ""
                };
            }
        }));

        return NextResponse.json({ stats });
    } catch (e: any) {
        console.error("YouTube Official Stats Fetch Error:", e);
        return NextResponse.json({ error: "Failed to fetch top-level stats" }, { status: 500 });
    }
}
