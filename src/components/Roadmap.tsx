"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, AlertCircle, X, ChevronRight } from "lucide-react";

interface RoadmapPhase {
    id: string;
    title: string;
    description: string;
    status: "Current Objective" | "Pending Trajectory" | "Completed" | "Archived";
}

interface RoadmapTask {
    id: string;
    text: string;
    status: "todo" | "wip" | "done";
}

export default function Roadmap() {
    const [phases, setPhases] = useState<RoadmapPhase[]>([]);
    const [tasks, setTasks] = useState<RoadmapTask[]>([]);
    const [rawInput, setRawInput] = useState("");
    const [isParsing, setIsParsing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [notice, setNotice] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

    // Normalize tasks — old data may be plain strings, new data is RoadmapTask objects
    const normalizeTasks = (raw: any[]): RoadmapTask[] =>
        raw.map((t, i) =>
            typeof t === 'string'
                ? { id: `task-legacy-${i}`, text: t, status: 'todo' as const }
                : t
        );

    useEffect(() => {
        const fetchRoadmap = async () => {
            try {
                const res = await fetch('/api/parse-roadmap');
                const json = await res.json();
                if (json.success && json.data) {
                    setPhases(json.data.phases || []);
                    setTasks(normalizeTasks(json.data.tasks || []));
                }
            } catch (e) {
                console.error("Failed to load roadmap");
            } finally {
                setIsLoading(false);
            }
        };
        fetchRoadmap();
    }, []);

    const handleParse = async () => {
        if (!rawInput.trim()) return;
        setIsParsing(true);
        try {
            const res = await fetch('/api/parse-roadmap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawText: rawInput, currentPhases: phases, currentTasks: tasks })
            });
            const json = await res.json();
            if (json.success && json.data) {
                setPhases(json.data.phases || []);
                setTasks(json.data.tasks || []);
                setNotice({ message: "Strategic directive accepted and structured.", type: 'success' });
                setRawInput("");
            } else {
                setNotice({ message: json.error || "Failed to parse strategy.", type: 'error' });
            }
        } catch (e) {
            setNotice({ message: "Neural Uplink Interrupted.", type: 'error' });
        } finally {
            setIsParsing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-10 flex items-center gap-4 text-foreground/50 font-mono text-xs uppercase tracking-widest">
                <Loader2 className="animate-spin w-4 h-4" /> Synchronizing Roadmap...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10">
            {/* Notice Banner */}
            {notice && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 w-full max-w-md p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${notice.type === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : 'bg-green-500/10 border-green-500/20 text-green-500'
                    }`}>
                    {notice.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <Sparkles className="w-5 h-5 shrink-0" />}
                    <p className="flex-1 text-[11px] font-black uppercase tracking-widest leading-relaxed">{notice.message}</p>
                    <button onClick={() => setNotice(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center ml-1">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">Master Roadmap</h2>
                    <p className="text-[10px] text-foreground/60 uppercase tracking-[0.4em] font-black">Strategic Trajectory</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-surface/40 px-5 py-2.5 border border-border/10 squircle text-neutral-500 specular-reflect shadow-xl hidden md:block">
                    {phases.length} Active Phases
                </span>
            </div>

            {/* AI Ingestion Layer */}
            <div className="p-6 bg-surface/20 border border-border/10 squircle specular-reflect shadow-xl flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Strategic Injection</h3>
                </div>
                <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Paste raw AI strategic advice here. The system will mathematically distill it into actionable phases and tasks..."
                    className="w-full h-32 p-4 bg-black/20 border border-border/5 rounded-xl text-sm font-mono focus:outline-none focus:border-accent/50 placeholder:text-foreground/30 resize-y"
                />
                <div className="flex justify-end">
                    <button
                        onClick={handleParse}
                        disabled={isParsing || !rawInput.trim()}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isParsing ? 'bg-accent/20 text-accent animate-pulse' : !rawInput.trim() ? 'bg-black/20 text-foreground/30 cursor-not-allowed' : 'bg-accent text-background hover:scale-105 shadow-[0_0_20px_rgba(255,51,102,0.3)]'}`}
                    >
                        {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        {isParsing ? "Distilling Schema..." : "Execute AI Structuring"}
                    </button>
                </div>
            </div>

            {/* Dynamic Roadmap Layout */}
            <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-10">
                    <div className="flex flex-col gap-10 relative pl-12 border-l-2 border-border/5">
                        
                        {phases.length === 0 ? (
                            <div className="p-10 text-center opacity-30 italic font-mono text-sm">
                                Awaiting Strategic Injection...
                            </div>
                        ) : (
                            phases.map((phase, idx) => {
                                const isCurrent = phase.status === "Current Objective";
                                return (
                                    <div key={idx} className={`relative group p-10 border border-border/10 squircle overflow-hidden transition-all duration-1000 ${
                                        isCurrent ? 'bg-surface/20 specular-reflect shadow-2xl hover:bg-surface/30' : 'bg-black/10 opacity-60 hover:opacity-100'
                                    }`}>
                                        {isCurrent && <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 blur-[60px] rounded-full -mr-24 -mt-24" />}
                                        
                                        <div className={`absolute -left-[63px] top-12 w-6 h-6 rounded-full border-[5px] border-background transition-all duration-500 ${
                                            isCurrent ? 'bg-accent shadow-[0_0_20px_rgba(255,51,102,0.4)] group-hover:scale-125' : 'bg-neutral-900 group-hover:bg-accent/30'
                                        }`} />
                                        
                                        <div className="flex flex-col gap-3 relative z-10">
                                            <span className={`text-[10px] uppercase font-black tracking-[0.4em] ${isCurrent ? 'text-accent' : 'text-neutral-500'}`}>
                                                {phase.status || (idx === 0 ? "Current Objective" : "Pending Trajectory")}
                                            </span>
                                            <h3 className="text-xl font-black text-foreground tracking-tight uppercase">{phase.title}</h3>
                                            <p className="text-sm text-foreground/60 leading-relaxed max-w-2xl">{phase.description}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="flex flex-col gap-8 mt-6 relative z-10">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-neutral-500 ml-1">Strategic Command Log</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {tasks.length === 0 ? (
                                <div className="p-6 bg-surface/10 border border-border/5 squircle text-center opacity-30 italic font-mono text-sm">
                                    No active tasks detected.
                                </div>
                            ) : (
                                tasks.map((task) => {
                                    const nextStatus = task.status === 'todo' ? 'wip' : task.status === 'wip' ? 'done' : 'todo';
                                    const dotConfig = {
                                        todo: { color: 'bg-white/20', label: 'Not started', ring: 'ring-white/10' },
                                        wip:  { color: 'bg-amber-400', label: 'In progress', ring: 'ring-amber-400/30' },
                                        done: { color: 'bg-emerald-400', label: 'Completed',   ring: 'ring-emerald-400/30' },
                                    }[task.status];

                                    const cycleStatus = async () => {
                                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
                                        await fetch('/api/parse-roadmap', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ taskId: task.id, status: nextStatus })
                                        });
                                    };

                                    return (
                                        <div key={task.id} className={`flex items-center gap-4 px-5 py-4 bg-surface/20 border border-border/10 squircle group hover:border-accent/20 transition-all duration-500 specular-reflect shadow-xl ${
                                            task.status === 'done' ? 'opacity-50' : ''
                                        }`}>
                                            {/* Status dot — click to cycle */}
                                            <button
                                                onClick={cycleStatus}
                                                title={dotConfig.label}
                                                className={`w-3 h-3 rounded-full shrink-0 ring-2 ${dotConfig.color} ${dotConfig.ring} transition-all duration-300 hover:scale-125`}
                                            />
                                            <span className={`text-sm font-black tracking-tight leading-snug flex-1 ${
                                                task.status === 'done' ? 'line-through text-foreground/30' : 'text-foreground/80 group-hover:text-foreground'
                                            } transition-colors`}>{task.text}</span>
                                            <span className={`text-[9px] uppercase tracking-widest font-black shrink-0 ${
                                                task.status === 'todo' ? 'text-foreground/20' :
                                                task.status === 'wip'  ? 'text-amber-400' :
                                                'text-emerald-400'
                                            }`}>{task.status === 'todo' ? '—' : task.status === 'wip' ? 'WIP' : 'Done'}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
