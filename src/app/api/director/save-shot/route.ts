import { NextRequest, NextResponse } from 'next/server';
import { getMissionByIdAsync, saveMissionAsync, getTelemetryAsync } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { missionId, mode, shotId, updates } = await req.json();

        if (!missionId || !shotId || !updates) {
            return NextResponse.json({ error: "Missing missionId, shotId, or updates" }, { status: 400 });
        }

        let mission = await getMissionByIdAsync(missionId);
        if (!mission) {
            console.warn(`Mission individual record missing for ${missionId} during save-shot. Attempting index recovery...`);
            const { getMissionsAsync } = await import("@/lib/db");
            const allMissions = await getMissionsAsync(mode);
            mission = allMissions.find((m: any) => m.id === missionId) || null;
            
            if (!mission) {
                return NextResponse.json({ 
                    error: `Mission not found in vault! (ID: ${missionId})`,
                    debug: { requestedId: missionId }
                }, { status: 404 });
            }
            console.log(`Auto-healed mission record from index for ${missionId}`);
        }

        const sIdx = mission.shots.findIndex((s: any) => s.id === shotId);
        if (sIdx === -1) {
            return NextResponse.json({ error: "Shot not found in mission" }, { status: 404 });
        }

        // Apply updates to the specific shot
        mission.shots[sIdx] = { ...mission.shots[sIdx], ...updates };
        mission.updatedAt = new Date().toISOString();
        
        // 3. Save via the hardened Dual-Key helper (handles automatic asset extraction)
        await saveMissionAsync(mission);

        // 4. Fetch fresh telemetry
        const telemetry = await getTelemetryAsync();
        return NextResponse.json({ success: true, mission, telemetry });

    } catch (e: any) {
        console.error("Save Shot Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
