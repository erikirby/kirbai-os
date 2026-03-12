import { NextRequest, NextResponse } from 'next/server';
import { getPulseStateAsync, savePulseStateAsync } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const mode = req.nextUrl.searchParams.get('mode') || 'kirbai';
        const state = await getPulseStateAsync(mode);
        return NextResponse.json({ success: true, state });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { mode, state } = await req.json();
        await savePulseStateAsync(mode, state);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
