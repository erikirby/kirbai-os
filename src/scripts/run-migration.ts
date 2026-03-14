import { getRow, setRow, slimMission } from '../lib/db';

async function run() {
    console.log("🚀 STARTING INFRASTRUCTURE MIGRATION...");
    const modes = ['kirbai', 'factory'] as const;
    
    for (const mode of modes) {
        const key = mode === 'factory' ? 'missions_factory' : 'missions_kirbai';
        const missions = await getRow(key) || [];
        console.log(`\n📦 MODE: ${mode} (${missions.length} missions)`);
        
        for (const mission of missions) {
            console.log(`  - Migrating: ${mission.title} [${mission.id}]`);
            // 1. Save Full record to individual key
            await setRow(`mission_${mission.id}`, mission);
        }

        // 2. Save Slimmed Index
        const slimIndex = missions.map((m: any) => slimMission(m));
        await setRow(key, slimIndex);
        console.log(`✅ ${mode} index slimmed and saved.`);
    }
    
    console.log("\n✨ MIGRATION COMPLETE. System is now running on Ghost-Proofed infrastructure.");
    process.exit(0);
}

run().catch(e => {
    console.error("❌ MIGRATION FAILED:", e);
    process.exit(1);
});
