import { NextRequest, NextResponse } from 'next/server';
import { getMissionByIdAsync } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const mission = await getMissionByIdAsync(id);
        if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });

        return NextResponse.json({ success: true, data: mission });
    } catch (e: any) {
        console.error("Fetch Mission ID Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
