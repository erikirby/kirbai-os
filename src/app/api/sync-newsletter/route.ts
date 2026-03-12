import { NextResponse } from "next/server";
import { getLatestNewslettersAsync } from "@/lib/intel";

export async function GET(req: Request) {
    try {
        const newsletterIntel = await getLatestNewslettersAsync();
        return NextResponse.json({ success: true, intel: newsletterIntel });
    } catch (e: any) {
        console.error("Newsletter Sync Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
