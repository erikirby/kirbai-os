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

export default function Roadmap({ mode = 'kirbai' }: { mode?: 'kirbai' | 'factory' }) {
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
                const res = await fetch(`/api/parse-roadmap?mode=${mode}`);
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
    }, [mode]);

    const handleParse = async () => {
        if (!rawInput.trim()) return;
        setIsParsing(true);
        try {
            const res = await fetch(`/api/parse-roadmap?mode=${mode}`, {
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
            <div className="p-10 flex items-center gap-4 text-foreground/50 font-medium text-sm">
                <Loader2 className="animate-spin w-4 h-4" /> Synchronizing Roadmap...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Notice Banner */}
            {notice && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 w-full max-w-md p-4 card flex items-center gap-3 ${notice.type === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-green-500/10 border-green-500/20 text-emerald-400'
                    }`}>
                    {notice.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <Sparkles className="w-5 h-5 shrink-0" />}
                    <p className="flex-1 text-sm font-medium">{notice.message}</p>
                    <button onClick={() => setNotice(null)} className="p-1 hover:bg-surface/40 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center ml-1">
                <div className="flex flex-col gap-1">
                    <p className="section-eyebrow">Strategic Trajectory</p>
                    <h2 className="section-title">Master Roadmap</h2>
                </div>
                <span className="badge hidden md:block">
                    {phases.length} Active Phases
                </span>
            </div>

            {/* AI Ingestion Layer */}
            <div className="card p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <h3 className="section-subtitle">Strategic Injection</h3>
                </div>
                <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Paste raw AI strategic advice here. The system will mathematically distill it into actionable phases and tasks..."
                    className="input-field w-full h-32 p-4 text-sm resize-y"
                />
                <div className="flex justify-end">
                    <button
                        onClick={handleParse}
                        disabled={isParsing || !rawInput.trim()}
                        className={`flex items-center gap-2 px-6 py-3 transition-all ${isParsing ? 'btn-secondary animate-pulse' : !rawInput.trim() ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}`}
                    >
                        {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        {isParsing ? "Distilling Schema..." : "Execute AI Structuring"}
                    </button>
                </div>
            </div>

            {/* Dynamic Roadmap Layout */}
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-8 relative pl-12 border-l-2 border-border/5">
                        
                        {phases.length === 0 ? (
                            <div className="p-10 text-center text-foreground/50 italic text-sm">
                                Awaiting Strategic Injection...
                            </div>
                        ) : (
                            phases.map((phase, idx) => {
                                const isCurrent = phase.status === "Current Objective";
                                return (
                                    <div key={idx} className={`relative group card p-6 transition-all duration-1000 ${
                                        isCurrent ? 'bg-surface/20 hover:bg-surface/30' : 'bg-surface/10 opacity-60 hover:opacity-100'
                                    }`}>
                                        {isCurrent && <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 blur-[60px] rounded-full -mr-24 -mt-24" />}
                                        
                                        <div className={`absolute -left-[57px] top-8 w-6 h-6 rounded-full border-[5px] border-background transition-all duration-500 ${
                                            isCurrent ? 'bg-accent shadow-[0_0_20px_rgba(255,51,102,0.4)] group-hover:scale-125' : 'bg-surface-elevated group-hover:bg-accent/30'
                                        }`} />
                                        
                                        <div className="flex flex-col gap-3 relative z-10">
                                            <span className={`section-eyebrow ${isCurrent ? 'text-accent' : 'text-foreground/50'}`}>
                                                {phase.status || (idx === 0 ? "Current Objective" : "Pending Trajectory")}
                                            </span>
                                            <h3 className="text-xl font-extrabold text-foreground tracking-tight">{phase.title}</h3>
                                            <p className="text-sm text-foreground/60 leading-relaxed max-w-2xl">{phase.description}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="flex flex-col gap-4 mt-6 relative z-10">
                        <h3 className="section-subtitle ml-1">Strategic Command Log</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {tasks.length === 0 ? (
                                <div className="card p-6 text-center text-foreground/50 italic text-sm">
                                    No active tasks detected.
                                </div>
                            ) : (
                                tasks.map((task) => {
                                    const nextStatus = task.status === 'todo' ? 'wip' : task.status === 'wip' ? 'done' : 'todo';
                                    const dotConfig = {
                                        todo: { color: 'bg-foreground/20', label: 'Not started', ring: 'ring-foreground/10' },
                                        wip:  { color: 'bg-amber-400', label: 'In progress', ring: 'ring-amber-400/30' },
                                        done: { color: 'bg-emerald-400', label: 'Completed',   ring: 'ring-emerald-400/30' },
                                    }[task.status];

                                    const cycleStatus = async () => {
                                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
                                        await fetch(`/api/parse-roadmap?mode=${mode}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ taskId: task.id, status: nextStatus })
                                        });
                                    };

                                    return (
                                        <div key={task.id} className={`card p-4 flex items-center gap-4 group hover:border-accent/20 transition-all duration-500 ${
                                            task.status === 'done' ? 'opacity-50' : ''
                                        }`}>
                                            {/* Status dot — click to cycle */}
                                            <button
                                                onClick={cycleStatus}
                                                title={dotConfig.label}
                                                className={`w-3 h-3 rounded-full shrink-0 ring-2 ${dotConfig.color} ${dotConfig.ring} transition-all duration-300 hover:scale-125`}
                                            />
                                            <span className={`text-sm font-medium leading-snug flex-1 ${
                                                task.status === 'done' ? 'line-through text-foreground/30' : 'text-foreground/80 group-hover:text-foreground'
                                            } transition-colors`}>{task.text}</span>
                                            <span className={`text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                                                task.status === 'todo' ? 'text-foreground/40' :
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
