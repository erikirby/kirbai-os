"use client";

import React from 'react';
import { PieChart, Music, DollarSign } from 'lucide-react';

interface StoreItem {
    name: string;
    earningsUsd: number;
    quantity: number;
}

interface DistributionProps {
    stores: StoreItem[];
    totalEarnings: number;
}

export default function RevenueDistributionChart({ stores, totalEarnings }: DistributionProps) {
    if (!stores || stores.length === 0) return null;

    const colors = [
        '#1DB954', // Spotify Green
        '#FF0000', // YouTube Red
        '#FA2D48', // Apple Music Pink
        '#E5C07B', // iTunes Gold
        '#1877F2', // Facebook Blue
        '#00E5FF', // Tidal Cyan
        '#A855F7', // Deezer Purple
        '#FF9900', // Amazon Orange
        '#64748B'  // Other Slate
    ];

    return (
        <div className="card p-6 flex flex-col gap-6 border border-border/80 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                    <PieChart className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="text-base font-extrabold text-foreground tracking-tight">Revenue Breakdown by Store & Service</h3>
                    <p className="text-[11px] text-foreground/50">Gross royalty distribution across streaming platforms and digital stores</p>
                </div>
            </div>

            {/* Platform List Grid */}
            <div className="flex flex-col gap-3">
                {stores.slice(0, 8).map((store, idx) => {
                    const color = colors[idx % colors.length];
                    const percentage = totalEarnings > 0 ? (store.earningsUsd / totalEarnings) * 100 : 0;

                    return (
                        <div key={idx} className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-surface/40 hover:bg-surface/70 transition-all border border-border/30">
                            <div className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                                    <span className="text-foreground font-bold">{store.name}</span>
                                </div>
                                <div className="flex items-center gap-4 font-mono">
                                    <span className="text-foreground/50 text-[10px]">{store.quantity.toLocaleString()} streams</span>
                                    <span className="text-emerald-400 font-extrabold">${store.earningsUsd.toFixed(2)}</span>
                                    <span className="text-[10px] text-foreground/40 w-12 text-right">{percentage.toFixed(1)}%</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-2 rounded-full bg-surface border border-border/30 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${Math.max(2, percentage)}%`,
                                        backgroundColor: color
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
