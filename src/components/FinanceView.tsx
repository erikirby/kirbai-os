"use client";

import { useState } from "react";

type FinanceViewProps = {
    activeTab: "kirbai" | "factory";
};

type ParsedData = {
    totalEarnings: number;
    earningsByArtist: {
        Kirbai: number;
        AELOW: number;
        KURAO: number;
    };
    topTracks: { title: string; revenue: number; streams: number }[];
};

export default function FinanceView({ activeTab }: FinanceViewProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(true);
    };

    const handleDragLeave = () => {
        setIsHovering(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(false);

        const file = e.dataTransfer.files[0];
        if (!file) return;

        // We accept anything that seems like text, as OS MIME types for TSV can varying (.txt, .csv, excel, text/plain)
        if (file.name.endsWith('.tsv') || file.type.includes('text') || file.type.includes('excel')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                parseTSV(text);
            };
            reader.readAsText(file);
        } else {
            alert("Please upload a .tsv file from DistroKid.");
        }
    };

    const parseTSV = (text: string) => {
        try {
            const lines = text.split("\\n").filter(l => l.trim() !== "");
            if (lines.length < 2) return;

            const headers = lines[0].split("\\t").map(h => h.trim().toLowerCase());

            const artistIndex = headers.findIndex(h => h.includes("Artist") || h.includes("artist"));
            const titleIndex = headers.findIndex(h => h.includes("Title") || h.includes("title"));
            const earningsIndex = headers.findIndex(h => h.includes("Earnings") || h.includes("earnings (USD)") || h.includes("earnings"));
            const qtyIndex = headers.findIndex(h => h.includes("Quantity") || h.includes("quantity"));

            // Fallbacks if distrokid format is slightly different
            const safeArtistIndex = artistIndex !== -1 ? artistIndex : 3;
            const safeTitleIndex = titleIndex !== -1 ? titleIndex : 4;
            const safeQtyIndex = qtyIndex !== -1 ? qtyIndex : 8;
            const safeEarningsIndex = earningsIndex !== -1 ? earningsIndex : 10;

            let total = 0;
            const byArtist = { Kirbai: 0, AELOW: 0, KURAO: 0 };
            const trackMap = new Map<string, { revenue: number; streams: number }>();

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split("\\t");
                if (cols.length <= Math.max(safeArtistIndex, safeTitleIndex, safeEarningsIndex, safeQtyIndex)) continue;

                const artistStr = cols[safeArtistIndex]?.trim() || "";
                const titleStr = cols[safeTitleIndex]?.trim() || "Unknown Track";
                // Remove $ signs and parse
                const earningsRaw = parseFloat((cols[safeEarningsIndex] || "0").replace(/[^0-9.-]+/g, ""));
                const earnings = isNaN(earningsRaw) ? 0 : earningsRaw;
                const streamsRaw = parseInt((cols[safeQtyIndex] || "0").replace(/[^0-9-]+/g, ""), 10);
                const streams = isNaN(streamsRaw) ? 0 : streamsRaw;

                total += earnings;

                // Bucket by artist
                const artistUpper = artistStr.toUpperCase();
                if (artistUpper.includes("KIRBAI")) byArtist.Kirbai += earnings;
                else if (artistUpper.includes("AELOW")) byArtist.AELOW += earnings;
                else if (artistUpper.includes("KURAO")) byArtist.KURAO += earnings;

                // Tracks aggregation
                const existingTrack = trackMap.get(titleStr) || { revenue: 0, streams: 0 };
                trackMap.set(titleStr, {
                    revenue: existingTrack.revenue + earnings,
                    streams: existingTrack.streams + streams
                });
            }

            const topTracks = Array.from(trackMap.entries())
                .map(([title, data]) => ({ title, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 3);

            setParsedData({
                totalEarnings: total,
                earningsByArtist: byArtist,
                topTracks
            });
        } catch (e) {
            console.error("Failed to parse TSV", e);
            alert("Error parsing TSV. Ensure it is a valid DistroKid output.");
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);

    return (
        <div className="flex flex-col gap-4 mt-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold tracking-tight">Finance View</h2>
                <span className="text-xs text-neutral-500 font-mono">DISTROKID (.TSV)</span>
            </div>

            {!parsedData ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed ${isHovering ? 'border-accent bg-accent/5' : 'border-border bg-surface'} flex flex-col items-center justify-center p-12 transition-all cursor-pointer group`}
                >
                    <div className="flex flex-col items-center gap-3 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-file-spreadsheet ${isHovering ? 'text-accent' : 'text-neutral-500'} group-hover:text-accent transition-colors`}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 13h2" /><path d="M14 13h2" /><path d="M8 17h2" /><path d="M14 17h2" /></svg>
                        <p className="text-sm font-medium text-foreground">Drag & Drop DistroKid TSV</p>
                        <p className="text-xs text-neutral-500">Local processing only. Extracts total earnings, artist splits, and top tracks.</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Top Level Metric */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="border border-border bg-surface p-4 flex flex-col gap-1">
                            <span className="text-xs text-neutral-500 uppercase tracking-widest">Total Earnings</span>
                            <span className="text-3xl font-bold text-accent">{formatCurrency(parsedData.totalEarnings)}</span>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col gap-3">
                            <h3 className="text-sm font-semibold tracking-tight uppercase text-neutral-400">By Artist</h3>
                            <div className="border border-border bg-surface rounded-sm overflow-hidden text-sm">
                                <div className="flex justify-between p-3 border-b border-border/50">
                                    <span>Kirbai</span>
                                    <span className="font-mono text-accent">{formatCurrency(parsedData.earningsByArtist.Kirbai)}</span>
                                </div>
                                <div className="flex justify-between p-3 border-b border-border/50">
                                    <span>AELOW</span>
                                    <span className="font-mono text-accent">{formatCurrency(parsedData.earningsByArtist.AELOW)}</span>
                                </div>
                                <div className="flex justify-between p-3">
                                    <span>KURAO</span>
                                    <span className="font-mono text-accent">{formatCurrency(parsedData.earningsByArtist.KURAO)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <h3 className="text-sm font-semibold tracking-tight uppercase text-neutral-400">Top 3 Tracks</h3>
                            <div className="border border-border bg-surface rounded-sm overflow-hidden text-sm flex flex-col">
                                {parsedData.topTracks.length > 0 ? parsedData.topTracks.map((track, i) => (
                                    <div key={i} className="flex justify-between p-3 border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors">
                                        <span className="truncate pr-4 max-w-[150px] sm:max-w-[200px]" title={track.title}>{track.title}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-neutral-500 font-mono hidden sm:inline">{formatNumber(track.streams)} streams</span>
                                            <span className="font-mono text-accent min-w-[60px] text-right">{formatCurrency(track.revenue)}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-3 text-neutral-500">No track data available.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-2">
                        <button onClick={() => setParsedData(null)} className="text-xs hover:text-accent transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                            Process New File
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
