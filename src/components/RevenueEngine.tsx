"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadCloud, RefreshCw, Loader2, TrendingUp, DollarSign, Zap, Film, AlertTriangle, X } from "lucide-react";
import {
    parseCSV, detectFileType, parseDistroKid, parseMetaPosts, computeRevenueAnalysis,
    type RevenueAnalysis, type SourceFileType, type LedgerRow, type VideoRow,
} from "@/lib/revenue";

interface RevenueEngineProps {
    mode: "kirbai" | "factory";
}

interface LoadedFile {
    name: string;
    type: SourceFileType;
    rows: string[][];
}

const fmtUSD = (n: number, digits = 0) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits });
const fmtNum = (n: number) => n.toLocaleString("en-US");

async function readFileSmart(file: File): Promise<string> {
    // DistroKid exports are often UTF-16LE; Meta exports are UTF-8 with BOM.
    const buffer = await file.arrayBuffer();
    const view = new Uint8Array(buffer);
    if (view.length >= 2 && view[0] === 0xff && view[1] === 0xfe) {
        return new TextDecoder("utf-16le").decode(buffer);
    }
    return new TextDecoder("utf-8").decode(buffer);
}

const TYPE_LABEL: Record<SourceFileType, string> = {
    distrokid: "DistroKid Ledger",
    facebook: "Facebook Posts",
    instagram: "Instagram Posts",
    unknown: "Unrecognized",
};

export default function RevenueEngine({ mode }: RevenueEngineProps) {
    const [files, setFiles] = useState<LoadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isComputing, setIsComputing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<RevenueAnalysis | null>(null);
    const [showAllSongs, setShowAllSongs] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/revenue-engine?mode=${mode}`);
                const data = await res.json();
                // Only accept a well-formed analysis — malformed stored data must not crash the render
                const a = data.analysis;
                if (a && a.kpis && Array.isArray(a.monthlyTrend) && Array.isArray(a.songs) && Array.isArray(a.stores) && Array.isArray(a.opportunities) && Array.isArray(a.durationBuckets) && Array.isArray(a.unmatchedVideos)) {
                    setAnalysis(a);
                }
            } catch { /* cold start is fine */ }
        })();
    }, [mode]);

    const ingestFiles = useCallback(async (list: FileList | File[]) => {
        setError(null);
        const next: LoadedFile[] = [];
        for (const file of Array.from(list)) {
            if (!/\.(csv|tsv)$/i.test(file.name)) continue;
            try {
                const text = await readFileSmart(file);
                const rows = parseCSV(text);
                if (rows.length < 2) continue;
                next.push({ name: file.name, type: detectFileType(rows[0]), rows });
            } catch {
                setError(`Could not read ${file.name}`);
            }
        }
        if (next.length === 0 && list.length > 0) setError("No readable .csv/.tsv files found.");
        setFiles((prev) => {
            // newest file of each type wins
            const merged = [...prev];
            for (const f of next) {
                const idx = merged.findIndex((m) => m.type === f.type && f.type !== "unknown");
                if (idx >= 0) merged[idx] = f; else merged.push(f);
            }
            return merged;
        });
    }, []);

    const compute = async () => {
        const dk = files.find((f) => f.type === "distrokid");
        if (!dk) { setError("A DistroKid earnings export is required."); return; }
        setIsComputing(true);
        setError(null);
        try {
            const ledger: LedgerRow[] = parseDistroKid(dk.rows);
            const videos: VideoRow[] = [];
            for (const f of files) {
                if (f.type === "facebook") videos.push(...parseMetaPosts(f.rows, "facebook"));
                if (f.type === "instagram") videos.push(...parseMetaPosts(f.rows, "instagram"));
            }
            const result = computeRevenueAnalysis(
                ledger,
                videos,
                files.map((f) => ({ type: f.type, name: f.name, rows: f.rows.length - 1 }))
            );
            setAnalysis(result);
            setIsSaving(true);
            const res = await fetch("/api/revenue-engine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode, analysis: result }),
            });
            if (!res.ok) {
                let detail = "";
                try { detail = (await res.json()).error || ""; } catch { /* non-JSON response */ }
                setError(`Computed OK, but saving failed (${res.status}${detail ? `: ${detail.slice(0, 140)}` : ""}). Results shown are not persisted.`);
            }
        } catch (err: any) {
            setError(err?.message || "Computation failed.");
        } finally {
            setIsComputing(false);
            setIsSaving(false);
        }
    };

    const k = analysis?.kpis;
    const maxTrend = analysis ? Math.max(...analysis.monthlyTrend.map((m) => m.dkEarnings + m.fbEarnings), 1) : 1;
    const visibleSongs = analysis ? (showAllSongs ? analysis.songs : analysis.songs.slice(0, 12)) : [];

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-accent font-bold tracking-[0.4em] uppercase opacity-80">Performance</span>
                    <h2 className="text-3xl font-bold tracking-tighter text-white uppercase">Revenue Engine</h2>
                    <p className="text-[11px] text-neutral-500 max-w-xl">
                        Deterministic video → song → revenue attribution. Drop your DistroKid ledger plus Meta post exports (FB & IG). No AI summaries — real math, persisted monthly.
                    </p>
                </div>
                {analysis && (
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
                        Computed {new Date(analysis.computedAt).toLocaleString()}
                    </span>
                )}
            </div>

            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); ingestFiles(e.dataTransfer.files); }}
                className={`rounded-2xl border border-dashed p-6 transition-all backdrop-blur-md ${isDragging ? "border-accent bg-accent/10" : "border-border/20 bg-surface/30"}`}
            >
                <div className="flex flex-wrap items-center gap-4">
                    <UploadCloud className="w-6 h-6 text-accent shrink-0" />
                    <div className="flex-1 min-w-[220px]">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/80">Drop exports here (.csv / .tsv)</p>
                        <p className="text-[10px] text-neutral-500">DistroKid bank details export (required) · Meta Business Suite post exports for FB + IG (recommended)</p>
                    </div>
                    <label className="cursor-pointer px-4 py-2 rounded-full bg-surface/60 border border-border/20 text-[10px] font-bold uppercase tracking-widest text-foreground/70 hover:border-accent/40 hover:text-white transition-all">
                        Browse
                        <input type="file" multiple accept=".csv,.tsv" className="hidden"
                            onChange={(e) => e.target.files && ingestFiles(e.target.files)} />
                    </label>
                    <button
                        onClick={compute}
                        disabled={isComputing || !files.some((f) => f.type === "distrokid")}
                        className="flex items-center gap-2 px-6 py-2 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 hover:scale-105 transition-all shadow-lg"
                    >
                        {isComputing || isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        {isSaving ? "Saving" : "Compute"}
                    </button>
                </div>
                {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        {files.map((f, i) => (
                            <span key={i} className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${f.type === "unknown" ? "border-red-500/40 text-red-400" : "border-accent/30 text-accent bg-accent/10"}`}>
                                {TYPE_LABEL[f.type]} · {f.name.length > 34 ? f.name.slice(0, 34) + "…" : f.name}
                                <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="hover:text-white"><X className="w-3 h-3" /></button>
                            </span>
                        ))}
                    </div>
                )}
                {error && (
                    <p className="flex items-center gap-2 mt-3 text-[10px] text-red-400 font-bold uppercase tracking-widest"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>
                )}
            </div>

            {!analysis && (
                <div className="rounded-2xl border border-border/10 bg-surface/20 p-10 text-center text-[11px] text-neutral-500 uppercase tracking-widest">
                    No analysis stored yet. Drop your exports and hit Compute.
                </div>
            )}

            {analysis && k && (
                <>
                    {/* KPI row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: "Lifetime Revenue", value: fmtUSD(k.lifetimeTotal), sub: `${fmtUSD(k.dkLifetime)} streaming · ${fmtUSD(k.fbLifetime)} FB content`, icon: DollarSign },
                            { label: "Run Rate / Month", value: fmtUSD(k.runRateMonthly), sub: `Last complete month: ${k.latestCompleteMonth ?? "—"}`, icon: TrendingUp },
                            { label: "Total Streams", value: fmtNum(k.totalStreams), sub: `${fmtNum(k.totalVideoViews)} video views tracked`, icon: Zap },
                            { label: "Blended $ / 1K Views", value: k.blendedPer1kViews !== null ? fmtUSD(k.blendedPer1kViews, 2) : "—", sub: "All revenue ÷ all video views", icon: Film },
                        ].map((c, i) => (
                            <div key={i} className="rounded-2xl bg-surface/40 backdrop-blur-md border border-border/10 p-5 flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-neutral-500">
                                    <c.icon className="w-3.5 h-3.5 text-accent" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.25em]">{c.label}</span>
                                </div>
                                <span className="text-2xl font-bold tracking-tight text-white">{c.value}</span>
                                <span className="text-[9px] text-neutral-500 uppercase tracking-widest">{c.sub}</span>
                            </div>
                        ))}
                    </div>
                    {k.partialMonth && (
                        <p className="text-[9px] text-neutral-500 uppercase tracking-widest -mt-3 px-1">
                            ⚠ {k.partialMonth} is the newest sale month — DistroKid reporting lags ~2 months, treat it as incomplete.
                        </p>
                    )}

                    {/* Monthly trend */}
                    <div className="rounded-2xl bg-surface/40 backdrop-blur-md border border-border/10 p-5">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/70 mb-4">Monthly Revenue — <span className="text-accent">Streaming</span> + <span className="text-sky-400">FB Content</span></h3>
                        <div className="flex items-end gap-1 h-36">
                            {analysis.monthlyTrend.map((m) => {
                                const total = m.dkEarnings + m.fbEarnings;
                                const hDk = (m.dkEarnings / maxTrend) * 100;
                                const hFb = (m.fbEarnings / maxTrend) * 100;
                                return (
                                    <div key={m.month} className="flex-1 flex flex-col justify-end items-center gap-0.5 group relative min-w-[10px]">
                                        <div className="absolute -top-7 hidden group-hover:block bg-background border border-border rounded-lg px-2 py-1 text-[9px] font-mono text-white whitespace-nowrap z-10">
                                            {m.month}: {fmtUSD(total)}
                                        </div>
                                        <div className="w-full rounded-t-sm bg-sky-400/80" style={{ height: `${hFb}%` }} />
                                        <div className="w-full rounded-t-sm bg-accent" style={{ height: `${hDk}%` }} />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-2 text-[8px] font-mono text-neutral-600 uppercase">
                            <span>{analysis.monthlyTrend[0]?.month}</span>
                            <span>{analysis.monthlyTrend[analysis.monthlyTrend.length - 1]?.month}</span>
                        </div>
                    </div>

                    {/* Opportunity queue */}
                    <div className="rounded-2xl bg-surface/40 backdrop-blur-md border border-accent/20 p-5">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-1">Revenue vs. Video Coverage</h3>
                        <p className="text-[10px] text-neutral-500 mb-4">Songs ranked by earnings against how little matched video support they have. Data only — conclusions are yours.</p>
                        <div className="flex flex-col gap-2">
                            {analysis.opportunities.map((o, i) => (
                                <div key={o.title} className="flex items-start gap-4 rounded-xl bg-background/40 border border-border/10 p-4">
                                    <span className="text-xl font-black text-accent/60 w-8 shrink-0">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-baseline gap-x-3">
                                            <span className="text-sm font-bold text-white">{o.title}</span>
                                            <span className="text-[9px] font-mono text-neutral-500 uppercase">
                                                {fmtUSD(o.lifetimeEarnings)} lifetime · {fmtUSD(o.recentEarnings)} last quarter · {o.daysSinceLastVideo === null ? "no video ever" : `${o.daysSinceLastVideo}d since video`}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-neutral-400 mt-1">{o.reason}</p>
                                    </div>
                                    <span className="text-[9px] font-mono text-accent shrink-0">SCORE {o.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Song table */}
                    <div className="rounded-2xl bg-surface/40 backdrop-blur-md border border-border/10 p-5 overflow-x-auto">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/70 mb-4">Song Economics</h3>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-500 border-b border-border/10">
                                    <th className="py-2 pr-3">Song</th>
                                    <th className="py-2 pr-3 text-right">Streams</th>
                                    <th className="py-2 pr-3 text-right">Earnings</th>
                                    <th className="py-2 pr-3 text-right">Last Qtr</th>
                                    <th className="py-2 pr-3 text-right">Videos</th>
                                    <th className="py-2 pr-3 text-right">Video Views</th>
                                    <th className="py-2 pr-3 text-right">$ / 1K Views</th>
                                    <th className="py-2 text-right">Last Video</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleSongs.map((s) => (
                                    <tr key={s.title} className="border-b border-border/5 text-[11px] text-neutral-300 hover:bg-white/[0.02]">
                                        <td className="py-2 pr-3 font-bold text-white max-w-[240px] truncate">{s.title}</td>
                                        <td className="py-2 pr-3 text-right font-mono">{fmtNum(s.streams)}</td>
                                        <td className="py-2 pr-3 text-right font-mono text-accent">{fmtUSD(s.earnings)}</td>
                                        <td className="py-2 pr-3 text-right font-mono">{fmtUSD(s.recentEarnings)}</td>
                                        <td className="py-2 pr-3 text-right font-mono">{s.videoCount || "—"}</td>
                                        <td className="py-2 pr-3 text-right font-mono">{s.videoViews ? fmtNum(s.videoViews) : "—"}</td>
                                        <td className="py-2 pr-3 text-right font-mono">{s.earningsPer1kVideoViews !== null ? fmtUSD(s.earningsPer1kVideoViews, 2) : "—"}</td>
                                        <td className="py-2 text-right font-mono text-neutral-500">{s.lastVideoDate ? new Date(s.lastVideoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "never"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {analysis.songs.length > 12 && (
                            <button onClick={() => setShowAllSongs(!showAllSongs)} className="mt-3 text-[9px] font-bold uppercase tracking-widest text-accent hover:text-white transition-colors">
                                {showAllSongs ? "Show top 12" : `Show all ${analysis.songs.length} songs`}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Store rates */}
                        <div className="rounded-2xl bg-surface/40 backdrop-blur-md border border-border/10 p-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/70 mb-4">Per-Stream Rates by Store</h3>
                            <div className="flex flex-col gap-2">
                                {analysis.stores.slice(0, 8).map((s) => (
                                    <div key={s.store} className="flex items-center justify-between text-[11px]">
                                        <span className="text-neutral-300 font-bold">{s.store}</span>
                                        <span className="font-mono text-neutral-500">{fmtNum(s.streams)} · <span className="text-accent">{fmtUSD(s.earnings)}</span> · ${s.perStream.toFixed(4)}/ea</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Duration economics */}
                        <div className="rounded-2xl bg-surface/40 backdrop-blur-md border border-border/10 p-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/70 mb-4">Format Economics — FB Earnings by Video Length</h3>
                            <div className="flex flex-col gap-2">
                                {analysis.durationBuckets.filter((b) => b.posts > 0).map((b) => {
                                    const max = Math.max(...analysis.durationBuckets.map((x) => x.earningsPerPost), 0.01);
                                    return (
                                        <div key={b.label} className="flex items-center gap-3 text-[11px]">
                                            <span className="w-16 shrink-0 font-bold text-neutral-300">{b.label}</span>
                                            <div className="flex-1 h-2 rounded-full bg-background/60 overflow-hidden">
                                                <div className="h-full bg-accent rounded-full" style={{ width: `${(b.earningsPerPost / max) * 100}%` }} />
                                            </div>
                                            <span className="font-mono text-neutral-500 shrink-0">{fmtUSD(b.earningsPerPost, 2)}/post · {b.posts} posts</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-[9px] text-neutral-600 uppercase tracking-widest mt-3">Longer videos earn more per post — length is the revenue lever.</p>
                        </div>
                    </div>

                    {/* Unmatched videos */}
                    {analysis.unmatchedVideos.length > 0 && (
                        <div className="rounded-2xl bg-surface/20 border border-border/10 p-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-2">Unattributed Videos ({analysis.unmatchedVideos.length})</h3>
                            <p className="text-[10px] text-neutral-600 mb-3">No song title detected in caption — these views earn FB content money but drive zero attributable streams. Consider always naming the song in the caption.</p>
                            <div className="flex flex-col gap-1">
                                {analysis.unmatchedVideos.slice(0, 8).map((v, i) => (
                                    <div key={i} className="flex items-center gap-3 text-[10px] text-neutral-500">
                                        <span className="font-mono uppercase w-8 shrink-0">{v.platform === "facebook" ? "FB" : "IG"}</span>
                                        <span className="font-mono shrink-0">{fmtNum(v.views)} views</span>
                                        <span className="truncate">{v.caption || "(no caption)"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
