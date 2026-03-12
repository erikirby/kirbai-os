"use client";

import { useState, useEffect } from "react";
import { Clapperboard, Play, Check, Copy, AlertCircle, Sparkles, ChevronRight, MessageSquare, Download, Trash2, Loader2 } from "lucide-react";

interface Shot {
    id: string;
    timestamp: string;
    lyric?: string;
    visualDescription: string;
    personaCritiques?: {
        director?: string;
        strategist?: string;
    };
    bananaPrompt?: string;
    grokTrigger?: string;
    status: string;
}

interface Mission {
    id: string;
    conceptId: string;
    title: string;
    alias: string;
    mode: "kirbai" | "factory";
    shots: Shot[];
    createdAt: string;
}

export default function DirectorSuite({ mode }: { mode: "kirbai" | "factory" }) {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [activeMission, setActiveMission] = useState<Mission | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetchMissions();
    }, [mode]);

    const fetchMissions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/missions?mode=${mode}`);
            const data = await res.json();
            if (data.success) {
                setMissions(data.data);
                if (data.data.length > 0 && !activeMission) {
                    setActiveMission(data.data[0]);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const copyPrompt = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-accent" />
            <span className="text-[11px] font-black text-accent uppercase tracking-[0.6em] animate-pulse">Initializing Studio</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex justify-between items-center ml-1">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">The Director's Suite</h2>
                    <p className="text-[10px] text-foreground/60 uppercase tracking-[0.4em] font-black">Multi-Agent Narrative Planning</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Missions Sidebar */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2">Live Missions</h3>
                    {missions.length === 0 ? (
                        <div className="p-8 border border-dashed border-border/20 rounded-3xl text-center">
                            <p className="text-[10px] uppercase font-black text-foreground/20 leading-loose">No active missions.<br/>Promote a concept from the Creative Hub to begin.</p>
                        </div>
                    ) : (
                        missions.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setActiveMission(m)}
                                className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-2 ${activeMission?.id === m.id ? 'bg-accent/10 border-accent/40 shadow-lg' : 'bg-surface/30 border-border/10 hover:border-accent/20'}`}
                            >
                                <span className={`text-[9px] font-black uppercase tracking-widest ${activeMission?.id === m.id ? 'text-accent' : 'text-foreground/40'}`}>{m.alias}</span>
                                <span className="text-xs font-bold truncate">{m.title}</span>
                                <span className="text-[9px] font-mono text-foreground/30 uppercase">{m.shots.length} SHOTS</span>
                            </button>
                        ))
                    )}
                </div>

                {/* Shot Matrix */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    {!activeMission ? (
                        <div className="flex-1 bg-surface/20 border border-border/5 rounded-[40px] p-20 flex flex-col items-center justify-center text-center gap-6">
                            <Clapperboard className="w-16 h-16 text-foreground/5 opacity-20" />
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-foreground/20">Select a mission to view the matrix</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {/* Mission Header */}
                            <div className="p-8 bg-surface/40 border border-border/10 rounded-[40px] flex justify-between items-center glass">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-3xl bg-accent/20 flex items-center justify-center border border-accent/20 shadow-inner">
                                        <Play className="w-8 h-8 text-accent fill-accent" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-2xl font-black uppercase tracking-tight">{activeMission.title}</h3>
                                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-foreground/40">
                                            <span className="text-accent underline">Active Mission</span>
                                            <span>•</span>
                                            <span>{new Date(activeMission.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-4 bg-white/5 border border-white/5 rounded-2xl text-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Matrix Table */}
                            <div className="bg-surface/20 border border-border/10 rounded-[40px] overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border/10 bg-black/20">
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/40">Time</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/40">Visual Sequence</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/40">Agent Critiques</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/40 text-right">Prompts</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/5">
                                        {activeMission.shots.map((shot, idx) => (
                                            <tr key={shot.id} className="group hover:bg-white/5 transition-colors">
                                                <td className="p-6 align-top">
                                                    <span className="text-[11px] font-mono font-black text-accent bg-accent/5 px-2 py-1 rounded-md">{shot.timestamp}</span>
                                                </td>
                                                <td className="p-6 align-top max-w-sm">
                                                    <p className="text-sm leading-relaxed font-medium text-foreground/80">{shot.visualDescription}</p>
                                                </td>
                                                <td className="p-6 align-top max-w-sm">
                                                    <div className="flex flex-col gap-3">
                                                        {shot.personaCritiques?.director && (
                                                            <div className="flex gap-2">
                                                                <div className="w-4 h-4 bg-purple-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                                                    <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                                                </div>
                                                                <p className="text-[10px] leading-relaxed text-foreground/50"><span className="text-purple-400 font-black uppercase tracking-tighter">Director:</span> {shot.personaCritiques.director}</p>
                                                            </div>
                                                        )}
                                                        {shot.personaCritiques?.strategist && (
                                                            <div className="flex gap-2">
                                                                <div className="w-4 h-4 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                                                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                                                                </div>
                                                                <p className="text-[10px] leading-relaxed text-foreground/50"><span className="text-emerald-400 font-black uppercase tracking-tighter">Strategist:</span> {shot.personaCritiques.strategist}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6 align-top text-right">
                                                    <div className="flex flex-col gap-2 items-end">
                                                        <button 
                                                            onClick={() => copyPrompt(shot.bananaPrompt || "", `${shot.id}-banana`)}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${copiedId === `${shot.id}-banana` ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-surface/40 border-border/10 hover:border-accent'}`}
                                                        >
                                                            {copiedId === `${shot.id}-banana` ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3 text-accent" />}
                                                            Banana Prompt
                                                        </button>
                                                        <button 
                                                            onClick={() => copyPrompt(shot.grokTrigger || "", `${shot.id}-grok`)}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${copiedId === `${shot.id}-grok` ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-surface/40 border-border/10 hover:border-accent'}`}
                                                        >
                                                            {copiedId === `${shot.id}-grok` ? <Check className="w-3 h-3" /> : <Play className="w-3 h-3 text-accent" />}
                                                            Grok Trigger
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
