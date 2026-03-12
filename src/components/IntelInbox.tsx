"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "@/components/Icons";

interface IntelInboxProps {
    mode?: "compact" | "full";
    theme?: string;
    activeTab?: "kirbai" | "factory";
}

export default function IntelInbox({ mode = "full", theme = "dark", activeTab = "kirbai" }: IntelInboxProps) {
    const [intel, setIntel] = useState<any[]>([]);
    const [news, setNews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDropboxOpen, setIsDropboxOpen] = useState(false);
    const [dropboxText, setDropboxText] = useState("");
    const [isParsing, setIsParsing] = useState(false);

    const handleParseIntel = async () => {
        if (!dropboxText.trim()) return;
        setIsParsing(true);
        try {
            const res = await fetch('/api/parse-newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: dropboxText })
            });
            const data = await res.json();
            if (data.success && data.intel) {
                setIntel([data.intel, ...intel]);
                setDropboxText("");
                setIsDropboxOpen(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsParsing(false);
        }
    };

    const fetchIntel = async (force = false) => {
        // Check cache first if not forced
        if (!force) {
            const cached = localStorage.getItem("kirbai_intel_cache_v2");
            if (cached) {
                const { intel: cIntel, news: cNews, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                if (age < 24 * 60 * 60 * 1000) { // 24 hours
                    setIntel(cIntel);
                    setNews(cNews);
                    setIsLoading(false);
                    return;
                }
            }
        }

        setIsLoading(true);
        try {
            const [intelRes, newsRes] = await Promise.all([
                fetch(`/api/youtube-intel${force ? "?force=true" : ""}`),
                fetch("/api/pokemon-news")
            ]);
            const intelData = await intelRes.json();
            const newsData = await newsRes.json();

            const finalIntel = intelData.intel || [];
            const finalNews = newsData.news || [];

            setIntel(finalIntel);
            setNews(finalNews);

            // Update cache
            localStorage.setItem("kirbai_intel_cache_v2", JSON.stringify({
                intel: finalIntel,
                news: finalNews,
                timestamp: Date.now()
            }));

        } catch (err) {
            console.error("Failed to fetch intel", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIntel();
    }, []);

    if (mode === "compact") {
        return (
            <div className="flex flex-col gap-6">
                {/* Compact Pulse Alerts */}
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="text-[10px] uppercase tracking-[0.3em] text-accent font-black">Pulse Alerts</h4>
                    </div>
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-4 opacity-50">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="text-[9px] uppercase tracking-widest">Scanning...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {/* Only show Social Pulse and top 1-line signal in compact mode */}
                            {news.filter(n => n.source === "Social Pulse").slice(0, 1).map((item, idx) => (
                                <div key={idx} className="p-3 border squircle flex flex-col gap-1 bg-accent/5 border-accent/20">
                                    <span className="text-[10px] font-black text-accent leading-tight line-clamp-2">{item.title}</span>
                                    <span className="text-[8px] font-mono uppercase tracking-tighter mt-1 text-foreground/50">High Prio Signal</span>
                                </div>
                            ))}
                            {intel.slice(0, 1).map((item: any) => (
                                <div key={item.id} className="p-3 border squircle flex flex-col gap-1 bg-surface/40 border-border/10">
                                    <span className="text-[10px] font-bold leading-tight line-clamp-2 text-foreground/90">{item.title.replace("AIGuerrilla: ", "")}</span>
                                    <span className="text-[8px] font-mono uppercase tracking-tighter mt-1 text-foreground/50">Video Digest</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Daily Quests / To-Dos */}
                <div className="flex flex-col gap-3">
                    <h4 className="text-[10px] uppercase tracking-[0.3em] text-foreground/50 font-black">Daily Quests</h4>
                    <div className="flex flex-col gap-2">
                        {[
                            { task: "Execute SEO Synthesis", xp: "+50 XP" },
                            { task: "Log Weekly IG/TT Metrics", xp: "+40 XP" },
                            { task: "Verify Payout Matrix", xp: "+20 XP" },
                            { task: "Update Roadmap", xp: "+10 XP" }
                        ].map((q, i) => (
                            <div key={i} className="group flex justify-between items-center p-3 transition-all cursor-pointer gap-2 bg-black/10 border border-border/10 hover:border-accent/30 rounded-2xl">
                                <span className="text-[10px] font-bold leading-tight text-foreground/80 group-hover:text-foreground">{q.task}</span>
                                <span className="text-[8px] font-mono font-black whitespace-nowrap text-accent">{q.xp}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Command Hub Links */}
                <div className="flex flex-col gap-3 mt-2">
                    <h4 className="text-[10px] uppercase tracking-[0.3em] text-foreground/50 font-black">Command Hub</h4>
                    <div className="flex flex-col gap-2">
                        <a href="https://skool.com" target="_blank" className="p-3 border rounded-2xl text-[10px] font-bold text-center transition-all bg-surface border-border/10 hover:border-accent/40 text-foreground/80">Skool Community</a>
                        <a href="https://youtube.com" target="_blank" className="p-3 border rounded-2xl text-[10px] font-bold text-center transition-all bg-surface border-border/10 hover:border-accent/40 text-foreground/80">YouTube Studio</a>
                    </div>
                </div>

                {/* XP / Level Indicator */}
                <div className="mt-4 pt-4 border-t border-border/10 flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-foreground tracking-widest uppercase">Level 14</span>
                        <span className="text-[8px] font-mono text-foreground/50 font-bold">450 / 1000 XP</span>
                    </div>
                    <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full xp-bar-inner" style={{ width: '45%' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10">
            <div className="flex justify-between items-center ml-1">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">Field Intel</h2>
                    <p className="text-[10px] text-foreground/50 uppercase tracking-[0.5em] font-black">Global Strategy Aggregation</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsDropboxOpen(!isDropboxOpen)}
                        className={`px-6 py-2.5 bg-surface hover:bg-surface border border-accent/20 hover:border-accent text-foreground hover:text-accent text-[10px] font-black uppercase tracking-[0.4em] squircle transition-all shadow-2xl shadow-accent/5 active:scale-95 ${isDropboxOpen ? 'border-accent text-accent bg-accent/10' : ''}`}
                    >
                        Feed Raw Intel
                    </button>
                    <button
                        onClick={() => fetchIntel(true)}
                        className="px-6 py-2.5 bg-accent/10 hover:bg-accent border border-accent/20 hover:border-accent text-accent hover:text-white text-[10px] font-black uppercase tracking-[0.4em] squircle transition-all shadow-2xl shadow-accent/5 active:scale-95"
                    >
                        Recalibrate Feed
                    </button>
                </div>
            </div>

            {/* Intel Dropbox UI */}
            {isDropboxOpen && (
                <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className={`p-6 border border-border/10 squircle flex flex-col gap-4 shadow-xl ${theme === 'snes' ? 'bg-surface/60 border-b-4 border-r-4' : 'bg-surface/30 glass'}`}>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black tracking-widest uppercase text-accent">Initialize Tactical Parsing</span>
                            <span className="text-[9px] font-mono text-foreground/50 uppercase tracking-tighter">Paste Raw Email / Newsletter Body</span>
                        </div>
                        <textarea
                            value={dropboxText}
                            onChange={(e) => setDropboxText(e.target.value)}
                            placeholder="Data stream offline. Awaiting manual payload injection..."
                            className="w-full h-40 p-4 bg-black/10 border border-border/20 rounded-xl text-xs font-mono text-foreground/80 placeholder:text-foreground/30 focus:outline-none focus:border-accent/50 transition-colors resize-none"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setIsDropboxOpen(false); setDropboxText(""); }}
                                className="px-5 py-2 text-[10px] font-bold text-foreground/50 hover:text-foreground transition-colors uppercase tracking-widest"
                            >
                                Abort
                            </button>
                            <button
                                onClick={handleParseIntel}
                                disabled={isParsing || !dropboxText.trim()}
                                className="px-6 py-2 bg-accent text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed border border-accent/20 text-[10px] font-black uppercase tracking-[0.4em] squircle transition-all flex items-center gap-2"
                            >
                                {isParsing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Execute Synthesis"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-6">
                    <Loader2 className="w-12 h-12 animate-spin text-accent" />
                    <span className="text-[11px] font-black text-accent uppercase tracking-[0.6em]">Syncing Intel Streams</span>
                </div>
            ) : (
                <div className="flex flex-col gap-16">
                    {/* High Prio Social Pulse Card */}
                    {news.some(n => n.source === "Social Pulse") && (
                        <div className="md:col-span-2 p-10 bg-accent/[0.04] border border-accent/30 squircle specular-reflect shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 blur-[100px] rounded-full -mr-40 -mt-40 group-hover:scale-125 transition-transform duration-2000" />
                            <div className="flex items-center gap-3 mb-6">
                                <span className="w-3 h-3 rounded-full bg-accent shadow-[0_0_15px_rgba(255,51,102,0.8)]"></span>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Critical Social Signal Detected</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                {news.filter(n => n.source === "Social Pulse").map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-4">
                                        <h4 className="text-xl font-black text-foreground tracking-tighter leading-tight max-w-4xl">{item.title}</h4>
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <span className="text-[10px] font-mono font-black bg-accent text-white px-4 py-1.5 rounded-full tracking-widest uppercase">Target Wave: Industry Shift</span>
                                            {item.date && (
                                                <span className="text-[10px] font-mono font-bold text-foreground/50 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-border/10">
                                                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            )}
                                            <a href={item.url} target="_blank" className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50 hover:text-foreground transition-colors ml-auto">Observe Source Matrix →</a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* NEWSLETTER INTEL SECTION */}
                    {intel.some(i => i.tag === "NEWSLETTER") && (
                        <div className="flex flex-col gap-8">
                            <div className="flex items-center gap-4 ml-1">
                                <div className="h-px flex-1 bg-gradient-to-r from-pink-500/50 to-transparent" />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.6em] text-pink-400">Newsletter Protocols</h3>
                                <div className="h-px flex-1 bg-gradient-to-l from-pink-500/50 to-transparent" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {intel.filter((i: any) => i.tag === "NEWSLETTER").map((item: any) => (
                                    <div key={item.id} className="flex flex-col gap-6 p-10 bg-pink-500/[0.03] border border-pink-500/20 squircle hover:bg-pink-500/[0.06] hover:border-pink-500/50 transition-all duration-1000 specular-reflect shadow-2xl overflow-hidden group">
                                        <div className="flex justify-between items-center relative z-10">
                                            <span className="text-[10px] font-black tracking-[0.3em] px-4 py-1.5 rounded-full uppercase bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                                NEWSLETTER
                                            </span>
                                            <span className="text-[10px] font-mono text-pink-400/40 font-bold tracking-widest">{item.date}</span>
                                        </div>

                                        <div className="flex flex-col gap-3 relative z-10">
                                            <h4 className="text-xl font-black text-foreground group-hover:text-pink-400 transition-colors tracking-tighter leading-tight uppercase">{item.title.replace("Guerrilla: ", "")}</h4>
                                            <p className="text-sm text-foreground/70 leading-relaxed font-bold opacity-80">{item.summary}</p>
                                        </div>

                                        <div className="bg-black/30 border border-pink-500/10 rounded-[2rem] p-8 mt-4 flex flex-col gap-6 relative z-10 shadow-inner group-hover:bg-black/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,1)]" />
                                                <span className="text-[11px] uppercase font-black text-pink-500 tracking-[0.5em]">Guerrilla Strategy:</span>
                                            </div>
                                            <ul className="flex flex-col gap-4">
                                                {item.actionItems.map((action: string, idx: number) => (
                                                    <li key={idx} className="text-sm text-neutral-200 font-bold flex gap-4 items-start tracking-tight leading-snug group-hover:translate-x-1 transition-transform">
                                                        <span className="text-pink-500 font-black">0{idx + 1}</span>
                                                        {action}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <a href={item.url} target="_blank" className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-400/40 hover:text-pink-400 transition-all mt-4 ml-1">Analyze Source Protocol_</a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* YOUTUBE INTEL SECTION */}
                    <div className="flex flex-col gap-8">
                        <div className="flex items-center gap-4 ml-1">
                            <div className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.6em] text-accent">Video Surveillance</h3>
                            <div className="h-px flex-1 bg-gradient-to-l from-accent/50 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {intel.filter((i: any) => i.tag !== "NEWSLETTER").map((item: any) => (
                                <div key={item.id} className="flex flex-col gap-6 p-10 bg-surface/20 border border-border/10 squircle hover:bg-surface/30 hover:border-accent/40 transition-all duration-1000 specular-reflect shadow-2xl overflow-hidden group">
                                    <div className="flex justify-between items-center relative z-10">
                                        <span className={`text-[10px] font-black tracking-[0.3em] px-4 py-1.5 rounded-full uppercase ${
                                            item.tag === "KIRBAI" 
                                                ? "bg-accent/15 text-accent" 
                                                : "bg-black/40 text-foreground/40 border border-border/10"
                                        }`}>
                                            {item.tag}
                                        </span>
                                        <span className="text-[10px] font-mono text-foreground/40 font-bold">{item.date}</span>
                                    </div>

                                    <div className="flex flex-col gap-3 relative z-10">
                                        <h4 className="text-xl font-black text-foreground group-hover:text-accent transition-colors tracking-tighter leading-tight">{item.title.replace("AIGuerrilla: ", "")}</h4>
                                        <p className="text-sm text-foreground/70 leading-relaxed font-bold opacity-80">{item.summary}</p>
                                    </div>

                                    <div className="bg-black/30 border border-white/5 rounded-[2rem] p-8 mt-4 flex flex-col gap-6 relative z-10 shadow-inner group-hover:bg-black/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(255,51,102,1)]" />
                                            <span className="text-[11px] uppercase font-black text-accent tracking-[0.5em]">Tactical Protocol:</span>
                                        </div>
                                        <ul className="flex flex-col gap-4">
                                            {item.actionItems.map((action: string, idx: number) => (
                                                <li key={idx} className="text-sm text-neutral-200 font-bold flex gap-4 items-start tracking-tight leading-snug group-hover:translate-x-1 transition-transform">
                                                    <span className="text-accent font-black">0{idx + 1}</span>
                                                    {action}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <a href={item.url} target="_blank" className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-700 hover:text-white transition-all mt-4 ml-1">Stream Content Matrix_</a>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
