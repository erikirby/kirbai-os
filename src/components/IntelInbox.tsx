"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "@/components/Icons";
import MuseClefairy from './MuseClefairy';

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
                {/* Assistant Clefairy */}
                <div className="flex flex-col items-center -ml-4 mb-4">
                    <MuseClefairy emotion="happy" message="Review the latest demographic splits from your new TikTok pipeline!" />
                </div>

                {/* Command Hub Links */}
                <div className="flex flex-col gap-3 mt-2">
                    <h4 className="section-subtitle">Command Hub Links</h4>
                    <div className="flex flex-col gap-2">
                        <a href="https://www.skool.com/aimusic" target="_blank" className="p-3 border rounded-xl text-[10px] font-bold text-center transition-all bg-accent/10 border-accent/30 hover:border-accent text-accent">Skool: AI Music</a>
                        <a href="https://www.tiktok.com/tiktokstudio/analytics/" target="_blank" className="p-3 border rounded-xl text-[10px] font-bold text-center transition-all bg-surface border-border hover:border-accent/40 text-foreground/80">TikTok Studio Stats</a>
                        <a href="https://business.facebook.com/latest/posts/published_posts?business_id=1524540791867233&asset_id=959080893962864" target="_blank" className="p-3 border rounded-xl text-[10px] font-bold text-center transition-all bg-surface border-border hover:border-accent/40 text-foreground/80">Meta Business Suite</a>
                        <a href="https://distrokid.com/stats/?data=streams" target="_blank" className="p-3 border rounded-xl text-[10px] font-bold text-center transition-all bg-surface border-border hover:border-accent/40 text-foreground/80">DistroKid Reporting</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center ml-1">
                <div className="flex flex-col gap-1">
                    <h2 className="section-title">Field Intel</h2>
                    <p className="section-subtitle">Global Strategy Aggregation</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsDropboxOpen(!isDropboxOpen)}
                        className={`btn-secondary text-[10px] font-semibold uppercase tracking-wider ${isDropboxOpen ? 'border-accent text-accent bg-accent/10' : ''}`}
                    >
                        Feed Raw Intel
                    </button>
                    <button
                        onClick={() => fetchIntel(true)}
                        className="btn-primary text-[10px] font-semibold uppercase tracking-wider"
                    >
                        Recalibrate Feed
                    </button>
                </div>
            </div>

            {/* Intel Dropbox UI */}
            {isDropboxOpen && (
                <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="card p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-semibold tracking-wider uppercase text-accent">Initialize Tactical Parsing</span>
                            <span className="text-[9px] font-mono text-foreground/50 uppercase tracking-tight">Paste Raw Email / Newsletter Body</span>
                        </div>
                        <textarea
                            value={dropboxText}
                            onChange={(e) => setDropboxText(e.target.value)}
                            placeholder="Data stream offline. Awaiting manual payload injection..."
                            className="input-field w-full h-40 resize-none font-mono text-xs"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setIsDropboxOpen(false); setDropboxText(""); }}
                                className="btn-ghost text-[10px] font-semibold uppercase tracking-wider"
                            >
                                Abort
                            </button>
                            <button
                                onClick={handleParseIntel}
                                disabled={isParsing || !dropboxText.trim()}
                                className="btn-primary text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2"
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
                    <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">Syncing Intel Streams</span>
                </div>
            ) : (
                <div className="flex flex-col gap-16">
                    {/* High Prio Social Pulse Card */}
                    {news.some(n => n.source === "Social Pulse") && (
                        <div className="md:col-span-2 card p-10 bg-accent/[0.04] border-accent/30 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 blur-[100px] rounded-full -mr-40 -mt-40 group-hover:scale-125 transition-transform duration-1000" />
                            <div className="flex items-center gap-3 mb-6">
                                <span className="w-3 h-3 rounded-full bg-accent shadow-[0_0_15px_rgba(var(--accent-color),0.8)]"></span>
                                <h3 className="section-eyebrow">Critical Social Signal Detected</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                {news.filter(n => n.source === "Social Pulse").map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-4">
                                        <h4 className="text-xl font-extrabold text-foreground tracking-tight leading-tight max-w-4xl">{item.title}</h4>
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <span className="badge-accent bg-accent text-white border-transparent">Target Wave: Industry Shift</span>
                                            {item.date && (
                                                <span className="badge">
                                                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            )}
                                            <a href={item.url} target="_blank" className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50 hover:text-foreground transition-colors ml-auto">Observe Source Matrix →</a>
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
                                <div className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent" />
                                <h3 className="section-eyebrow">Newsletter Protocols</h3>
                                <div className="h-px flex-1 bg-gradient-to-l from-accent/50 to-transparent" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {intel.filter((i: any) => i.tag === "NEWSLETTER").map((item: any) => (
                                    <div key={item.id} className="card p-10 flex flex-col gap-6 hover:bg-surface-elevated hover:border-accent/50 transition-all duration-1000 group">
                                        <div className="flex justify-between items-center relative z-10">
                                            <span className="badge-accent border-accent/20">
                                                NEWSLETTER
                                            </span>
                                            <span className="text-[10px] font-mono text-accent/40 font-bold tracking-widest">{item.date}</span>
                                        </div>

                                        <div className="flex flex-col gap-3 relative z-10">
                                            <h4 className="text-xl font-extrabold text-foreground group-hover:text-accent transition-colors tracking-tight leading-tight uppercase">{item.title.replace("Guerrilla: ", "")}</h4>
                                            <p className="text-sm text-foreground/70 leading-relaxed font-medium">{item.summary}</p>
                                        </div>

                                        <div className="bg-surface/50 border border-border rounded-2xl p-8 mt-4 flex flex-col gap-6 relative z-10 shadow-inner group-hover:bg-surface/70 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(var(--accent-color),1)]" />
                                                <span className="section-eyebrow">Guerrilla Strategy:</span>
                                            </div>
                                            <ul className="flex flex-col gap-4">
                                                {item.actionItems.map((action: string, idx: number) => (
                                                    <li key={idx} className="text-sm text-foreground font-medium flex gap-4 items-start tracking-tight leading-snug group-hover:translate-x-1 transition-transform">
                                                        <span className="text-accent font-extrabold">0{idx + 1}</span>
                                                        {action}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <a href={item.url} target="_blank" className="text-[10px] font-semibold uppercase tracking-wider text-accent/40 hover:text-accent transition-all mt-4 ml-1">Analyze Source Protocol_</a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* YOUTUBE INTEL SECTION */}
                    <div className="flex flex-col gap-8">
                        <div className="flex items-center gap-4 ml-1">
                            <div className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent" />
                            <h3 className="section-eyebrow">Video Surveillance</h3>
                            <div className="h-px flex-1 bg-gradient-to-l from-accent/50 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {intel.filter((i: any) => i.tag !== "NEWSLETTER").map((item: any) => (
                                <div key={item.id} className="card p-10 flex flex-col gap-6 hover:bg-surface-elevated hover:border-accent/40 transition-all duration-1000 group">
                                    <div className="flex justify-between items-center relative z-10">
                                        <span className={`badge ${
                                            item.tag === "KIRBAI" 
                                                ? "badge-accent border-accent/20" 
                                                : "bg-surface/60 border-border"
                                        }`}>
                                            {item.tag}
                                        </span>
                                        <span className="text-[10px] font-mono text-foreground/40 font-bold">{item.date}</span>
                                    </div>

                                    <div className="flex flex-col gap-3 relative z-10">
                                        <h4 className="text-xl font-extrabold text-foreground group-hover:text-accent transition-colors tracking-tight leading-tight">{item.title.replace("AIGuerrilla: ", "")}</h4>
                                        <p className="text-sm text-foreground/70 leading-relaxed font-medium">{item.summary}</p>
                                    </div>

                                    <div className="bg-surface/50 border border-border rounded-2xl p-8 mt-4 flex flex-col gap-6 relative z-10 shadow-inner group-hover:bg-surface/70 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(var(--accent-color),1)]" />
                                            <span className="section-eyebrow">Tactical Protocol:</span>
                                        </div>
                                        <ul className="flex flex-col gap-4">
                                            {item.actionItems.map((action: string, idx: number) => (
                                                <li key={idx} className="text-sm text-foreground font-medium flex gap-4 items-start tracking-tight leading-snug group-hover:translate-x-1 transition-transform">
                                                    <span className="text-accent font-extrabold">0{idx + 1}</span>
                                                    {action}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <a href={item.url} target="_blank" className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50 hover:text-foreground transition-all mt-4 ml-1">Stream Content Matrix_</a>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
