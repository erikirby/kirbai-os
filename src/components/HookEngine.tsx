"use client";

import { useState } from "react";
import { Loader2, Zap, Crosshair, Flame, RefreshCw } from "lucide-react";
import type { HookConcept, HookScorecard } from "@/lib/hooks";

interface HookEngineProps {
    mode: "kirbai" | "factory";
}

export default function HookEngine({ mode }: HookEngineProps) {
    const [tab, setTab] = useState<"generate" | "score">("generate");
    const [song, setSong] = useState("");
    const [character, setCharacter] = useState("");
    const [notes, setNotes] = useState("");
    const [conceptText, setConceptText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [concepts, setConcepts] = useState<HookConcept[] | null>(null);
    const [scorecard, setScorecard] = useState<HookScorecard | null>(null);

    const run = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const body =
                tab === "generate"
                    ? { action: "generate", song, character, notes, mode }
                    : { action: "score", concept: conceptText, song, mode };
            const res = await fetch("/api/hook-engine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || "Request failed");
            if (tab === "generate") setConcepts(data.concepts);
            else setScorecard(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const scoreColor = (s: number) => (s >= 4 ? "text-emerald-400" : s === 3 ? "text-yellow-400" : "text-red-400");

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-accent font-bold tracking-[0.4em] uppercase opacity-80">Pipeline</span>
                <h2 className="text-3xl font-bold tracking-tighter text-white uppercase">Hook Engine</h2>
                <p className="text-[11px] text-neutral-500 max-w-2xl">
                    Attention engineering grounded in your measured retention data. The battle is seconds 3–10, not frame 1 — every concept is built around the second-5 decision point and a cold audience.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {([
                    { id: "generate", label: "Generate Hooks", icon: Flame },
                    { id: "score", label: "Analyze / Score", icon: Crosshair },
                ] as const).map((t) => (
                    <button
                        key={t.id}
                        onClick={() => { setTab(t.id); setError(null); }}
                        className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${tab === t.id ? "bg-accent text-white border-accent shadow-lg" : "bg-surface/40 border-border/10 text-neutral-500 hover:text-white hover:border-accent/40"}`}
                    >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Inputs */}
            <div className="rounded-2xl bg-surface/40 backdrop-blur-md border border-border/10 p-5 flex flex-col gap-3">
                {tab === "generate" ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input value={song} onChange={(e) => setSong(e.target.value)} placeholder='Song (e.g. "Magic Bounce (Hatterene Master)")'
                                className="bg-background/60 border border-border/10 rounded-xl px-4 py-3 text-[12px] text-white placeholder:text-neutral-600 outline-none focus:border-accent/40" />
                            <input value={character} onChange={(e) => setCharacter(e.target.value)} placeholder="Character (optional — leave blank to let it pick)"
                                className="bg-background/60 border border-border/10 rounded-xl px-4 py-3 text-[12px] text-white placeholder:text-neutral-600 outline-none focus:border-accent/40" />
                        </div>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes / constraints (optional — era, mood, banked assets, what to avoid)" rows={2}
                            className="bg-background/60 border border-border/10 rounded-xl px-4 py-3 text-[12px] text-white placeholder:text-neutral-600 outline-none focus:border-accent/40 resize-none" />
                    </>
                ) : (
                    <>
                        <textarea value={conceptText} onChange={(e) => setConceptText(e.target.value)} rows={4}
                            placeholder="Paste your hook / concept / opening-shot description. It will be scored on 7 axes against your retention data, with concrete fixes for anything weak."
                            className="bg-background/60 border border-border/10 rounded-xl px-4 py-3 text-[12px] text-white placeholder:text-neutral-600 outline-none focus:border-accent/40 resize-none" />
                        <input value={song} onChange={(e) => setSong(e.target.value)} placeholder="Song this promotes (optional)"
                            className="bg-background/60 border border-border/10 rounded-xl px-4 py-3 text-[12px] text-white placeholder:text-neutral-600 outline-none focus:border-accent/40" />
                    </>
                )}
                <div className="flex items-center gap-3">
                    <button onClick={run} disabled={isLoading || (tab === "score" && !conceptText.trim())}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 hover:scale-105 transition-all shadow-lg">
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        {tab === "generate" ? "Generate 5 Concepts" : "Score It"}
                    </button>
                    {error && <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">{error}</span>}
                </div>
            </div>

            {/* Generate results */}
            {tab === "generate" && concepts && (
                <div className="flex flex-col gap-3">
                    {concepts.map((c, i) => (
                        <div key={i} className="rounded-2xl bg-surface/40 backdrop-blur-md border border-border/10 p-5">
                            <div className="flex flex-wrap items-baseline gap-x-3 mb-3">
                                <span className="text-lg font-black text-accent/60">{i + 1}</span>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wide">{c.name}</h3>
                                <span className="text-[9px] font-mono text-accent uppercase tracking-widest">{c.archetype}</span>
                                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">runs on {c.arousal}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
                                {[
                                    ["Frame 1", c.frame1],
                                    ["0–3s", c.sec0to3],
                                    ["Second 5", c.second5],
                                    ["Open loop", c.openLoop],
                                    ["But then", c.butThen],
                                    ["Character", c.character],
                                ].map(([label, val]) => (
                                    <div key={label as string} className="flex gap-2">
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-accent/70 shrink-0 w-16 pt-0.5">{label}</span>
                                        <span className="text-neutral-300">{val}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-3 text-[10px] text-neutral-500 italic">Cold check: {c.coldCheck}</p>
                        </div>
                    ))}
                    <button onClick={run} disabled={isLoading} className="self-start flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-accent hover:text-white transition-colors">
                        <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} /> Regenerate
                    </button>
                </div>
            )}

            {/* Scorecard */}
            {tab === "score" && scorecard && (
                <div className="rounded-2xl bg-surface/40 backdrop-blur-md border border-border/10 p-5 flex flex-col gap-4">
                    <div className="flex items-baseline justify-between gap-4">
                        <p className="text-sm font-bold text-white">{scorecard.verdict}</p>
                        <span className={`text-2xl font-black shrink-0 ${scorecard.total >= 28 ? "text-emerald-400" : scorecard.total >= 21 ? "text-yellow-400" : "text-red-400"}`}>
                            {scorecard.total}<span className="text-[10px] text-neutral-500">/35</span>
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {scorecard.axes.map((a) => (
                            <div key={a.axis} className="rounded-xl bg-background/40 border border-border/10 p-3">
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-black w-6 ${scoreColor(a.score)}`}>{a.score}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/80">{a.axis}</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-background/80 overflow-hidden">
                                        <div className={`h-full rounded-full ${a.score >= 4 ? "bg-emerald-400" : a.score === 3 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${(a.score / 5) * 100}%` }} />
                                    </div>
                                </div>
                                <p className="text-[11px] text-neutral-400 mt-1.5 ml-9">{a.note}</p>
                                {a.fix && a.score <= 3 && <p className="text-[11px] text-accent mt-1 ml-9"><span className="font-black uppercase text-[8px] tracking-widest">Fix:</span> {a.fix}</p>}
                            </div>
                        ))}
                    </div>
                    {scorecard.strongestVersion && (
                        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">Strongest version of this concept</span>
                            <p className="text-[12px] text-neutral-200 mt-2">{scorecard.strongestVersion}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
