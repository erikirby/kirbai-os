import { NextRequest, NextResponse } from 'next/server';
import { getMissionByIdAsync, saveMissionAsync, getTelemetryAsync } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { missionId, mode, shotId, updates } = await req.json();

        if (!missionId || !shotId || !updates) {
            return NextResponse.json({ error: "Missing missionId, shotId, or updates" }, { status: 400 });
        }

        const mission = await getMissionByIdAsync(missionId);
        if (!mission) {
            return NextResponse.json({ error: "Mission not found in vault" }, { status: 404 });
        }

        const sIdx = mission.shots.findIndex((s: any) => s.id === shotId);
        if (sIdx === -1) {
            return NextResponse.json({ error: "Shot not found in mission" }, { status: 404 });
        }

        // Apply updates to the specific shot
        mission.shots[sIdx] = { ...mission.shots[sIdx], ...updates };
        mission.updatedAt = new Date().toISOString();

        // 3. Save via the hardened Dual-Key helper
        await saveMissionAsync(mission);

        // 4. Fetch fresh telemetry
        const telemetry = await getTelemetryAsync();
        return NextResponse.json({ success: true, mission, telemetry });

    } catch (e: any) {
        console.error("Save Shot Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
