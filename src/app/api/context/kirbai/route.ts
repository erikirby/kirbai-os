import { NextResponse } from 'next/server';
import {
    getBrandIdentityAsync,
    getFinanceAnalysisAsync,
    getKirbaiDistroKidCatalog,
    getPulseStateAsync,
    getRoadmapAsync,
    getRow,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [identity, allProjects, roadmap, lore, social, revenueEngine, legacyFinance] = await Promise.all([
            getBrandIdentityAsync('kirbai'),
            getRow('vault_projects'),
            getRoadmapAsync('kirbai'),
            getRow('lore_kirbai'),
            getPulseStateAsync('kirbai'),
            getRow('revenue_engine_kirbai'),
            getFinanceAnalysisAsync(),
        ]);

        // Filter to Kirbai-alias projects only
        const projects = (allProjects ?? [])
            .filter((p: { alias: string }) => p.alias === 'Kirbai')
            .map((p: Record<string, unknown>) => ({
                ...p,
                coverArt: p.coverArt ? '[IMAGE_DATA_STRIPPED_FOR_CONTEXT]' : null,
            }));

        // Active phases only (exclude Archived)
        const activePhases = (roadmap.phases ?? []).filter(
            (phase: { status: string }) => phase.status !== 'Archived'
        );

        const currentEra = projects.find((p: { status: string }) => p.status === 'Primary') ?? null;
        const freshnessRule = (identity?.sourceOfTruth as { freshnessRule?: string } | undefined)?.freshnessRule;

        const revenue = revenueEngine
            ? {
                computedAt: revenueEngine.computedAt,
                files: revenueEngine.files,
                kpis: revenueEngine.kpis,
                topStores: revenueEngine.stores?.slice(0, 10) ?? [],
                topSongs: revenueEngine.songs?.slice(0, 15) ?? [],
                opportunities: revenueEngine.opportunities?.slice(0, 10) ?? [],
            }
            : legacyFinance
                ? {
                    computedAt: legacyFinance.persistedAt,
                    totals: legacyFinance.totals,
                    topPlatforms: legacyFinance.platforms?.slice(0, 10) ?? [],
                    topTracks: legacyFinance.tracks?.slice(0, 15) ?? [],
                }
                : null;

        const KirbaiContext = {
            identity,
            current_era: currentEra,
            projects,
            roadmap: { phases: activePhases },
            lore: lore ?? { nodes: [], edges: [], history: [] },
            current_performance: {
                social: social ?? null,
                distroKid: revenue,
            },
            distribution_catalog: getKirbaiDistroKidCatalog(),
            freshness: {
                rule: freshnessRule,
                socialUpdatedAt: social?.lastUpdated ?? null,
                distributionUpdatedAt: revenue?.computedAt ?? null,
            },
        };

        return NextResponse.json(KirbaiContext);
    } catch (e) {
        console.error('[context/kirbai] Error:', e);
        return NextResponse.json({ error: 'Failed to assemble Kirbai context' }, { status: 500 });
    }
}
