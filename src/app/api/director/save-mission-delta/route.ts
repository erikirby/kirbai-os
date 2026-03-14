import { NextRequest, NextResponse } from 'next/server';
import { getMissionByIdAsync, saveMissionAsync, getTelemetryAsync } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { missionId, mode, updates } = await req.json();

        if (!missionId || !mode || !updates) {
            return NextResponse.json({ error: "Missing missionId, mode, or updates" }, { status: 400 });
        }

        const mission = await getMissionByIdAsync(missionId);
        if (!mission) {
            console.error(`Mission lookup failed for ID: ${missionId}. Tried key: mission_${missionId}`);
            return NextResponse.json({ 
                error: `Mission not found in vault! (ID: ${missionId})`,
                debug: { requestedId: missionId, triedKey: `mission_${missionId}` }
            }, { status: 404 });
        }

        // Apply top-level updates safely
        const updatedMission = { ...mission, ...updates };
        
        // Ensure shots wasn't accidentally nulled out 
        if (!updatedMission.shots) {
             updatedMission.shots = mission.shots;
        }

        await saveMissionAsync(updatedMission as any);

        // 4. Fetch fresh telemetry
        const telemetry = await getTelemetryAsync();
        return NextResponse.json({ success: true, mission: updatedMission, telemetry });
    } catch (e: any) {
        console.error("Save Mission Delta Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
