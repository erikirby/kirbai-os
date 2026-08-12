"use client";

import React, { useState } from 'react';
import { Calendar, DollarSign, Music, AlertCircle } from 'lucide-react';

interface SaleMonthItem {
    name: string;
    quantity: number;
    earningsUsd: number;
}

interface TimelineProps {
    data: SaleMonthItem[];
}

export default function RevenueTimelineChart({ data }: TimelineProps) {
    const [viewType, setViewType] = useState<'earnings' | 'quantity'>('earnings');

    if (!data || data.length === 0) {
        return (
            <div className="card p-6 flex flex-col items-center justify-center text-center text-foreground/40 gap-2">
                <AlertCircle className="w-6 h-6 text-amber-400" />
                <p className="text-xs">No monthly revenue timeline data available.</p>
            </div>
        );
    }

    const maxVal = Math.max(...data.map(d => viewType === 'earnings' ? d.earningsUsd : d.quantity), 1);

    const formatVal = (val: number) => {
        if (viewType === 'earnings') return `$${val.toFixed(2)}`;
        return val.toLocaleString();
    };

    return (
        <div className="card p-6 flex flex-col gap-6 border border-border/80 relative overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-foreground tracking-tight">DistroKid Monthly Royalty Timeline</h3>
                        <p className="text-[11px] text-foreground/50">Historical revenue & stream volume trajectory by reporting sale month</p>
                    </div>
                </div>

                {/* View Selector */}
                <div className="flex items-center gap-1.5 bg-surface/80 p-1 rounded-xl border border-border/60">
                    <button
                        onClick={() => setViewType('earnings')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
                            viewType === 'earnings' ? 'bg-emerald-500 text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                        }`}
                    >
                        <DollarSign className="w-3 h-3" /> Royalties ($)
                    </button>
                    <button
                        onClick={() => setViewType('quantity')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
                            viewType === 'quantity' ? 'bg-purple-500 text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                        }`}
                    >
                        <Music className="w-3 h-3" /> Streams / Quantity
                    </button>
                </div>
            </div>

            {/* Visual Bar Timeline Grid */}
            <div className="flex items-end gap-2 h-52 pt-8 pb-4 px-2 overflow-x-auto custom-scrollbar border-b border-border/30">
                {data.map((item, idx) => {
                    const value = viewType === 'earnings' ? item.earningsUsd : item.quantity;
                    // Min 10% height for any non-zero value so small months are clearly visible
                    const rawPct = maxVal > 0 ? (value / maxVal) * 100 : 0;
                    const heightPercent = value > 0 ? Math.max(10, Math.min(100, rawPct)) : 4;

                    return (
                        <div key={idx} className="flex-1 min-w-[28px] h-full flex flex-col items-center justify-end gap-2 group relative">
                            {/* Hover Tooltip */}
                            <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-border px-2.5 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap z-30 pointer-events-none shadow-2xl">
                                <span className="text-foreground/70 font-bold block">{item.name}</span>
                                <span className={viewType === 'earnings' ? 'text-emerald-400 font-black' : 'text-purple-400 font-black'}>
                                    {formatVal(value)}
                                </span>
                            </div>

                            {/* Bar Column Container */}
                            <div className="w-full bg-surface/80 rounded-t-lg border-t border-x border-border/40 flex items-end justify-center p-0.5 h-36 relative overflow-hidden">
                                <div
                                    className={`w-full rounded-t-md transition-all duration-700 ease-out group-hover:brightness-125 ${
                                        viewType === 'earnings' 
                                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]' 
                                            : 'bg-gradient-to-t from-purple-600 to-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                                    }`}
                                    style={{ height: `${heightPercent}%` }}
                                />
                            </div>

                            {/* Date Label */}
                            <span className="text-[9px] font-mono font-semibold text-foreground/50 rotate-45 origin-left whitespace-nowrap mt-2">
                                {item.name}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Footnote */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-foreground/40 bg-surface/30 p-3 rounded-lg border border-border/40 mt-4">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>
                    Reporting Caveat: DistroKid royalties arrive on a 2–3 month latency delay. The newest month ({data[data.length - 1]?.name}) represents partial earnings and should not be directly compared with mature reporting periods.
                </span>
            </div>
        </div>
    );
}
