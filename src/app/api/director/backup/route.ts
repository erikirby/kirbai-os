import { NextRequest, NextResponse } from 'next/server';
import { backupMissionAsync, restoreMissionFromBackupAsync } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const { missionId, action } = await req.json();

        if (!missionId) {
            return NextResponse.json({ error: "Missing missionId" }, { status: 400 });
        }

        if (action === "restore") {
            await restoreMissionFromBackupAsync(missionId);
            return NextResponse.json({ success: true, message: "Restored from snapshot" });
        }

        // Default: backup
        await backupMissionAsync(missionId);
        return NextResponse.json({ success: true, message: "Snapshot created" });

    } catch (e: any) {
        console.error("Backup/Restore Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
