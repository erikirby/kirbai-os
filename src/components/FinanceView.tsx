"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "@/components/Icons";

interface FinanceViewProps {
    mode: "kirbai" | "factory";
}

export default function FinanceView({ mode }: FinanceViewProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResults, setAnalysisResults] = useState<any>(null);

    useEffect(() => {
        const loadStoredData = async () => {
            try {
                const res = await fetch("/api/analyze-finance");
                const data = await res.json();
                if (data.analysis) {
                    setAnalysisResults(data.analysis);
                }
            } catch (err) {
                console.error("Failed to load stored finance data:", err);
            }
        };
        loadStoredData();
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith(".tsv")) {
            setAttachedFile(file);
        }
    };

    const analyzeData = async () => {
        if (!attachedFile) return;
        setIsLoading(true);
        try {
            // DistroKid TSVs are notoriously encoded in UTF-16LE. A standard await file.text()
            // will often read it as garbled chinese characters. We must explicitly handle encoding.
            const buffer = await attachedFile.arrayBuffer();

            // Detect UTF-16 LE BOM (FF FE)
            const view = new Uint8Array(buffer);
            let text = "";
            let isUTF16LE = view.length >= 2 && view[0] === 0xFF && view[1] === 0xFE;

            if (isUTF16LE) {
                const decoder = new TextDecoder('utf-16le');
                text = decoder.decode(buffer);
            } else {
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(buffer);
            }

            const res = await fetch("/api/analyze-finance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tsv: text }),
            });
            const data = await res.json();

            if (data.error) {
                console.error("Finance Analysis Error:", data.error);
                alert("Finance Import Error: " + data.error);
                return;
            }

            setAnalysisResults(data.analysis);
        } catch (err) {
            console.error(err);
            alert("An unexpected error occurred during import.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-12">
            <div className="flex justify-between items-end relative ml-1">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-black tracking-tighter text-[var(--fg-color)] uppercase italic">Financial Analytics</h2>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.5em] font-black">Performance Matrix_V4.1</p>
                </div>
                {analysisResults?.persistedAt && (
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest font-bold">Data Current As Of:</span>
                        <span className="text-[11px] font-black text-accent uppercase tracking-widest italic">{new Date(analysisResults.persistedAt).toLocaleString()}</span>
                    </div>
                )}
            </div>

            {!analysisResults ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative group flex flex-col items-center justify-center p-24 border-2 border-dashed transition-all duration-1000 squircle specular-reflect shadow-2xl overflow-hidden ${isDragging ? "border-accent bg-accent/5 backdrop-blur-xl" : "border-border/10 bg-surface/20 hover:border-accent/30 hover:bg-surface/30"
                        }`}
                >
                    {attachedFile ? (
                        <div className="flex flex-col items-center gap-10 animate-in zoom-in-95 duration-700 relative z-10">
                            <div className="flex items-center gap-6 bg-accent/15 p-6 rounded-[2.5rem] border border-accent/20 shadow-2xl specular-reflect transform hover:scale-105 transition-transform duration-500">
                                <div className="w-16 h-16 bg-accent rounded-3xl flex items-center justify-center shadow-[0_10px_40px_rgba(255,51,102,0.4)]">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12h6m-6 4h12M3 21h18M3 10h18M3 7l9-4 9 4" /></svg>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-base font-black text-[var(--fg-color)] tracking-tighter uppercase italic">{attachedFile.name}</span>
                                    <span className="text-[10px] font-mono text-accent font-bold uppercase tracking-widest">Awaiting_Synthesis_Command</span>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <button
                                    onClick={analyzeData}
                                    disabled={isLoading}
                                    className="px-12 py-5 bg-accent hover:bg-accent/90 text-white font-black uppercase tracking-[0.5em] text-[11px] squircle shadow-[0_20px_60px_rgba(255,51,102,0.3)] transition-all active:scale-95 disabled:opacity-20"
                                >
                                    {isLoading ? "Analyzing..." : "Analyze"}
                                </button>
                                <button
                                    onClick={() => setAttachedFile(null)}
                                    className="px-10 py-5 bg-white/5 hover:bg-white/10 text-neutral-400 font-black uppercase tracking-[0.3em] text-[10px] squircle transition-all"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6 relative z-10">
                            <div className="w-24 h-24 bg-accent/5 rounded-[2.5rem] flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform duration-1000 border border-white/5">
                                <svg className="w-10 h-10 text-accent opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-xl font-black text-[var(--fg-color)]/90 tracking-tighter uppercase italic">Ingest Intelligence Feed</p>
                                <p className="text-[10px] text-neutral-600 uppercase tracking-[0.4em] font-black">Drop DistroKid .TSV Matrix_</p>
                            </div>
                            <input type="file" accept=".tsv" onChange={(e) => e.target.files?.[0] && setAttachedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    )}

                    {isLoading && (
                        <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl squircle flex flex-col items-center justify-center gap-8 z-20 animate-in fade-in duration-700">
                            <Loader2 className="w-16 h-16 text-accent animate-spin" />
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[11px] font-black text-accent uppercase tracking-[0.7em] animate-pulse">Calculating Matrix</span>
                                <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-[0.3em] font-bold">Latency_Compensation_Active</span>
                            </div>
                        </div>
                    )}

                    <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
                </div>
            ) : (
                <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    {/* Dashboard Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-10 bg-accent/[0.04] border border-accent/20 squircle shadow-2xl specular-reflect group overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-accent/40" />
                            <span className="text-[11px] font-black text-accent uppercase tracking-[0.4em]">Total Revenue</span>
                            <p className="text-5xl font-black text-[var(--fg-color)] mt-4 italic tracking-tighter drop-shadow-lg">${analysisResults.totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            <div className="mt-8 pt-4 border-t border-accent/10 flex justify-between">
                                <span className="text-[9px] font-black text-accent/50 uppercase tracking-widest font-mono">Status: Verified</span>
                                <span className="text-[9px] font-black text-accent/50 uppercase tracking-widest font-mono">ANALYTICS_V4</span>
                            </div>
                        </div>
                        <div className="p-10 bg-accent/[0.04] border border-accent/20 squircle shadow-2xl specular-reflect group overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-accent/40" />
                            <span className="text-[11px] font-black text-accent uppercase tracking-[0.4em]">Total Streams</span>
                            <p className="text-5xl font-black text-[var(--fg-color)] mt-4 italic tracking-tighter drop-shadow-lg">{analysisResults.totals.streams.toLocaleString()}</p>
                            <div className="mt-8 pt-4 border-t border-accent/10 flex justify-between">
                                <span className="text-[9px] font-black text-accent/50 uppercase tracking-widest font-mono">Aggregation_Active</span>
                            </div>
                        </div>
                        <div className="p-10 bg-accent/[0.04] border border-accent/20 squircle shadow-2xl specular-reflect group overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-accent/40" />
                            <span className="text-[11px] font-black text-accent uppercase tracking-[0.4em]">Payout_Yield</span>
                            <p className="text-5xl font-black text-[var(--fg-color)] mt-4 italic tracking-tighter drop-shadow-lg">${(analysisResults.totals.revenue / analysisResults.totals.streams).toFixed(5)}</p>
                            <div className="mt-8 pt-4 border-t border-accent/10 flex justify-between">
                                <span className="text-[9px] font-black text-accent/50 uppercase tracking-widest font-mono">Net_Efficiency</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* AI Advisor Card */}
                        <div className="lg:col-span-2 p-10 bg-accent/[0.02] border border-accent/10 squircle specular-reflect shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(255,51,102,0.8)]" />
                                <h3 className="text-xs font-black uppercase tracking-[0.5em] text-accent">Strategic Summary</h3>
                            </div>
                            {analysisResults.advice ? (
                                <div className="text-sm text-[var(--fg-color)]/80 font-bold leading-relaxed space-y-4 [&>ul]:list-disc [&>ul]:ml-4 [&>ul>li]:mb-2 [&_strong]:text-accent" dangerouslySetInnerHTML={{ __html: analysisResults.advice }} />
                            ) : (
                                <div className="h-40 flex items-center justify-center text-neutral-700 italic font-black uppercase tracking-widest">Narrative Synchronization...</div>
                            )}
                        </div>

                        {/* Platform Comparison */}
                        <div className="bg-surface/20 border border-border/10 squircle p-10 specular-reflect shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-[70px] rounded-full -mr-20 -mt-20 pointer-events-none" />
                            <div className="flex justify-between items-center mb-10 relative z-10">
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-[var(--fg-color)]/90 italic">Platform Performance Rank</h3>
                                <span className="text-[10px] font-mono text-neutral-700 font-bold">SORT_REVENUE</span>
                            </div>
                            <div className="flex flex-col gap-5 relative z-10">
                                {analysisResults.platforms
                                    .sort((a: any, b: any) => b.revenue - a.revenue)
                                    .map((p: any) => (
                                        <div key={p.store} className="flex flex-col gap-3 p-5 bg-black/10 border border-border/10 rounded-[2rem] hover:bg-black/20 hover:border-accent/30 transition-all duration-700 group/row">
                                            <div className="flex justify-between items-center">
                                                <span className="text-base font-black text-[var(--fg-color)]/80 group-hover/row:text-[var(--fg-color)] uppercase tracking-tight italic transition-colors">{p.store}</span>
                                                <span className="text-xl font-black text-accent italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,51,102,0.2)]">${p.revenue.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-mono text-neutral-600 font-black uppercase tracking-tighter">
                                                <span>{p.streams.toLocaleString()} Streams</span>
                                                <span className="text-neutral-700">${p.rate.toFixed(4)} Per_Str</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Top performing assets */}
                        <div className="bg-surface/20 border border-border/10 squircle p-10 specular-reflect shadow-2xl overflow-hidden relative">
                            <div className="absolute bottom-0 right-0 w-48 h-48 bg-accent/5 blur-[70px] rounded-full -mr-20 -mb-20 pointer-events-none" />
                            <div className="flex justify-between items-center mb-10 relative z-10">
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-[var(--fg-color)]/90 italic">Top 10 Strategic Assets</h3>
                                <span className="text-[10px] font-mono text-neutral-700 font-bold">ASSET_CLUSTERING</span>
                            </div>
                            <div className="flex flex-col gap-5 relative z-10">
                                {analysisResults.tracks.slice(0, 10).map((t: any, idx: number) => (
                                    <div key={t.title} className="flex items-center gap-6 p-5 bg-black/10 border border-border/10 rounded-[2rem] hover:bg-black/20 hover:border-accent/30 transition-all duration-700 group/track shadow-lg">
                                        <span className="text-lg font-black text-neutral-500 italic group-hover/track:text-accent transition-colors transform group-hover/track:scale-110">{(idx + 1).toString().padStart(2, '0')}</span>
                                        <div className="flex-1 flex flex-col gap-0.5">
                                            <span className="text-sm font-black text-[var(--fg-color)] tracking-tighter uppercase italic truncate max-w-[180px] drop-shadow-md">{t.title}</span>
                                            <span className="text-[10px] font-mono text-neutral-500 font-black uppercase tracking-tighter">{t.streams.toLocaleString()} RAW_STREAMS</span>
                                        </div>
                                        <span className="text-lg font-black text-[var(--fg-color)] italic tracking-tighter">${t.revenue.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setAnalysisResults(null);
                            setAttachedFile(null);
                        }}
                        className="w-full py-6 border border-accent/20 text-accent font-black uppercase tracking-[0.6em] text-[10px] squircle bg-accent/5 hover:bg-accent/10 transition-all duration-700 mt-6 flex items-center justify-center gap-4 group"
                    >
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                        Update Financial Data Matrix
                    </button>
                </div>
            )
            }
        </div >
    );
}
