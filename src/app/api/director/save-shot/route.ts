import { NextRequest, NextResponse } from 'next/server';
import { getRow, setRow } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { missionId, mode, shotId, updates } = await req.json();

        if (!missionId || !shotId || !updates) {
            return NextResponse.json({ error: "Missing missionId, shotId, or updates" }, { status: 400 });
        }

        const key = mode === 'factory' ? 'missions_factory' : 'missions_kirbai';
        const missions = await getRow(key) || [];
        
        const mIdx = missions.findIndex((m: any) => m.id === missionId);
        if (mIdx === -1) {
            return NextResponse.json({ error: "Mission not found" }, { status: 404 });
        }

        const mission = missions[mIdx];
        const sIdx = mission.shots.findIndex((s: any) => s.id === shotId);
        if (sIdx === -1) {
            return NextResponse.json({ error: "Shot not found" }, { status: 404 });
        }

        // Apply updates to the specific shot
        mission.shots[sIdx] = { ...mission.shots[sIdx], ...updates };
        mission.updatedAt = new Date().toISOString();

        // Save the entire missions array back (this is safe on the server side as we aren't limited by request payload size here)
        await setRow(key, missions);

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Save Shot Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
