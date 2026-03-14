import { NextRequest, NextResponse } from 'next/server';
import { saveMissionAsync } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        console.log("Starting STORAGE STRESS TEST...");
        
        // Create a massive fake mission
        // 10 shots, each with a 500KB fake thumbnail
        const fakeImage = "data:image/jpeg;base64," + "A".repeat(500 * 1024);
        
        const testMission: any = {
            id: "test-stress-" + Date.now(),
            mode: "kirbai",
            title: "STRESS TEST MISSION",
            shots: Array.from({ length: 10 }).map((_, i) => ({
                id: `shot-${i}`,
                visualDescription: "Stress test shot",
                thumbnailUrl: fakeImage
            })),
            references: [fakeImage, fakeImage], // 2 more big ones
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const startTime = Date.now();
        await saveMissionAsync(testMission);
        const duration = Date.now() - startTime;

        console.log(`STRESS TEST SUCCESS: Saved 6MB payload in ${duration}ms`);

        return NextResponse.json({ 
            success: true, 
            message: `Stress test passed! Saved 12 independent assets and 1 slim mission record in ${duration}ms.`,
            durationMs: duration
        });
    } catch (e: any) {
        console.error("STRESS TEST FAILED:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
