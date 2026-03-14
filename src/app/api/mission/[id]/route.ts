import { NextRequest, NextResponse } from 'next/server';
import { getMissionByIdAsync } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        let mission = await getMissionByIdAsync(id);
        
        if (!mission) {
            console.warn(`Mission individual record missing for ${id} during GET. Attempting index recovery...`);
            const { getMissionsAsync } = await import("@/lib/db");
            // Try kirbai mode first as it's the default
            let all = await getMissionsAsync('kirbai');
            mission = all.find((m: any) => m.id === id) || null;
            
            if (!mission) {
                // Try factory mode
                all = await getMissionsAsync('factory');
                mission = all.find((m: any) => m.id === id) || null;
            }
            
            if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
            
            console.log(`Auto-healed mission record from index for ${id}`);
        }

        return NextResponse.json({ success: true, data: mission });
    } catch (e: any) {
        console.error("Fetch Mission ID Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
