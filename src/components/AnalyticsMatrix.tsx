"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "@/components/Icons";

interface AnalyticsMatrixProps {
    theme?: string;
    mode?: 'kirbai' | 'factory';
}

export default function AnalyticsMatrix({ theme = "dark", mode = 'kirbai' }: AnalyticsMatrixProps) {
    const [ytStats, setYtStats] = useState<any[]>([]);
    const [ytLastUpdated, setYtLastUpdated] = useState<string>("");
    const [isUploadingCSV, setIsUploadingCSV] = useState<'tiktok' | 'instagram' | null>(null);
    const [isLoadingYT, setIsLoadingYT] = useState(true);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    
    // Partitioned Platform Data
    const [igData, setIgData] = useState<any>({
        followers: "0",
        reach: "0",
        lastUpdated: "",
        trends: null,
        narrative: "",
        analysis: null
    });
    
    const [ttData, setTtData] = useState<any>({
        followers: "0",
        reach: "0",
        lastUpdated: "",
        trends: null,
        narrative: "",
        demographics: null
    });

    // Manual input buffers
    const [pendingTtFollowers, setPendingTtFollowers] = useState<string>("");
    const [pendingIgFollowers, setPendingIgFollowers] = useState<string>("");

    useEffect(() => {
        const fetchPulse = async () => {
            try {
                const res = await fetch(`/api/pulse?mode=${mode}`);
                const data = await res.json();
                if (data.success && data.state) {
                    const s = data.state;
                    
                    // Support legacy migration if keys are flat
                    const ig = s.instagram || {
                        followers: s.igFollowers || "0",
                        reach: s.igReach || "0",
                        lastUpdated: s.igLastUpdated || "",
                        trends: s.trends, // Note: legacy shared these
                        narrative: s.narrative,
                        analysis: s.analysis
                    };
                    
                    const tt = s.tiktok || {
                        followers: s.ttFollowers || "0",
                        reach: s.ttViews || "0",
                        lastUpdated: s.ttLastUpdated || "",
                        trends: s.trends,
                        narrative: s.narrative,
                        demographics: s.demographics
                    };

                    setIgData(ig);
                    setTtData(tt);
                    
                    setPendingIgFollowers(ig.followers);
                    setPendingTtFollowers(tt.followers);
                }
            } catch (e) {
                console.error("Pulse Load Error:", e);
            }
        };

        // Fetch YT Stats
        const fetchYT = async () => {
            try {
                const res = await fetch(`/api/youtube-stats?mode=${mode}`);
                const data = await res.json();
                if (data.stats) {
                    setYtStats(data.stats);
                    if (data.persistedAt) {
                        setYtLastUpdated(new Date(data.persistedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                    } else if (!data.isCached) {
                        setYtLastUpdated(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingYT(false);
            }
        };

        fetchPulse();
        fetchYT();
    }, [mode]);

    const syncToSupabase = async (newState: any) => {
        try {
            await fetch('/api/pulse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, state: newState })
            });
        } catch (e) {
            console.error("Pulse Sync Error:", e);
        }
    };

    const handleSynthesize = async () => {
        setIsSynthesizing(true);
        try {
            const res = await fetch('/api/synthesize-analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    youtubeStats: ytStats,
                    instagramStats: { followers: parseInt(igData.followers), reach: parseInt(igData.reach) },
                    tiktokStats: { followers: parseInt(ttData.followers), views: parseInt(ttData.reach) }
                })
            });
            const data = await res.json();
            if (data.analysis) {
                const updatedIg = { ...igData, analysis: data.analysis };
                setIgData(updatedIg);
                
                await syncToSupabase({
                    instagram: updatedIg,
                    tiktok: ttData
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSynthesizing(false);
        }
    };

    const updateAndSave = async (platform: 'instagram' | 'tiktok', key: string, value: string) => {
        const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        if (platform === 'instagram') {
            const updated = { ...igData, [key]: value, lastUpdated: now };
            setIgData(updated);
            await syncToSupabase({ instagram: updated, tiktok: ttData });
        } else {
            const updated = { ...ttData, [key]: value, lastUpdated: now };
            setTtData(updated);
            await syncToSupabase({ instagram: igData, tiktok: updated });
        }
    };

    const handleCSVUpload = async (platform: 'tiktok' | 'instagram', event: React.ChangeEvent<HTMLInputElement>) => {
        const filesSelect = event.target.files;
        if (!filesSelect || filesSelect.length === 0) return;

        setIsUploadingCSV(platform);

        try {
            let res;
            if (platform === 'tiktok') {
                const filePromises = Array.from(filesSelect).map(async (f) => ({
                    name: f.name,
                    content: await f.text()
                }));
                const filesData = await Promise.all(filePromises);

                res = await fetch('/api/parse-tiktok', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files: filesData })
                });
            } else {
                const file = filesSelect[0];
                const text = await file.text();

                res = await fetch('/api/parse-csv', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ platform, csvText: text })
                });
            }

            const json = await res.json();

            if (json.success && json.data) {
                const { followers, reach, trends, demographics, narrative } = json.data;
                const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                if (platform === 'tiktok') {
                    const updated = {
                        followers: followers?.toString() || ttData.followers,
                        reach: reach?.toString() || ttData.reach,
                        lastUpdated: now,
                        trends: trends || ttData.trends,
                        demographics: demographics || ttData.demographics,
                        narrative: narrative || ttData.narrative
                    };
                    setTtData(updated);
                    setPendingTtFollowers(updated.followers);
                    await syncToSupabase({ instagram: igData, tiktok: updated });
                } else {
                    const updated = {
                        followers: followers?.toString() || igData.followers,
                        reach: reach?.toString() || igData.reach,
                        lastUpdated: now,
                        trends: trends || igData.trends,
                        narrative: narrative || igData.narrative,
                        analysis: igData.analysis
                    };
                    setIgData(updated);
                    setPendingIgFollowers(updated.followers);
                    await syncToSupabase({ instagram: updated, tiktok: ttData });
                }

            } else {
                console.error("AI Parser Failed:", json.error);
                alert(`Analysis Failed: ${json.error || 'Check console for details'}`);
            }
        } catch (e) {
            console.error("CSV Parse Request Error:", e);
        } finally {
            setIsUploadingCSV(null);
            event.target.value = ''; 
        }
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const renderTacticalBrief = (platform: 'instagram' | 'tiktok', data: any) => {
        if (!data.narrative && !data.trends) return null;

        const isIG = platform === 'instagram';
        const accentColor = isIG ? 'text-pink-500' : 'text-accent';
        const dotColor = isIG ? 'bg-pink-500' : 'bg-accent';
        const glowColor = isIG ? 'rgba(236,72,153,0.8)' : 'rgba(255,51,102,0.8)';

        return (
            <div className="animate-in slide-in-from-bottom-4 zoom-in-95 duration-500 mt-4">
                <div className={`p-10 border squircle specular-reflect shadow-2xl relative overflow-hidden group ${theme === 'snes' ? 'bg-surface/60 border-b-4 border-r-4 border-accent' : 'bg-accent/[0.04] border-accent/30'}`}>
                    <div className={`absolute top-0 right-0 w-80 h-80 ${isIG ? 'bg-pink-500/5' : 'bg-accent/5'} blur-[100px] rounded-full -mr-40 -mt-40 group-hover:scale-125 transition-transform duration-2000`} />

                    <div className="flex items-center justify-between mb-6 relative z-10 w-full">
                        <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full ${dotColor}`} style={{ boxShadow: `0 0 15px ${glowColor}` }}></span>
                            <h3 className={`text-sm font-black uppercase tracking-[0.4em] ${accentColor}`}>{platform} Tactical Brief</h3>
                        </div>
                        {data.lastUpdated && (
                            <span className="text-[8px] flex items-center gap-2 font-mono uppercase tracking-widest text-foreground/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Data current as of {data.lastUpdated} 
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-8 relative z-10">
                        <p className="text-xl font-black text-foreground tracking-tighter leading-tight max-w-4xl">{data.narrative}</p>

                        {data.trends && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                                <div className="bg-black/20 border border-white/5 p-5 rounded-3xl flex flex-col gap-2">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-foreground/40">The Hook</span>
                                    <span className={`text-sm font-black ${accentColor}`}>{data.trends.optimalLengthRange || "Flexible"}</span>
                                    <span className="text-[7px] uppercase font-bold text-foreground/30">Target Video Length</span>
                                </div>
                                
                                <div className="bg-black/20 border border-white/5 p-5 rounded-3xl flex flex-col gap-3 min-w-[200px]">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-foreground/40">The Windows (Top 3)</span>
                                    <div className="flex flex-col gap-2">
                                        {(data.trends.topWindows || []).slice(0, 3).map((w: any, i: number) => (
                                            <div key={i} className="flex flex-col border-b border-white/5 last:border-0 pb-1.5 last:pb-0">
                                                <span className={`text-[9px] font-black ${accentColor}`}>{w.time}</span>
                                                {w.reach > 0 && <span className="text-[7px] font-bold text-foreground/40 uppercase">{formatNumber(w.reach)} {isIG ? 'Reach' : 'Views'}</span>}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[7px] uppercase font-bold text-foreground/30 mt-auto">Peak Virality Timing</span>
                                </div>

                                <div className="bg-black/20 border border-white/5 p-5 rounded-3xl flex flex-col gap-3 min-w-[240px]">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-foreground/40">The Magnets (Top 3)</span>
                                    <div className="flex flex-col gap-2">
                                        {(data.trends.topMagnets || []).length > 0 ? (
                                            data.trends.topMagnets.slice(0, 3).map((m: any, i: number) => (
                                                <div key={i} className="flex flex-col border-b border-white/5 last:border-0 pb-1.5 last:pb-0">
                                                    <span className="text-[7px] font-bold text-foreground/80 leading-tight line-clamp-2 italic">"{m.text}"</span>
                                                    <span className={`text-[9px] font-black ${accentColor} mt-0.5`}>{m.rate ? m.rate.toFixed(1) : "N/A"} <span className="text-[6px] opacity-50">Follows / 1k</span></span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col border-b border-white/5 last:border-0 pb-1.5 last:pb-0">
                                                <span className="text-[7px] font-bold text-foreground/80 leading-tight italic">"No data identified"</span>
                                                <span className={`text-[9px] font-black ${accentColor} mt-0.5`}>N/A</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[7px] uppercase font-bold text-foreground/30 mt-auto">Peak Follower Conversion</span>
                                </div>

                                <div className="bg-black/20 border border-white/5 p-5 rounded-3xl flex flex-col gap-3 min-w-[240px]">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-foreground/40">The Anchors (Top 3)</span>
                                    <div className="flex flex-col gap-2">
                                        {(data.trends.topAnchors || []).length > 0 ? (
                                            data.trends.topAnchors.slice(0, 3).map((m: any, i: number) => (
                                                <div key={i} className="flex flex-col border-b border-white/5 last:border-0 pb-1.5 last:pb-0">
                                                    <span className="text-[7px] font-bold text-foreground/80 leading-tight line-clamp-2 italic">"{m.text}"</span>
                                                    <span className={`text-[9px] font-black ${isIG ? 'text-pink-400' : 'text-accent'} mt-0.5`}>{m.rate ? m.rate.toFixed(1) : "N/A"} <span className="text-[6px] opacity-50">Hits / 1k</span></span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col border-b border-white/5 last:border-0 pb-1.5 last:pb-0">
                                                <span className="text-[7px] font-bold text-foreground/80 leading-tight italic">"No data identified"</span>
                                                <span className={`text-[9px] font-black ${isIG ? 'text-pink-400' : 'text-accent'} mt-0.5`}>N/A</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[7px] uppercase font-bold text-foreground/30 mt-auto">Total Interaction Leaders</span>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-4 mt-2">
                             {/* The Voice */}
                            {data.trends?.topKeywords && (
                                <div className="bg-black/20 border border-white/5 p-5 rounded-3xl flex flex-col gap-2 flex-1">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-foreground/40">The Voice</span>
                                    <div className="flex flex-wrap gap-1">
                                        {data.trends.topKeywords.map((k: string, i: number) => (
                                            <span key={i} className={`text-[8px] font-mono bg-accent/10 border border-accent/20 px-1 rounded ${accentColor}`}>{k}</span>
                                        ))}
                                    </div>
                                    <span className="text-[7px] uppercase font-bold text-foreground/30 mt-auto">Target Keywords</span>
                                </div>
                            )}

                            {/* The Crowd (TT Only) */}
                            {!isIG && data.demographics && (
                                <div className="bg-black/20 border border-white/5 p-5 rounded-3xl flex flex-col gap-2 flex-1">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-foreground/40">The Crowd</span>
                                    <span className={`text-sm font-black ${accentColor}`}>{data.demographics.topGender || "Mixed"}</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {data.demographics.topTerritories?.map((t: string, i: number) => (
                                            <span key={i} className={`text-[8px] font-mono bg-accent/10 border border-accent/20 px-1 rounded ${accentColor}`}>{t}</span>
                                        ))}
                                    </div>
                                    <span className="text-[7px] uppercase font-bold text-foreground/30 mt-auto">Core Demographics</span>
                                </div>
                            )}
                        </div>

                        {/* Executive Action Items (IG Only - via Synthesis) */}
                        {isIG && data.analysis?.actionItems && (
                            <div className="bg-black/30 border border-white/5 rounded-[2rem] p-8 flex flex-col gap-6 shadow-inner">
                                <span className={`text-[11px] uppercase font-black tracking-[0.5em] ${accentColor}`}>Executive Strategy Directives:</span>
                                <ul className="flex flex-col gap-5">
                                    {data.analysis.actionItems.map((item: string, idx: number) => (
                                        <li key={idx} className="text-sm font-bold flex gap-4 items-start tracking-tight leading-snug text-foreground/90">
                                            <span className={`${accentColor} font-black`}>0{idx + 1}</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-10">
            <div className="flex justify-between items-center ml-1">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">Analytics Matrix</h2>
                    <p className="text-[10px] text-foreground/50 uppercase tracking-[0.5em] font-black">Tactical Growth Synthesis</p>
                </div>
                <button
                    onClick={handleSynthesize}
                    disabled={isSynthesizing || isLoadingYT}
                    className="px-6 py-2.5 bg-accent text-white hover:bg-accent/80 border border-accent/20 text-[10px] font-black uppercase tracking-[0.4em] squircle transition-all shadow-2xl flex items-center gap-2"
                >
                    {isSynthesizing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Execute Synthesis"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* YOUTUBE (AUTOMATED) */}
                <div className={`p-8 border squircle flex flex-col gap-6 reltive overflow-hidden ${theme === 'snes' ? 'bg-surface/60 border-b-4 border-r-4' : 'bg-surface/30 glass border-border/10'}`}>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">YouTube <span className="text-foreground/40">(Auto)</span></h3>
                            {ytLastUpdated && <span className="text-[8px] font-mono text-foreground/40 tracking-widest uppercase mt-0.5">Updated: {ytLastUpdated}</span>}
                        </div>
                    </div>
                    {isLoadingYT ? (
                        <div className="flex items-center gap-2 py-10 opacity-50">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-[10px] uppercase tracking-widest font-bold">Scanning API...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {ytStats.map(stat => (
                                <div key={stat.id} className="p-4 rounded-xl flex items-center justify-between bg-black/10 border border-border/20">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-foreground">{stat.name}</span>
                                        <span className="text-[9px] font-mono text-foreground/50">{stat.handle}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[12px] font-black tracking-tighter text-accent">{formatNumber(stat.views)} <span className="text-[8px] text-foreground/40 font-mono tracking-normal">VIEWS</span></span>
                                        <span className="text-[9px] font-mono font-bold text-foreground/70">{formatNumber(stat.subscribers)} <span className="opacity-50 font-normal">SUBS</span></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* TIKTOK (MANUAL) */}
                <div className={`p-8 border squircle flex flex-col gap-6 reltive overflow-hidden ${theme === 'snes' ? 'bg-surface/60 border-b-4 border-r-4' : 'bg-surface/30 glass border-border/10'}`}>
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">TikTok</h3>
                                {ttData.lastUpdated && <span className="text-[8px] font-mono text-foreground/40 tracking-widest uppercase mt-0.5">Updated: {ttData.lastUpdated}</span>}
                            </div>
                        </div>
                        <a href="https://www.tiktok.com/analytics" target="_blank" className="text-[8px] uppercase tracking-widest font-bold text-foreground/40 hover:text-accent transition-colors">Open Portal ↗</a>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60">Total Followers</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={pendingTtFollowers}
                                    onChange={(e) => setPendingTtFollowers(e.target.value)}
                                    className="flex-1 p-3 font-mono text-sm border rounded-xl focus:outline-none focus:border-accent bg-black/10 border-border/20 text-foreground placeholder:text-foreground/50"
                                />
                                <button 
                                    onClick={() => updateAndSave('tiktok', "followers", pendingTtFollowers)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${pendingTtFollowers !== ttData.followers ? 'bg-accent text-white shadow-lg' : 'bg-surface border border-border/10 text-foreground/40'}`}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 text-center flex flex-col gap-1">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <label htmlFor="tiktok-csv" className="cursor-pointer text-[9px] font-black tracking-[0.2em] uppercase text-foreground/50 hover:text-accent transition-colors">
                                    {isUploadingCSV === 'tiktok' ? (
                                        <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> AI Analyzing Data...</div>
                                    ) : (
                                        <>[ Drop Followers or Views CSV ]</>
                                    )}
                                </label>
                                <input id="tiktok-csv" type="file" multiple accept=".csv" className="hidden" disabled={!!isUploadingCSV} onChange={(e) => handleCSVUpload('tiktok', e)} />
                            </div>
                            <span className="text-[7px] uppercase tracking-widest text-foreground/30 font-bold block">AI extracts available stats • Drop multiple files</span>
                        </div>
                    </div>
                </div>

                {/* INSTAGRAM (MANUAL) */}
                <div className={`p-8 border squircle flex flex-col gap-6 reltive overflow-hidden ${theme === 'snes' ? 'bg-surface/60 border-b-4 border-r-4' : 'bg-surface/30 glass border-border/10'}`}>
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">Instagram</h3>
                                {igData.lastUpdated && <span className="text-[8px] font-mono text-foreground/40 tracking-widest uppercase mt-0.5">Updated: {igData.lastUpdated}</span>}
                            </div>
                        </div>
                        <a href="https://business.facebook.com/latest/insights" target="_blank" className="text-[8px] uppercase tracking-widest font-bold text-foreground/40 hover:text-accent transition-colors">Open Portal ↗</a>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60">Total Followers</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={pendingIgFollowers}
                                    onChange={(e) => setPendingIgFollowers(e.target.value)}
                                    className="flex-1 p-3 font-mono text-sm border rounded-xl focus:outline-none focus:border-accent bg-black/10 border-border/20 text-foreground placeholder:text-foreground/50"
                                />
                                <button 
                                    onClick={() => updateAndSave('instagram', "followers", pendingIgFollowers)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${pendingIgFollowers !== igData.followers ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-surface border border-border/10 text-foreground/40'}`}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 text-center flex flex-col gap-1">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <label htmlFor="instagram-csv" className="cursor-pointer px-4 py-3 border border-pink-500/20 bg-pink-500/10 rounded-xl text-[9px] font-black tracking-[0.2em] uppercase text-pink-500 hover:text-white hover:bg-pink-500/30 transition-all">
                                    {isUploadingCSV === 'instagram' ? (
                                        <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Deep Parsing Meta CSV...</div>
                                    ) : (
                                        <>[ Sync Meta Business Suite CSV ]</>
                                    )}
                                </label>
                                <input id="instagram-csv" type="file" accept=".csv" className="hidden" disabled={!!isUploadingCSV} onChange={(e) => handleCSVUpload('instagram', e)} />
                            </div>
                            <span className="text-[7px] uppercase tracking-widest text-foreground/30 font-bold block">Overrides manual input • Saves raw copy</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI BRIEF OUTPUTS (Now Separated) */}
            <div className="flex flex-col gap-6">
                {renderTacticalBrief('tiktok', ttData)}
                {renderTacticalBrief('instagram', igData)}
            </div>
        </div>
    );
}
