import { NextResponse } from 'next/server';
import { getRow, getRoadmapAsync } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [allProjects, roadmap, lore] = await Promise.all([
            getRow('vault_projects'),
            getRoadmapAsync('kirbai'),
            getRow('lore_kirbai'),
        ]);

        // Filter to Kirbai-alias projects only
        const projects = (allProjects ?? []).filter(
            (p: { alias: string }) => p.alias === 'Kirbai'
        );

        // Active phases only (exclude Archived)
        const activePhases = (roadmap.phases ?? []).filter(
            (phase: { status: string }) => phase.status !== 'Archived'
        );

        const currentEra = projects.find((p: { status: string }) => p.status === 'Primary') ?? null;

        const KirbaiContext = {
            current_era: currentEra,
            projects,
            roadmap: { phases: activePhases },
            lore: lore ?? { nodes: [], edges: [], history: [] },
        };

        return NextResponse.json(KirbaiContext);
    } catch (e: any) {
        console.error('[context/kirbai] Error:', e);
        return NextResponse.json({ error: 'Failed to assemble Kirbai context' }, { status: 500 });
    }
}
