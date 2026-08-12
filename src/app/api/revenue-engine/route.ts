import { getRow, setRow, setFinanceAnalysisAsync, getKirbaiStatsBaseline } from "@/lib/db";
import { NextResponse } from "next/server";

// Revenue Engine persistence. Analysis is computed client-side (deterministic math,
// no AI) and stored here per-mode so it survives sessions.

const key = (mode: string) => `revenue_engine_${mode === "factory" ? "factory" : "kirbai"}`;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode") || "kirbai";
        let stored = await getRow(key(mode));
        if (!stored && mode === 'kirbai') {
            const baseline = getKirbaiStatsBaseline();
            stored = {
                kpis: {
                    totalRevenue: baseline.distroKid.totals.earningsUsd,
                    totalStreams: baseline.distroKid.totals.quantity,
                    effectiveCpm: (baseline.distroKid.totals.earningsUsd / (baseline.distroKid.totals.quantity || 1)) * 1000,
                },
                byStore: baseline.distroKid.topStores.map((s: any) => ({
                    store: s.name,
                    earnings: s.earningsUsd,
                    streams: s.quantity,
                    rate: s.quantity ? s.earningsUsd / s.quantity : 0
                })),
                bySong: baseline.distroKid.topTracks.map((t: any) => ({
                    title: t.name,
                    earnings: t.earningsUsd,
                    streams: t.quantity
                })),
                savedAt: baseline.generatedAt || new Date().toISOString()
            };
        }
        return NextResponse.json({ analysis: stored });
    } catch {
        return NextResponse.json({ error: "Failed to retrieve stored analysis" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mode, analysis } = body;
        if (!analysis || !analysis.kpis) {
            return NextResponse.json({ error: "No analysis payload provided." }, { status: 400 });
        }

        const timestamp = new Date().toISOString();
        const payload = {
            ...analysis,
            savedAt: timestamp
        };

        await setRow(key(mode || "kirbai"), payload);

        // Auto-sync Finance Analysis store if DistroKid data is present
        if (analysis.bySong && analysis.byStore) {
            const financePayload = {
                totals: { revenue: analysis.kpis.totalRevenue, streams: analysis.kpis.totalStreams },
                platforms: analysis.byStore.map((s: any) => ({
                    store: s.store,
                    revenue: s.earnings,
                    streams: s.streams,
                    rate: s.rate,
                    reportingLatency: s.lastReportDate && s.lastSaleMonth ? {
                        reportDate: s.lastReportDate,
                        saleMonth: s.lastSaleMonth
                    } : null
                })),
                tracks: analysis.bySong.map((t: any) => ({
                    title: t.title,
                    revenue: t.earnings,
                    streams: t.streams
                })),
                advice: `<p>Auto-synced from latest Revenue Engine DistroKid export (${new Date().toLocaleDateString()}). Total Revenue: $${(analysis.kpis.totalRevenue || 0).toFixed(2)} across ${(analysis.kpis.totalStreams || 0).toLocaleString()} streams.</p>`,
                persistedAt: timestamp
            };
            await setFinanceAnalysisAsync(financePayload);
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to save analysis" }, { status: 500 });
    }
}
