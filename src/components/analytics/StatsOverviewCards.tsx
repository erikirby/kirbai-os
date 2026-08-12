"use client";

import React from 'react';
import { Eye, TrendingUp, DollarSign, Users, Award, Music, ShieldCheck, Activity } from 'lucide-react';

interface OverviewProps {
    totals: {
        crossPlatformViews: number;
        crossPlatformReach: number;
        totalFollowers: number;
        totalEarningsUsd: number;
        distroKidRevenue: number;
        metaBonusEarnings: number;
        totalStreamsOrUnits: number;
    };
    freshness: any;
}

export default function StatsOverviewCards({ totals, freshness }: OverviewProps) {
    const formatCurrency = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Freshness Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface/60 border border-border/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                    <span className="text-xs font-mono uppercase tracking-widest text-foreground/70 font-semibold">
                        Master Baseline Connected & Synchronized
                    </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                    <span className="px-2.5 py-1 rounded-md bg-pink-500/10 text-pink-400 border border-pink-500/20 font-bold">
                        IG: {freshness?.instagram?.dateRange || 'Jul 2026'}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                        FB: {freshness?.facebook?.dateRange || 'Aug 2026'}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                        DistroKid: {freshness?.distroKid?.dateRange || 'May 2026'}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                        YT: {freshness?.youtube?.status || 'LIVE'}
                    </span>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Views / Reach */}
                <div className="card p-5 relative overflow-hidden group border border-border/60 hover:border-accent/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-foreground/40 font-bold">Cross-Platform Views</span>
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                            <Eye className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-foreground tracking-tight">
                        {formatNumber(totals.crossPlatformViews || 0)}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-foreground/50">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Reach: {formatNumber(totals.crossPlatformReach || 0)} accounts</span>
                    </div>
                </div>

                {/* Combined Earnings */}
                <div className="card p-5 relative overflow-hidden group border border-border/60 hover:border-emerald-500/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-foreground/40 font-bold">Total Earnings</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-400 tracking-tight">
                        {formatCurrency(totals.totalEarningsUsd || 0)}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-foreground/50">
                        <span>DistroKid: {formatCurrency(totals.distroKidRevenue || 0)}</span>
                        <span>FB Reels: {formatCurrency(totals.metaBonusEarnings || 0)}</span>
                    </div>
                </div>

                {/* Total Streams & Units */}
                <div className="card p-5 relative overflow-hidden group border border-border/60 hover:border-purple-500/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-foreground/40 font-bold">Total Music Streams / Units</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <Music className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-foreground tracking-tight">
                        {formatNumber(totals.totalStreamsOrUnits || 0)}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-foreground/50">
                        <Award className="w-3.5 h-3.5 text-purple-400" />
                        <span>Across 162 distributed tracks</span>
                    </div>
                </div>

                {/* Total Social Followers */}
                <div className="card p-5 relative overflow-hidden group border border-border/60 hover:border-pink-500/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-foreground/40 font-bold">Total Followers & Subs</span>
                        <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-foreground tracking-tight">
                        {formatNumber(totals.totalFollowers || 0)}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-foreground/50">
                        <Activity className="w-3.5 h-3.5 text-pink-400" />
                        <span>Instagram + TikTok + YouTube</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
