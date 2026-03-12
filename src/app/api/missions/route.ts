import { NextRequest, NextResponse } from 'next/server';
import { getMissionsAsync, saveMissionAsync } from "@/lib/db";

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

export async function POST(req: NextRequest) {
    try {
        const { mission } = await req.json();
        if (!mission || !mission.id) {
            return NextResponse.json({ success: false, error: "Invalid mission data" }, { status: 400 });
        }
        await saveMissionAsync(mission);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ success: false, error: "Missing mission ID" }, { status: 400 });
        }
        const { deleteMissionAsync } = await import("@/lib/db");
        await deleteMissionAsync(id);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
