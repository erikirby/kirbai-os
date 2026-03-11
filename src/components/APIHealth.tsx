"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "@/components/Icons";

interface ApiLog {
    timestamp: number;
    route: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
}

interface TelemetryData {
    lifetimeInputTokens: number;
    lifetimeOutputTokens: number;
    lifetimeCost: number;
    logs: ApiLog[];
}

interface APIHealthProps {
    theme?: string;
}

export default function APIHealth({ theme = "dark" }: APIHealthProps) {
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResetting, setIsResetting] = useState(false);

    const BUDGET_LIMIT = 5.00;

    const fetchTelemetry = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/telemetry');
            const data = await res.json();
            if (data.success) {
                setTelemetry(data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset the telemetry counters? This normally happens at the start of a billing month.")) return;
        setIsResetting(true);
        try {
            const res = await fetch('/api/telemetry?action=reset', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setTelemetry(data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsResetting(false);
        }
    };

    useEffect(() => {
        fetchTelemetry();
    }, []);

    if (isLoading && !telemetry) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
                <Loader2 className="w-12 h-12 animate-spin text-accent" />
                <span className="text-[11px] font-black text-accent uppercase tracking-[0.6em] animate-pulse">Syncing Telemetry Array</span>
            </div>
        );
    }

    if (!telemetry) return null;

    const percentUsed = Math.min((telemetry.lifetimeCost / BUDGET_LIMIT) * 100, 100);

    return (
        <div className="flex flex-col gap-10">
            <div className="flex justify-between items-end ml-1">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">API Health Matrix</h2>
                    <p className="text-[10px] text-foreground/50 uppercase tracking-[0.5em] font-black">Local Telemetry & Budget Caps</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleReset}
                        disabled={isResetting}
                        className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500 text-red-500 text-[10px] font-black uppercase tracking-[0.4em] squircle transition-all shadow-2xl active:scale-95 flex items-center gap-2"
                    >
                        {isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reset Cycle"}
                    </button>
                    <button
                        onClick={fetchTelemetry}
                        className="px-6 py-2.5 bg-accent/10 hover:bg-accent border border-accent/20 hover:border-accent text-accent hover:text-white text-[10px] font-black uppercase tracking-[0.4em] squircle transition-all shadow-2xl shadow-accent/5 active:scale-95 flex items-center gap-2"
                    >
                        Refresh Network
                    </button>
                </div>
            </div>

            {/* Budget Bar UI */}
            <div className={`p-10 border squircle shadow-2xl relative overflow-hidden group ${theme === 'snes' ? 'bg-surface/60 border-b-4 border-r-4' : 'bg-surface/30 glass border-border/10'}`}>
                <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 blur-[100px] rounded-full -mr-40 -mt-40 group-hover:scale-125 transition-transform duration-2000" />
                <div className="flex flex-col gap-6 relative z-10">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black tracking-[0.4em] uppercase text-accent">Monthly Safety Cap</span>
                        <div className="flex flex-col items-end">
                            <span className="text-4xl font-black tracking-tighter">${telemetry.lifetimeCost.toFixed(4)} / ${BUDGET_LIMIT.toFixed(2)}</span>
                            <span className="text-[10px] font-mono text-foreground/50">ESTIMATED SPEND</span>
                        </div>
                    </div>

                    <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                        <div
                            className={`h-full transition-all duration-1000 ease-out ${percentUsed > 90 ? 'bg-red-500' : percentUsed > 75 ? 'bg-orange-500' : 'bg-accent shadow-[0_0_15px_rgba(255,51,102,0.8)]'}`}
                            style={{ width: `${Math.max(percentUsed, 1)}%` }} // Show at least 1% so it's visible
                        ></div>
                        {/* 100% cap marker */}
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse"></div>
                    </div>
                </div>
            </div>

            {/* Token Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-8 border squircle flex flex-col gap-4 ${theme === 'snes' ? 'bg-surface/60 border-b-4 border-r-4' : 'bg-surface/30 glass border-border/10'}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50">Lifetime Input Tokens</span>
                    <span className="text-3xl font-black text-foreground">{telemetry.lifetimeInputTokens.toLocaleString()}</span>
                    <span className="text-[9px] font-mono text-foreground/40">$0.10 per 1M (Gemini 2.0 Flash)</span>
                </div>
                <div className={`p-8 border squircle flex flex-col gap-4 ${theme === 'snes' ? 'bg-surface/60 border-b-4 border-r-4' : 'bg-surface/30 glass border-border/10'}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50">Lifetime Output Tokens</span>
                    <span className="text-3xl font-black text-foreground">{telemetry.lifetimeOutputTokens.toLocaleString()}</span>
                    <span className="text-[9px] font-mono text-foreground/40">$0.40 per 1M (Gemini 2.0 Flash)</span>
                </div>
            </div>

            {/* Recent API Actions */}
            <div className={`p-8 border squircle flex flex-col gap-6 ${theme === 'snes' ? 'bg-surface/60 border-b-4 border-r-4' : 'bg-surface/30 glass border-border/10'}`}>
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/80">Network Transmission Log</span>
                    <span className="text-[9px] font-mono text-accent">Latest 100 queries</span>
                </div>

                {telemetry.logs.length === 0 ? (
                    <div className="py-10 text-center text-[10px] font-mono text-foreground/40">No network transmissions recorded yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/10">
                                    <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-foreground/50">Timestamp</th>
                                    <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-foreground/50">Neural Route</th>
                                    <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-foreground/50 text-right">Input TKN</th>
                                    <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-foreground/50 text-right">Output TKN</th>
                                    <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-foreground/50 text-right">Est. Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {telemetry.logs.map((log, i) => (
                                    <tr key={i} className="border-b border-border/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4 text-[10px] font-mono text-foreground/70">
                                            {new Date(log.timestamp).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-1 bg-accent/10 text-accent rounded-md text-[9px] font-black uppercase tracking-wider">{log.route}</span>
                                        </td>
                                        <td className="py-3 px-4 text-[10px] font-mono text-foreground/80 text-right">{log.inputTokens.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-[10px] font-mono text-foreground/80 text-right">{log.outputTokens.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-[10px] font-mono font-bold text-emerald-400 text-right">${log.estimatedCost.toFixed(6)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
