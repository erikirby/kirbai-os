import { NextRequest, NextResponse } from 'next/server';
import { getMissionByIdAsync, saveMissionAsync, getTelemetryAsync } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { missionId, mode, updates } = await req.json();

        if (!missionId || !mode || !updates) {
            return NextResponse.json({ error: "Missing missionId, mode, or updates" }, { status: 400 });
        }

        let mission = await getMissionByIdAsync(missionId);
        
        if (!mission) {
            console.warn(`Mission individual record missing for ${missionId}. Attempting index recovery...`);
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

        // Apply top-level updates safely
        const updatedMission = { ...mission, ...updates };
        updatedMission.updatedAt = new Date().toISOString();
        
        // saveMissionAsync now handles automatic asset extraction (Defragmentation)
        await saveMissionAsync(updatedMission as any);

        // 4. Fetch fresh telemetry
        const telemetry = await getTelemetryAsync();
        return NextResponse.json({ success: true, mission: updatedMission, telemetry });
    } catch (e: any) {
        console.error("Save Mission Delta Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
