"use client";

import React, { useState, useEffect } from "react";
import { 
    Loader2, 
    RefreshCw, 
    Upload, 
    BarChart2, 
    DollarSign, 
    Award, 
    Youtube, 
    Instagram, 
    Facebook, 
    TrendingUp,
    ShieldCheck,
    Calendar,
    Music,
    Globe,
    FileSpreadsheet
} from "lucide-react";

import StatsOverviewCards from "./analytics/StatsOverviewCards";
import PlatformComparisonChart from "./analytics/PlatformComparisonChart";
import RevenueTimelineChart from "./analytics/RevenueTimelineChart";
import RevenueDistributionChart from "./analytics/RevenueDistributionChart";
import TopReelsLeaderboard from "./analytics/TopReelsLeaderboard";

interface AnalyticsMatrixProps {
    theme?: string;
    mode?: 'kirbai' | 'factory';
}

export default function AnalyticsMatrix({ theme = "dark", mode = 'kirbai' }: AnalyticsMatrixProps) {
    const [statsData, setStatsData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState<'overview' | 'distrokid' | 'social' | 'youtube'>('overview');
    const [isUploadingCSV, setIsUploadingCSV] = useState<string | null>(null);

    const fetchSummary = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/stats/summary?mode=${mode}`);
            const data = await res.json();
            if (data.success) {
                setStatsData(data);
            }
        } catch (err) {
            console.error("Failed to fetch unified stats summary:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [mode]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, platform: string) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploadingCSV(platform);
        try {
            if (platform === 'tiktok') {
                const filePromises = Array.from(files).map(async (f) => ({
                    name: f.name,
                    content: await f.text()
                }));
                const filesData = await Promise.all(filePromises);

                await fetch('/api/parse-tiktok', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files: filesData })
                });
            } else {
                const file = files[0];
                const text = await file.text();

                await fetch('/api/parse-csv', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ platform, csvText: text })
                });
            }

            // Refresh summary after upload
            await fetchSummary();
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setIsUploadingCSV(null);
            event.target.value = '';
        }
    };

    if (isLoading && !statsData) {
        return (
            <div className="w-full h-96 flex flex-col items-center justify-center gap-3 text-foreground/50">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="text-xs font-mono uppercase tracking-widest">Loading Master Analytics Hub...</span>
            </div>
        );
    }

    const {
        freshness,
        grandTotals,
        platformComparison,
        revenueTimeline,
        storesDistribution,
        trackLeaderboard,
        topPosts,
        youtubeStats,
        tacticalSignals
    } = statsData || {};

    return (
        <div className="w-full flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
            {/* Header Navigation & Sub-Tabs */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/60 pb-6">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-gradient">STATISTICS & ANALYTICS HUB</h2>
                    <p className="text-xs text-foreground/50 mt-1">
                        Unified cross-platform intelligence engine combining DistroKid, Meta, TikTok, and YouTube API data.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher Sub-Tabs */}
                    <div className="flex p-1 bg-surface/80 rounded-xl border border-border/60">
                        <button
                            onClick={() => setActiveSubTab('overview')}
                            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                                activeSubTab === 'overview' ? 'bg-accent text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                            }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveSubTab('distrokid')}
                            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                                activeSubTab === 'distrokid' ? 'bg-emerald-500 text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                            }`}
                        >
                            DistroKid Music
                        </button>
                        <button
                            onClick={() => setActiveSubTab('social')}
                            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                                activeSubTab === 'social' ? 'bg-pink-500 text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                            }`}
                        >
                            Social Reels
                        </button>
                        <button
                            onClick={() => setActiveSubTab('youtube')}
                            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                                activeSubTab === 'youtube' ? 'bg-red-500 text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                            }`}
                        >
                            YouTube API
                        </button>
                    </div>

                    {/* Manual CSV Upload Button */}
                    <label className="btn-secondary text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        {isUploadingCSV ? 'Processing...' : 'Upload CSV'}
                        <input
                            type="file"
                            accept=".csv,.tsv"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'instagram')}
                        />
                    </label>

                    {/* Refresh Button */}
                    <button
                        onClick={fetchSummary}
                        className="btn-secondary p-2 text-foreground/70 hover:text-foreground"
                        title="Refresh Stats"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Overview KPI Cards */}
            {grandTotals && <StatsOverviewCards totals={grandTotals} freshness={freshness} />}

            {/* --- TAB 1: EXECUTIVE OVERVIEW --- */}
            {activeSubTab === 'overview' && (
                <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    {/* Platform Comparison */}
                    {platformComparison && <PlatformComparisonChart data={platformComparison} />}

                    {/* Revenue Timeline */}
                    {revenueTimeline && <RevenueTimelineChart data={revenueTimeline} />}

                    {/* Top Content Showcase */}
                    {topPosts && <TopReelsLeaderboard posts={topPosts} />}
                </div>
            )}

            {/* --- TAB 2: DISTROKID MUSIC MONETIZATION --- */}
            {activeSubTab === 'distrokid' && (
                <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Distribution Chart */}
                        {storesDistribution && (
                            <RevenueDistributionChart
                                stores={storesDistribution}
                                totalEarnings={grandTotals?.distroKidRevenue || 0}
                            />
                        )}

                        {/* Top Earning Tracks Leaderboard */}
                        <div className="card p-6 flex flex-col gap-4 border border-border/80">
                            <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                <div className="flex items-center gap-2">
                                    <Music className="w-4 h-4 text-emerald-400" />
                                    <h3 className="text-base font-extrabold text-foreground tracking-tight">Top Earning Tracks</h3>
                                </div>
                                <span className="text-[10px] font-mono text-foreground/40 uppercase">Ranked by Royalties</span>
                            </div>

                            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                                {(trackLeaderboard || []).map((track: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-surface/40 hover:bg-surface/70 transition-all border border-border/30 text-xs">
                                        <div className="flex items-center gap-3">
                                            <span className="w-5 h-5 rounded-full bg-accent/10 text-accent font-mono font-bold text-[10px] flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            <span className="font-bold text-foreground line-clamp-1">{track.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4 font-mono">
                                            <span className="text-foreground/40 text-[10px]">{track.quantity.toLocaleString()} streams</span>
                                            <span className="text-emerald-400 font-extrabold">${track.earningsUsd.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Revenue Timeline */}
                    {revenueTimeline && <RevenueTimelineChart data={revenueTimeline} />}
                </div>
            )}

            {/* --- TAB 3: SOCIAL REELS (IG, FB, TIKTOK) --- */}
            {activeSubTab === 'social' && (
                <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    {/* Top Reels Leaderboard */}
                    {topPosts && <TopReelsLeaderboard posts={topPosts} />}

                    {/* Platform Comparison */}
                    {platformComparison && <PlatformComparisonChart data={platformComparison} />}
                </div>
            )}

            {/* --- TAB 4: YOUTUBE OFFICIAL API --- */}
            {activeSubTab === 'youtube' && (
                <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(youtubeStats || []).map((ch: any) => (
                            <div key={ch.id} className="card p-6 flex flex-col gap-4 border border-border/80 bg-surface/40 hover:bg-surface/70 transition-all">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                            <Youtube className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">{ch.name}</h4>
                                            <span className="text-[10px] font-mono text-foreground/40">{ch.handle}</span>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        API ACTIVE
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/40 text-center">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase font-mono text-foreground/40">Subscribers</span>
                                        <span className="text-sm font-extrabold text-foreground">{ch.subscribers.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase font-mono text-foreground/40">Views</span>
                                        <span className="text-sm font-extrabold text-red-400">{ch.views.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase font-mono text-foreground/40">Videos</span>
                                        <span className="text-sm font-extrabold text-foreground">{ch.videoCount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
