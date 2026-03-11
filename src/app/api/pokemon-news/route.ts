import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";

const COMPLIANCE_RSS_URL = "https://news.google.com/rss/search?q=Spotify+OR+DistroKid+OR+%22editorial+discretion%22+OR+%22AI+music%22+ban+when:60d&hl=en-US&gl=US&ceid=US:en";

async function fetchComplianceNews() {
    try {
        const res = await fetch(COMPLIANCE_RSS_URL, { cache: "no-store" });
        const xml = await res.text();
        const items = xml.split("<item>").slice(1, 4); // Get top 3 articles

        return items.map(item => {
            const title = item.match(/<title>([^<]+)<\/title>/)?.[1] || "";
            const link = item.match(/<link>([^<]+)<\/link>/)?.[1] || "";
            const pubDate = item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] || "";

            // Clean up Google News title formatting
            const cleanTitle = title.split(" - ")[0] || title;

            return {
                title: `🛡️ PLATFORM INTEL: ${cleanTitle}`,
                url: link,
                isViral: true,
                source: "Social Pulse",
                date: pubDate
            };
        });
    } catch (e) {
        console.error("Compliance Fetch Error:", e);
        return [];
    }
}

export async function GET() {
    try {
        const db = getDb();

        // Fetch Music Platform Compliance News
        const complianceIntel = await fetchComplianceNews();

        db.pokemonNews = complianceIntel;
        saveDb(db);

        return NextResponse.json({ news: complianceIntel });
    } catch (e: any) {
        return NextResponse.json({ error: "Failed to scrape compliance intel" }, { status: 500 });
    }
}
