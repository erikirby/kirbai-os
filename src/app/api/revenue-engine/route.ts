import { getRow, setRow, setFinanceAnalysisAsync, getKirbaiStatsBaseline } from "@/lib/db";
import { NextResponse } from "next/server";
import { revenueToFinance } from "@/lib/finance-sync";

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
        const financePayload = revenueToFinance(payload);
        if (financePayload) {
            await setFinanceAnalysisAsync(financePayload, mode || 'kirbai');
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to save analysis" }, { status: 500 });
    }
}
