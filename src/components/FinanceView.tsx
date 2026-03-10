"use client";

import { useState } from "react";

type FinanceViewProps = {
    activeTab: "kirbai" | "factory";
};

type PlatformData = {
    store: string;
    revenue: number;
    streams: number;
    rate: number;
};

type ParsedData = {
    totalEarnings: number;
    earningsByArtist: { Kirbai: number; AELOW: number; KURAO: number; };
    topTracks: { title: string; revenue: number; streams: number }[];
    platforms: PlatformData[];
    platformsByRevenue: PlatformData[];
    reportTiming: { store: string; minDate: string; maxDate: string }[];
};

type AnalyzePhase = 'idle' | 'analyzing' | 'complete';

export default function FinanceView({ activeTab }: FinanceViewProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [analyzePhase, setAnalyzePhase] = useState<AnalyzePhase>('idle');
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [aiAdvice, setAiAdvice] = useState<string | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(true);
    };

    const handleDragLeave = () => setIsHovering(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(false);
        if (analyzePhase !== 'idle') return;
        const file = e.dataTransfer.files[0];
        if (file) setAttachedFile(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (analyzePhase !== 'idle') return;
        const file = e.target.files?.[0];
        if (file) setAttachedFile(file);
    };

    const removeFile = () => {
        setAttachedFile(null);
    };

    const startAnalysis = () => {
        if (!attachedFile) return;
        setAnalyzePhase('analyzing');

        // Simulate a slight delay to show the UX loading animation before the heavy parsing starts
        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                if (result) {
                    parseTSV(result);
                } else {
                    alert("Could not read file contents.");
                    reset();
                }
            };
            reader.onerror = () => {
                alert("Error reading file.");
                reset();
            };
            reader.readAsText(attachedFile);
        }, 1200);
    };

    const parseTSV = async (text: string) => {
        try {
            const lines = text.split(/\r\n|\r|\n/).filter(l => l.trim() !== "");
            if (lines.length < 2) throw new Error("File too short or missing newlines");

            const headers = lines[0].split("\t").map(h => h.trim().toLowerCase());

            // Distrokid header variations
            const storeIdx = headers.findIndex(h => h === "store" || h.includes("platform"));
            const artistIdx = headers.findIndex(h => h === "artist" || h === "artist name");
            const titleIdx = headers.findIndex(h => h === "title" || h === "track" || h === "track title");
            const earningsIdx = headers.findIndex(h => h === "earnings (usd)" || h === "earnings" || h === "revenue");
            const qtyIdx = headers.findIndex(h => h === "quantity" || h === "streams" || h === "plays");
            const dateIdx = headers.findIndex(h => h === "sale period" || h === "reporting date" || h === "date");

            const safeStoreIndex = storeIdx !== -1 ? storeIdx : 0;
            const safeArtistIndex = artistIdx !== -1 ? artistIdx : 4;
            const safeTitleIndex = titleIdx !== -1 ? titleIdx : 3;
            const safeEarningsIndex = earningsIdx !== -1 ? earningsIdx : 11;
            const safeQtyIndex = qtyIdx !== -1 ? qtyIdx : 9;
            const safeDateIndex = dateIdx !== -1 ? dateIdx : 1; // commonly column 2 (index 1) in DK exports

            let total = 0;
            const byArtist = { Kirbai: 0, AELOW: 0, KURAO: 0 };
            const trackMap = new Map<string, { revenue: number; streams: number }>();
            const storeMap = new Map<string, { revenue: number; streams: number }>();
            const dateMap = new Map<string, { minStr: string; maxStr: string }>();

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split("\t");
                if (cols.length <= Math.max(safeStoreIndex, safeArtistIndex, safeTitleIndex)) continue;

                const storeStr = cols[safeStoreIndex]?.trim() || "Unknown";
                const artistStr = cols[safeArtistIndex]?.trim() || "";
                const titleStr = cols[safeTitleIndex]?.trim() || "Unknown Track";
                const dateStr = cols[safeDateIndex]?.trim() || "";

                const earningsRaw = parseFloat((cols[safeEarningsIndex] || "0").replace(/[^0-9.-]+/g, ""));
                const earnings = isNaN(earningsRaw) ? 0 : earningsRaw;
                const streamsRaw = parseInt((cols[safeQtyIndex] || "0").replace(/[^0-9-]+/g, ""), 10);
                const streams = isNaN(streamsRaw) ? 0 : streamsRaw;

                total += earnings;

                // Artist split
                const artistUpper = artistStr.toUpperCase();
                if (artistUpper.includes("KIRBAI")) byArtist.Kirbai += earnings;
                else if (artistUpper.includes("AELOW")) byArtist.AELOW += earnings;
                else if (artistUpper.includes("KURAO")) byArtist.KURAO += earnings;

                // Tracks aggregation
                const exTrack = trackMap.get(titleStr) || { revenue: 0, streams: 0 };
                trackMap.set(titleStr, { revenue: exTrack.revenue + earnings, streams: exTrack.streams + streams });

                // Platform aggregation
                const exStore = storeMap.get(storeStr) || { revenue: 0, streams: 0 };
                storeMap.set(storeStr, { revenue: exStore.revenue + earnings, streams: exStore.streams + streams });

                // Date aggregation
                if (dateStr) {
                    const currentDates = dateMap.get(storeStr) || { minStr: dateStr, maxStr: dateStr };
                    if (dateStr < currentDates.minStr) currentDates.minStr = dateStr;
                    if (dateStr > currentDates.maxStr) currentDates.maxStr = dateStr;
                    dateMap.set(storeStr, currentDates);
                }
            }

            const topTracks = Array.from(trackMap.entries())
                .map(([title, data]) => ({ title, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10);

            const platforms = Array.from(storeMap.entries())
                .map(([store, data]) => ({ store, ...data, rate: data.revenue / Math.max(data.streams, 1) }))
                .sort((a, b) => b.rate - a.rate);

            const platformsByRevenue = Array.from(storeMap.entries())
                .map(([store, data]) => ({ store, ...data, rate: data.revenue / Math.max(data.streams, 1) }))
                .sort((a, b) => b.revenue - a.revenue);

            const reportTiming = Array.from(dateMap.entries())
                .map(([store, dates]) => ({
                    store,
                    minDate: dates.minStr,
                    maxDate: dates.maxStr
                }))
                .sort((a, b) => a.store.localeCompare(b.store));

            const finalData = {
                totalEarnings: total,
                earningsByArtist: byArtist,
                topTracks,
                platforms,
                platformsByRevenue,
                reportTiming
            };
            setParsedData(finalData);

            // Trigger AI Advice Generation
            await fetchAiAdvice(finalData);

        } catch (e: any) {
            console.error(e);
            alert(`Error parsing TSV: ${e.message}`);
            reset();
        }
    };

    const fetchAiAdvice = async (data: ParsedData) => {
        try {
            const res = await fetch("/api/strategic-advice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            setAiAdvice(result.advice);
        } catch (err) {
            setAiAdvice("<p class='text-red-500'>Failed to communicate with BI core.</p>");
        } finally {
            setAnalyzePhase('complete');
        }
    };

    const reset = () => {
        setAttachedFile(null);
        setAnalyzePhase('idle');
        setParsedData(null);
        setAiAdvice(null);
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const formatRate = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(val);

    return (
        <div className="flex flex-col gap-4 mt-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold tracking-tight">Finance View</h2>
                <span className="text-xs text-neutral-500 font-mono">DISTROKID (.TSV)</span>
            </div>

            {analyzePhase === 'idle' && !attachedFile && (
                <label
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed ${isHovering ? 'border-accent bg-accent/5' : 'border-border bg-surface'} flex flex-col items-center justify-center p-12 transition-all cursor-pointer group`}
                >
                    <input type="file" accept=".tsv" className="hidden" onChange={handleFileChange} />
                    <div className="flex flex-col items-center gap-3 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-file-spreadsheet ${isHovering ? 'text-accent' : 'text-neutral-500'} group-hover:text-accent transition-colors`}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 13h2" /><path d="M14 13h2" /><path d="M8 17h2" /><path d="M14 17h2" /></svg>
                        <p className="text-sm font-medium text-foreground">Click or Drag DistroKid TSV to Attach</p>
                        <p className="text-xs text-neutral-500">Provide data to the BI Core for analysis.</p>
                    </div>
                </label>
            )}

            {analyzePhase === 'idle' && attachedFile && (
                <div className="border border-border bg-surface p-6 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-neutral-500 uppercase tracking-widest">Attached Intelligence</span>
                        <div className="flex items-center justify-between bg-black/50 border border-border/50 rounded-sm px-4 py-3">
                            <div className="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                <span className="text-sm font-medium font-mono text-neutral-300">{attachedFile.name}</span>
                                <span className="text-xs text-neutral-600">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <button onClick={removeFile} className="text-neutral-500 hover:text-red-500 transition-colors" title="Remove Attachment">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={startAnalysis} className="px-6 py-2 bg-accent text-white text-sm font-bold uppercase tracking-wider rounded-sm hover:bg-accent/80 transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
                            Analyze Data
                        </button>
                    </div>
                </div>
            )}

            {analyzePhase === 'analyzing' && (
                <div className="border border-border bg-surface p-12 flex flex-col items-center justify-center gap-6">
                    <div className="relative flex items-center justify-center">
                        <svg className="animate-spin text-accent" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-sm font-bold tracking-widest uppercase text-foreground">Processing TSV Data</p>
                        <p className="text-xs text-neutral-500 font-mono animate-pulse">Calculating payout rates & querying BI core...</p>
                    </div>
                </div>
            )}

            {analyzePhase === 'complete' && parsedData && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="border border-border bg-surface p-4 flex flex-col gap-1">
                            <span className="text-xs text-neutral-500 uppercase tracking-widest">Total Earnings</span>
                            <span className="text-3xl font-bold text-accent">{formatCurrency(parsedData.totalEarnings)}</span>
                        </div>

                        <div className="md:col-span-2 border border-border bg-surface p-4 relative overflow-hidden flex flex-col gap-4">
                            <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            </div>
                            <h3 className="text-sm font-semibold tracking-tight uppercase text-neutral-400">Strategic Business Advice</h3>
                            <div dangerouslySetInnerHTML={{ __html: aiAdvice || "" }} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col gap-8">
                            <div className="flex flex-col gap-3">
                                <h3 className="text-sm font-semibold tracking-tight uppercase text-neutral-400">Total Platform Revenue</h3>
                                <div className="border border-border bg-surface rounded-sm overflow-hidden text-sm flex flex-col">
                                    <div className="flex justify-between p-3 border-b border-border bg-black/50 text-neutral-500 text-xs uppercase">
                                        <span>Store</span>
                                        <span>Total Earned</span>
                                    </div>
                                    {parsedData.platformsByRevenue.map((p, i) => (
                                        <div key={i} className="flex justify-between p-3 border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors">
                                            <span className="font-medium text-foreground">{p.store}</span>
                                            <span className="font-mono text-accent">{formatCurrency(p.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <h3 className="text-sm font-semibold tracking-tight uppercase text-neutral-400">Platform Payout Rate</h3>
                                <div className="border border-border bg-surface rounded-sm overflow-hidden text-sm flex flex-col">
                                    <div className="flex justify-between p-3 border-b border-border bg-black/50 text-neutral-500 text-xs uppercase">
                                        <span>Store</span>
                                        <span>Rate / Stream</span>
                                    </div>
                                    {parsedData.platforms.map((p, i) => (
                                        <div key={i} className="flex justify-between p-3 border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors">
                                            <span className="font-medium text-foreground">{p.store}</span>
                                            <span className="font-mono text-accent">{formatRate(p.rate)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-8">
                            <div className="flex flex-col gap-3">
                                <h3 className="text-sm font-semibold tracking-tight uppercase text-neutral-400">Top 10 Tracks</h3>
                                <div className="border border-border bg-surface rounded-sm overflow-hidden text-sm flex flex-col">
                                    {parsedData.topTracks.map((track, i) => (
                                        <div key={i} className="flex justify-between p-3 border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3 truncate pr-4 max-w-[200px]">
                                                <span className="text-xs text-neutral-600 font-mono w-4">{i + 1}.</span>
                                                <span>{track.title}</span>
                                            </div>
                                            <span className="font-mono text-accent">{formatCurrency(track.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <h3 className="text-sm font-semibold tracking-tight uppercase text-neutral-400">Report Timing Details</h3>
                                <div className="border border-border bg-surface rounded-sm overflow-hidden text-sm flex flex-col">
                                    <div className="flex justify-between p-3 border-b border-border bg-black/50 text-neutral-500 text-xs uppercase">
                                        <span>Store</span>
                                        <span>Sale Period</span>
                                    </div>
                                    {parsedData.reportTiming.length === 0 && (
                                        <div className="p-3 text-neutral-500 text-xs italic text-center">No date ranges identified in file.</div>
                                    )}
                                    {parsedData.reportTiming.map((timing, i) => (
                                        <div key={i} className="flex justify-between p-3 border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors text-xs">
                                            <span className="font-medium text-foreground">{timing.store}</span>
                                            <span className="font-mono text-neutral-400">
                                                {timing.minDate} {timing.minDate !== timing.maxDate ? `→ ${timing.maxDate}` : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-4">
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            Analysis Complete on <strong>{attachedFile?.name}</strong>
                        </div>
                        <button onClick={reset} className="text-xs bg-surface border border-border px-3 py-1.5 rounded-sm hover:text-accent hover:border-accent transition-all flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                            Reset Workspace
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
