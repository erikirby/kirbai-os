
import { NextRequest, NextResponse } from 'next/server';
import { getRow } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const kirbaiIndex = await getRow('missions_kirbai');
        const factoryIndex = await getRow('missions_factory');
        
        let sampleMission = null;
        if (kirbaiIndex && kirbaiIndex.length > 0) {
            const id = kirbaiIndex[0].id;
            sampleMission = {
                id,
                record: await getRow(`mission_${id}`),
                altRecord: await getRow(id)
            };
        }

        return NextResponse.json({
            kirbaiIndexLength: kirbaiIndex?.length || 0,
            factoryIndexLength: factoryIndex?.length || 0,
            sampleMission,
            firstFiveKirbai: kirbaiIndex?.slice(0, 5).map((m: any) => m.id) || []
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
