import { NextResponse } from 'next/server';
import { getRow, setRow, slimMission } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { secret } = body;

        if (secret !== 'kirbai_migrate_key') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const stats = { kirbai: 0, factory: 0 };
        const modes = ['kirbai', 'factory'] as const;

        for (const mode of modes) {
            const key = mode === 'factory' ? 'missions_factory' : 'missions_kirbai';
            const missions = await getRow(key) || [];
            
            console.log(`[migrate] Migrating ${missions.length} missions for mode: ${mode}`);
            
            for (const mission of missions) {
                // 1. Save Full record to individual key
                await setRow(`mission_${mission.id}`, mission);
                stats[mode]++;
            }

            // 2. Save Slimmed Index
            const slimIndex = missions.map((m: any) => slimMission(m));
            await setRow(key, slimIndex);
            console.log(`[migrate] Slimmed index saved for mode: ${mode}`);
        }

        return NextResponse.json({ 
            success: true, 
            message: "Infrastructure migration complete. Missions are now stored individually.",
            stats 
        });
    } catch (e: any) {
        console.error('Migration fail:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
