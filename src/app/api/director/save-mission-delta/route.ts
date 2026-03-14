import { NextRequest, NextResponse } from 'next/server';
import { getRow, setRow } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { missionId, mode, updates } = await req.json();

        if (!missionId || !mode || !updates) {
            return NextResponse.json({ error: "Missing missionId, mode, or updates" }, { status: 400 });
        }

        const key = mode === 'factory' ? 'missions_factory' : 'missions_kirbai';
        const missions = await getRow(key) || [];
        const idx = missions.findIndex((m: any) => m.id === missionId);

        if (idx === -1) {
            return NextResponse.json({ error: "Mission not found" }, { status: 404 });
        }

        // Apply top-level updates (avoiding deep merges that might accidentally overwrite shots if not careful)
        const updatedMission = { ...missions[idx], ...updates };
        
        // Ensure shots wasn't accidentally nulled out if updates didn't include it
        if (!updatedMission.shots) {
             updatedMission.shots = missions[idx].shots;
        }

        missions[idx] = updatedMission;
        await setRow(key, missions);

        return NextResponse.json({ success: true, mission: updatedMission });
    } catch (e: any) {
        console.error("Save Mission Delta Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
