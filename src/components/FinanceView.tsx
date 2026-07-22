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
                const res = await fetch(`/api/analyze-finance?mode=${mode}`);
                const data = await res.json();
                if (data.analysis) {
                    setAnalysisResults(data.analysis);
                }
            } catch (err) {
                console.error("Failed to load stored finance data:", err);
            }
        };
        loadStoredData();
    }, [mode]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith(".tsv") || file.name.endsWith(".csv"))) {
            setAttachedFile(file);
        }
    };

    const analyzeData = async () => {
        if (!attachedFile) return;
        setIsLoading(true);
        try {
            // DistroKid files are notoriously encoded in UTF-16LE. A standard await file.text()
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
                body: JSON.stringify({ rawData: text }),
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
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-end relative ml-1">
                <div className="flex flex-col gap-1">
                    <p className="section-eyebrow">Performance Matrix_V4.1</p>
                    <h2 className="section-title">Financial Analytics</h2>
                </div>
                {analysisResults?.persistedAt && (
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-foreground/40 font-semibold uppercase tracking-wider">Data Current As Of:</span>
                        <span className="text-xs text-accent font-semibold uppercase tracking-wider">
                            {new Date(analysisResults.persistedAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                )}
            </div>

            {!analysisResults ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative group flex flex-col items-center justify-center p-24 border-2 border-dashed transition-all duration-1000 card overflow-hidden ${isDragging ? "border-accent bg-accent/5 backdrop-blur-xl" : "border-border/10 bg-surface/20 hover:border-accent/30 hover:bg-surface/30"
                        }`}
                >
                    {attachedFile ? (
                        <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-700 relative z-10">
                            <div className="flex items-center gap-6 bg-accent/15 p-6 rounded-[2.5rem] border border-accent/20 shadow-2xl transform hover:scale-105 transition-transform duration-500">
                                <div className="w-16 h-16 bg-accent rounded-3xl flex items-center justify-center shadow-[0_10px_40px_rgba(255,51,102,0.4)]">
                                    <svg className="w-8 h-8 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12h6m-6 4h12M3 21h18M3 10h18M3 7l9-4 9 4" /></svg>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-base font-extrabold text-foreground tracking-tight">{attachedFile.name}</span>
                                    <span className="text-xs text-accent font-semibold uppercase tracking-wider">Awaiting_Synthesis_Command</span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={analyzeData}
                                    disabled={isLoading}
                                    className="btn-primary px-12 py-4"
                                >
                                    {isLoading ? "Analyzing..." : "Analyze"}
                                </button>
                                <button
                                    onClick={() => setAttachedFile(null)}
                                    className="btn-secondary px-10 py-4"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6 relative z-10">
                            <div className="w-24 h-24 bg-accent/5 rounded-[2.5rem] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-1000 border border-border">
                                <svg className="w-10 h-10 text-accent opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-xl font-extrabold text-foreground tracking-tight">Ingest Intelligence Feed</p>
                                <p className="text-xs text-foreground/40 font-semibold uppercase tracking-wider">Drop DistroKid .CSV/.TSV Matrix_</p>
                            </div>
                            <input type="file" accept=".tsv,.csv" onChange={(e) => e.target.files?.[0] && setAttachedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    )}

                    {isLoading && (
                        <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 z-20 animate-in fade-in duration-700">
                            <Loader2 className="w-16 h-16 text-accent animate-spin" />
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-sm font-semibold text-accent uppercase tracking-wider animate-pulse">Calculating Matrix</span>
                                <span className="text-xs text-foreground/40 font-semibold uppercase tracking-wider">Latency_Compensation_Active</span>
                            </div>
                        </div>
                    )}

                    <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
                </div>
            ) : (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    {/* Dashboard Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="card p-6 bg-accent/[0.04] border-accent/20 group overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-accent/40" />
                            <span className="stat-label text-accent">Total Revenue</span>
                            <p className="stat-value text-foreground mt-2">${analysisResults.totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            <div className="mt-4 pt-4 border-t border-accent/10 flex justify-between">
                                <span className="text-[10px] text-accent/50 font-semibold uppercase tracking-wider">Status: Verified</span>
                                <span className="text-[10px] text-accent/50 font-semibold uppercase tracking-wider">ANALYTICS_V4</span>
                            </div>
                        </div>
                        <div className="card p-6 bg-accent/[0.04] border-accent/20 group overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-accent/40" />
                            <span className="stat-label text-accent">Total Streams</span>
                            <p className="stat-value text-foreground mt-2">{analysisResults.totals.streams.toLocaleString()}</p>
                            <div className="mt-4 pt-4 border-t border-accent/10 flex justify-between">
                                <span className="text-[10px] text-accent/50 font-semibold uppercase tracking-wider">Aggregation_Active</span>
                            </div>
                        </div>
                        <div className="card p-6 bg-accent/[0.04] border-accent/20 group overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-accent/40" />
                            <span className="stat-label text-accent">Payout_Yield</span>
                            <p className="stat-value text-foreground mt-2">${(analysisResults.totals.revenue / analysisResults.totals.streams).toFixed(5)}</p>
                            <div className="mt-4 pt-4 border-t border-accent/10 flex justify-between">
                                <span className="text-[10px] text-accent/50 font-semibold uppercase tracking-wider">Net_Efficiency</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* AI Advisor Card */}
                        <div className="lg:col-span-2 card p-6 bg-accent/[0.02] border-accent/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(255,51,102,0.8)]" />
                                <h3 className="section-subtitle text-accent">Strategic Summary</h3>
                            </div>
                            {analysisResults.advice ? (
                                <div className="text-sm text-foreground/80 font-medium leading-relaxed space-y-4 [&>ul]:list-disc [&>ul]:ml-4 [&>ul>li]:mb-2 [&_strong]:text-accent" dangerouslySetInnerHTML={{ __html: analysisResults.advice }} />
                            ) : (
                                <div className="h-40 flex items-center justify-center text-foreground/40 italic font-medium">Narrative Synchronization...</div>
                            )}
                        </div>

                        {/* Platform Comparison */}
                        <div className="card p-6 bg-surface/20 border-border/10 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-foreground/5 blur-[70px] rounded-full -mr-20 -mt-20 pointer-events-none" />
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h3 className="section-subtitle text-foreground">Platform Performance Rank</h3>
                                <span className="text-[10px] text-foreground/40 font-semibold uppercase tracking-wider">SORT_REVENUE</span>
                            </div>
                            <div className="flex flex-col gap-4 relative z-10">
                                {analysisResults.platforms
                                    .sort((a: any, b: any) => b.revenue - a.revenue)
                                    .map((p: any) => (
                                        <div key={p.store} className="flex flex-col gap-2 p-4 bg-surface/40 border border-border/10 rounded-xl hover:bg-surface/60 hover:border-accent/30 transition-all duration-700 group/row">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-foreground/80 group-hover/row:text-foreground tracking-tight transition-colors">{p.store}</span>
                                                <span className="text-base font-extrabold text-accent tracking-tighter">${p.revenue.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] text-foreground/50 font-medium">
                                                <span>{p.streams.toLocaleString()} Streams</span>
                                                <span className="text-foreground/40">${p.rate.toFixed(4)} Per_Str</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Top performing assets */}
                        <div className="card p-6 bg-surface/20 border-border/10 overflow-hidden relative">
                            <div className="absolute bottom-0 right-0 w-48 h-48 bg-accent/5 blur-[70px] rounded-full -mr-20 -mb-20 pointer-events-none" />
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h3 className="section-subtitle text-foreground">Top 10 Strategic Assets</h3>
                                <span className="text-[10px] text-foreground/40 font-semibold uppercase tracking-wider">ASSET_CLUSTERING</span>
                            </div>
                            <div className="flex flex-col gap-4 relative z-10">
                                {analysisResults.tracks.slice(0, 10).map((t: any, idx: number) => (
                                    <div key={t.title} className="flex items-center gap-4 p-4 bg-surface/40 border border-border/10 rounded-xl hover:bg-surface/60 hover:border-accent/30 transition-all duration-700 group/track">
                                        <span className="text-sm font-extrabold text-foreground/40 group-hover/track:text-accent transition-colors transform group-hover/track:scale-110">{(idx + 1).toString().padStart(2, '0')}</span>
                                        <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                            <span className="text-sm font-semibold text-foreground tracking-tight truncate">{t.title}</span>
                                            <span className="text-[10px] text-foreground/50 font-medium">{t.streams.toLocaleString()} RAW_STREAMS</span>
                                        </div>
                                        <span className="text-base font-extrabold text-foreground tracking-tighter">${t.revenue.toFixed(2)}</span>
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
                        className="btn-ghost w-full py-4 mt-2 flex items-center justify-center gap-3 group text-accent hover:bg-accent/10 hover:text-accent"
                    >
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Update Financial Data Matrix</span>
                    </button>
                </div>
            )
            }
        </div >
    );
}
