import { NextRequest, NextResponse } from 'next/server';
import { getMissionsAsync } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const mode = url.searchParams.get("mode") || 'kirbai';
        const missions = await getMissionsAsync(mode);
        return NextResponse.json({ success: true, data: missions });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
