"use client";

import React, { useState } from 'react';
import { BarChart2, Eye, Users, DollarSign, Layers } from 'lucide-react';

interface PlatformItem {
    platform: string;
    icon: string;
    views: number;
    reach: number;
    reactions: number;
    shares: number;
    saves: number;
    followers: number;
    earningsUsd: number;
    color: string;
}

interface ChartProps {
    data: PlatformItem[];
}

export default function PlatformComparisonChart({ data }: ChartProps) {
    const [selectedMetric, setSelectedMetric] = useState<'views' | 'reach' | 'followers' | 'earningsUsd'>('views');

    const maxVal = Math.max(...data.map(d => d[selectedMetric] || 0), 1);

    const formatVal = (val: number) => {
        if (selectedMetric === 'earningsUsd') {
            return `$${val.toFixed(2)}`;
        }
        if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
        return val.toLocaleString();
    };

    return (
        <div className="card p-6 flex flex-col gap-6 border border-border/80 relative overflow-hidden">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                        <BarChart2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-foreground tracking-tight">Platform Performance Comparison</h3>
                        <p className="text-[11px] text-foreground/50">Cross-platform benchmarking for views, reach, audience growth, and monetization</p>
                    </div>
                </div>

                {/* Metric Selector Buttons */}
                <div className="flex items-center gap-1.5 bg-surface/80 p-1 rounded-xl border border-border/60">
                    <button
                        onClick={() => setSelectedMetric('views')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
                            selectedMetric === 'views' ? 'bg-accent text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                        }`}
                    >
                        <Eye className="w-3 h-3" /> Views
                    </button>
                    <button
                        onClick={() => setSelectedMetric('reach')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
                            selectedMetric === 'reach' ? 'bg-accent text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                        }`}
                    >
                        <Layers className="w-3 h-3" /> Reach
                    </button>
                    <button
                        onClick={() => setSelectedMetric('followers')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
                            selectedMetric === 'followers' ? 'bg-accent text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                        }`}
                    >
                        <Users className="w-3 h-3" /> Followers
                    </button>
                    <button
                        onClick={() => setSelectedMetric('earningsUsd')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
                            selectedMetric === 'earningsUsd' ? 'bg-emerald-500 text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                        }`}
                    >
                        <DollarSign className="w-3 h-3" /> Earnings
                    </button>
                </div>
            </div>

            {/* Custom SVG Bar Graph */}
            <div className="flex flex-col gap-5 my-2">
                {data.map((item, idx) => {
                    const value = item[selectedMetric] || 0;
                    const percentage = Math.max(5, Math.min(100, (value / maxVal) * 100));

                    return (
                        <div key={idx} className="flex flex-col gap-2 group">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                                    <span className="font-bold text-foreground tracking-wide">{item.platform}</span>
                                </div>
                                <span className="font-mono font-extrabold text-foreground tracking-wider">
                                    {formatVal(value)}
                                </span>
                            </div>

                            {/* Bar Track */}
                            <div className="w-full h-4 rounded-full bg-surface/90 border border-border/40 overflow-hidden relative p-0.5">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out relative group-hover:brightness-125"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: item.color,
                                        boxShadow: `0 0 15px ${item.color}50`
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Metric Insights Footer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/50 pt-4 text-center">
                <div className="p-3 rounded-lg bg-surface/40 border border-border/40">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-foreground/40 block">Top Views</span>
                    <span className="text-xs font-extrabold text-pink-400">Instagram (5.1M)</span>
                </div>
                <div className="p-3 rounded-lg bg-surface/40 border border-border/40">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-foreground/40 block">Top Direct Monetization</span>
                    <span className="text-xs font-extrabold text-blue-400">Facebook ($114.17)</span>
                </div>
                <div className="p-3 rounded-lg bg-surface/40 border border-border/40">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-foreground/40 block">Top Follower Magnet</span>
                    <span className="text-xs font-extrabold text-emerald-400">Instagram (+15.1k)</span>
                </div>
                <div className="p-3 rounded-lg bg-surface/40 border border-border/40">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-foreground/40 block">Live Video Count</span>
                    <span className="text-xs font-extrabold text-purple-400">FB (81) / IG (91)</span>
                </div>
            </div>
        </div>
    );
}
