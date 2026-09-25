"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import type { StoryCharacter, StoryRoomState, RoadmapCard } from "@/lib/story-room-seed";

interface StoryRoomProps {
    theme?: string;
    mode?: "kirbai" | "factory";
}

const ROLE_STYLES: Record<StoryCharacter["role"], string> = {
    lead: "border-accent/70",
    supporting: "border-border",
    mystery: "border-purple-400/70 border-dashed",
};

const SHEETS = [
    { id: "board", label: "Season build-up" },
    { id: "roadmap", label: "Skit roadmap" },
    { id: "music", label: "Music videos" },
    { id: "battle", label: "Final battle" },
] as const;
type Sheet = (typeof SHEETS)[number]["id"];

const ROADMAP_STATUS: Record<RoadmapCard["status"], { badge: string; next: RoadmapCard["status"] }> = {
    done: { badge: "text-emerald-500 bg-emerald-400/10 border-emerald-400/20", next: "optional" },
    next: { badge: "text-accent bg-accent/10 border-accent/20", next: "done" },
    optional: { badge: "text-foreground/50 bg-foreground/5 border-foreground/10", next: "next" },
    event: { badge: "text-purple-400 bg-purple-400/10 border-purple-400/20", next: "event" },
};

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `character-${Date.now()}`;

export default function StoryRoom({ mode = "kirbai" }: StoryRoomProps) {
    const [state, setState] = useState<StoryRoomState>({ era: "", characters: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [sheet, setSheet] = useState<Sheet>("board");
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsaved, setHasUnsaved] = useState(false);

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Load ---
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setLoadError(false);
        (async () => {
            try {
                const res = await fetch(`/api/story-room?mode=${mode}`, { cache: "no-store" });
                if (!res.ok) throw new Error("Story Room load failed");
                const data = (await res.json()) as StoryRoomState;
                if (cancelled) return;
                setState({
                    era: data.era ?? "",
                    characters: Array.isArray(data.characters) ? data.characters : [],
                    skitRoadmap: data.skitRoadmap,
                    musicVideos: data.musicVideos,
                    finalBattle: data.finalBattle,
                });
                setSelectedId(data.characters?.[0]?.id ?? null);
            } catch {
                if (!cancelled) setLoadError(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [mode]);

    // --- Persistence (debounced) ---
    const persist = useCallback((next: StoryRoomState) => {
        setHasUnsaved(true);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                const res = await fetch(`/api/story-room?mode=${mode}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(next),
                });
                if (!res.ok) throw new Error(String(res.status));
                setHasUnsaved(false);
            } catch (e) {
                console.error("Story Room save failed:", e);
            } finally {
                setIsSaving(false);
            }
        }, 1000);
    }, [mode]);

    const mutate = useCallback((updater: (chars: StoryCharacter[]) => StoryCharacter[]) => {
        setState(prev => {
            const next = { ...prev, characters: updater(prev.characters) };
            persist(next);
            return next;
        });
    }, [persist]);

    const cycleRoadmapStatus = useCallback((step: number) => {
        setState(prev => {
            if (!prev.skitRoadmap) return prev;
            const cards = prev.skitRoadmap.cards.map(c =>
                c.step === step ? { ...c, status: ROADMAP_STATUS[c.status].next } : c
            );
            const next = { ...prev, skitRoadmap: { ...prev.skitRoadmap, cards } };
            persist(next);
            return next;
        });
    }, [persist]);

    useEffect(() => {
        const warn = (e: BeforeUnloadEvent) => {
            if (hasUnsaved) { e.preventDefault(); e.returnValue = ""; }
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [hasUnsaved]);

    const selected = useMemo(
        () => state.characters.find(c => c.id === selectedId) ?? null,
        [state.characters, selectedId]
    );

    // Each lead gets a group; side characters join the first lead they're tied to.
    const detailRef = useRef<HTMLDivElement | null>(null);
    const groups = useMemo(() => {
        const leads = state.characters.filter(c => c.role === "lead");
        const leadIds = new Set(leads.map(l => l.id));
        const byLead = new Map<string, StoryCharacter[]>(leads.map(l => [l.id, [l]]));
        const mysteries: StoryCharacter[] = [];
        const others: StoryCharacter[] = [];
        for (const c of state.characters) {
            if (c.role === "lead") continue;
            if (c.role === "mystery") { mysteries.push(c); continue; }
            const home = c.related.find(r => leadIds.has(r));
            if (home) byLead.get(home)!.push(c); else others.push(c);
        }
        const out = leads.map(l => ({ key: l.id, label: byLead.get(l.id)!.length > 1 ? `${l.name}'s circle` : l.name, members: byLead.get(l.id)! }));
        // Solo leads share one row instead of each taking a whole group.
        const solo = out.filter(g => g.members.length === 1).flatMap(g => g.members);
        const grouped = out.filter(g => g.members.length > 1);
        return [
            ...grouped,
            ...(solo.length ? [{ key: "solo", label: "Other leads", members: solo }] : []),
            ...(mysteries.length ? [{ key: "mystery", label: "Mysteries", members: mysteries }] : []),
            ...(others.length ? [{ key: "others", label: "Everyone else", members: others }] : []),
        ];
    }, [state.characters]);

    const patchSelected = (patch: Partial<StoryCharacter>) => {
        if (!selected) return;
        mutate(chars => chars.map(c => (c.id === selected.id ? { ...c, ...patch } : c)));
    };

    // --- Character add / remove ---
    const addCharacter = () => {
        const name = "New Character";
        let id = slugify(name);
        const existing = new Set(state.characters.map(c => c.id));
        let n = 1;
        while (existing.has(id)) id = `${slugify(name)}-${++n}`;
        const fresh: StoryCharacter = {
            id, name, icon: "", tag: "New thread", x: 50, y: 50,
            role: "supporting", tension: "", seeds: [], payoff: "", open: "", related: [],
        };
        mutate(chars => [...chars, fresh]);
        setSelectedId(id);
        setEditing(true);
    };

    const removeCharacter = (id: string) => {
        mutate(chars =>
            chars.filter(c => c.id !== id).map(c => ({ ...c, related: c.related.filter(r => r !== id) }))
        );
        setSelectedId(prev => (prev === id ? null : prev));
    };

    const toggleRelation = (otherId: string) => {
        if (!selected || otherId === selected.id) return;
        const has = selected.related.includes(otherId);
        mutate(chars =>
            chars.map(c => {
                if (c.id === selected.id)
                    return { ...c, related: has ? c.related.filter(r => r !== otherId) : [...c.related, otherId] };
                if (c.id === otherId)
                    return { ...c, related: has ? c.related.filter(r => r !== selected.id) : [...c.related, selected.id] };
                return c;
            })
        );
    };

    // --- Seeds editing ---
    const setSeed = (i: number, val: string) =>
        patchSelected({ seeds: selected!.seeds.map((s, idx) => (idx === i ? val : s)) });
    const addSeed = () => patchSelected({ seeds: [...selected!.seeds, ""] });
    const removeSeed = (i: number) =>
        patchSelected({ seeds: selected!.seeds.filter((_, idx) => idx !== i) });

    if (isLoading) {
        return (
            <div className="w-full h-96 flex flex-col items-center justify-center gap-3 text-foreground/50">
                <Loader2 className="w-7 h-7 animate-spin text-accent" />
                <span className="text-xs font-mono">Opening the Story Room…</span>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="card p-6 flex flex-col gap-4" role="alert">
                <p>Could not load the Story Room. Reload before editing so you don&apos;t overwrite the saved board.</p>
                <button className="btn-secondary self-start" onClick={() => window.location.reload()}>Reload</button>
            </div>
        );
    }

    const nameById = (id: string) => state.characters.find(c => c.id === id)?.name ?? id;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="section-title">Story Room</h2>
                    <p className="text-sm text-foreground/50 mt-0.5">
                        {state.era ? `${state.era} · ` : ""}Tap anyone to see their wound, the seeds to plant, and their finale payoff.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 max-w-full">
                    <div className="flex p-0.5 bg-foreground/5 rounded-full mr-1 overflow-x-auto max-w-full">
                        {SHEETS.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSheet(s.id)}
                                className={`px-3.5 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all ${sheet === s.id ? "bg-surface text-foreground shadow" : "text-foreground/50 hover:text-foreground/80"}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-foreground/40">
                        {isSaving ? "Saving…" : hasUnsaved ? "Unsaved" : "Synced"}
                    </span>
                    {sheet === "board" && editing && (
                        <button onClick={addCharacter} className="btn-secondary text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" /> Character
                        </button>
                    )}
                    {sheet === "board" && (
                        <button
                            onClick={() => setEditing(v => !v)}
                            className={`text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 ${editing ?"btn-primary" : "btn-secondary"}`}
                        >
                            {editing ? <><Check className="w-3.5 h-3.5" /> Done</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
                        </button>
                    )}
                </div>
            </div>

            {sheet === "roadmap" && <SkitRoadmapSheet roadmap={state.skitRoadmap} onCycleStatus={cycleRoadmapStatus} />}
            {sheet === "music" && <MusicVideoSheetView sheets={state.musicVideos} />}
            {sheet === "battle" && <FinalBattleSheetView beats={state.finalBattle} />}

            {sheet === "board" && <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6 items-start">
                {/* Board: one group per lead, side characters with them, so nobody overlaps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                    {groups.map(g => (
                        <div key={g.key} className="rounded-2xl border border-border bg-surface/40 p-3">
                            <div className="text-xs font-medium text-foreground/45 px-1 pb-2">{g.label}</div>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
                                {g.members.map(c => {
                                    const isSel = c.id === selectedId;
                                    const linked = !!selected && selected.related.includes(c.id);
                                    const dim = !!selected && !isSel && !linked;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedId(isSel ? null : c.id);
                                                // On narrow screens the story panel sits below the board; bring it into view.
                                                if (!isSel && window.innerWidth < 1280) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                                            }}
                                            title={`${c.name}: ${c.tag}`}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-xl bg-background/70 border transition-all ${ROLE_STYLES[c.role]} ${isSel ? "ring-2 ring-accent" : linked ? "ring-1 ring-accent/60" : ""} ${dim ? "opacity-35" : ""}`}
                                        >
                                            <span className="w-11 h-11 rounded-lg overflow-hidden bg-surface/60 flex items-center justify-center">
                                                {c.icon
                                                    ? <Image src={c.icon} alt="" width={44} height={44} className="object-contain" />
                                                    : <span className="text-lg font-bold text-foreground/40">{c.name.charAt(0)}</span>}
                                            </span>
                                            <strong className="text-[11px] leading-tight text-center text-foreground line-clamp-1 w-full">{c.name}</strong>
                                            <small className="text-[10px] leading-tight text-center text-foreground/45 line-clamp-2 w-full">{c.tag}</small>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detail */}
                <div ref={detailRef} className="card p-5 flex flex-col gap-4 min-h-[300px] xl:!sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto scroll-mt-20">
                    {!selected ? (
                        <p className="text-sm text-foreground/50 m-auto">Tap a character to open their story. Everyone tied to them lights up.</p>
                    ) : (
                        <>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    {editing ? (
                                        <input
                                            value={selected.name}
                                            onChange={e => patchSelected({ name: e.target.value })}
                                            className="w-full bg-transparent border-b border-border text-lg font-extrabold text-foreground focus:outline-none focus:border-accent"
                                        />
                                    ) : (
                                        <h3 className="text-lg font-extrabold text-foreground">{selected.name}</h3>
                                    )}
                                    {editing ? (
                                        <input
                                            value={selected.tag}
                                            onChange={e => patchSelected({ tag: e.target.value })}
                                            className="mt-1 w-full bg-transparent border-b border-border/60 text-xs text-foreground/60 focus:outline-none focus:border-accent"
                                        />
                                    ) : (
                                        <span className="text-[11px] font-mono tracking-wide text-accent/80">{selected.tag}</span>
                                    )}
                                </div>
                                {editing && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selected.role}
                                            onChange={e => patchSelected({ role: e.target.value as StoryCharacter["role"] })}
                                            className="bg-surface/60 border border-border rounded-md text-[10px] px-1.5 py-1 text-foreground"
                                        >
                                            <option value="lead">lead</option>
                                            <option value="supporting">supporting</option>
                                            <option value="mystery">mystery</option>
                                        </select>
                                        <button onClick={() => removeCharacter(selected.id)} title="Remove character" className="text-foreground/40 hover:text-red-400">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <Field label="Current wound">
                                {editing ? (
                                    <textarea value={selected.tension} onChange={e => patchSelected({ tension: e.target.value })} className={taClass} rows={3} />
                                ) : (
                                    <p className={pClass}>{selected.tension || <em className="text-foreground/30">—</em>}</p>
                                )}
                            </Field>

                            <Field label="Skits to plant">
                                <ul className="flex flex-col gap-1.5">
                                    {selected.seeds.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-accent/60 mt-1 text-[10px]">●</span>
                                            {editing ? (
                                                <>
                                                    <textarea value={s} onChange={e => setSeed(i, e.target.value)} className={taClass} rows={2} />
                                                    <button onClick={() => removeSeed(i)} className="text-foreground/30 hover:text-red-400 mt-1"><X className="w-3.5 h-3.5" /></button>
                                                </>
                                            ) : (
                                                <span className={pClass}>{s}</span>
                                            )}
                                        </li>
                                    ))}
                                    {selected.seeds.length === 0 && !editing && <span className="text-foreground/30 text-sm">—</span>}
                                </ul>
                                {editing && (
                                    <button onClick={addSeed} className="mt-2 text-xs font-bold text-accent/80 flex items-center gap-1"><Plus className="w-3 h-3" /> Seed</button>
                                )}
                            </Field>

                            <Field label="Finale payoff">
                                {editing ? (
                                    <textarea value={selected.payoff} onChange={e => patchSelected({ payoff: e.target.value })} className={taClass} rows={3} />
                                ) : (
                                    <p className={pClass}>{selected.payoff || <em className="text-foreground/30">—</em>}</p>
                                )}
                            </Field>

                            <Field label="Decision still open">
                                {editing ? (
                                    <textarea value={selected.open} onChange={e => patchSelected({ open: e.target.value })} className={taClass} rows={2} />
                                ) : (
                                    <p className={pClass}>{selected.open || <em className="text-foreground/30">—</em>}</p>
                                )}
                            </Field>

                            <Field label="Connected threads">
                                <div className="flex flex-wrap gap-1.5">
                                    {editing
                                        ? state.characters
                                            .filter(c => c.id !== selected.id)
                                            .map(c => {
                                                const on = selected.related.includes(c.id);
                                                return (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => toggleRelation(c.id)}
                                                        className={`text-[10px] px-2 py-1 rounded-full border ${on ? "bg-accent/15 border-accent/60 text-foreground" : "border-border text-foreground/40"}`}
                                                    >
                                                        {c.name}
                                                    </button>
                                                );
                                            })
                                        : selected.related.length
                                            ? selected.related.map(rid => (
                                                <button
                                                    key={rid}
                                                    onClick={() => setSelectedId(rid)}
                                                    className="text-[10px] px-2 py-1 rounded-full border border-border text-foreground/70 hover:border-accent hover:text-foreground"
                                                >
                                                    {nameById(rid)}
                                                </button>
                                            ))
                                            : <span className="text-foreground/30 text-sm">No fixed partner yet.</span>}
                                </div>
                            </Field>
                        </>
                    )}
                </div>
            </div>}
        </div>
    );
}

const taClass = "w-full bg-surface/40 border border-border rounded-lg p-2 text-sm text-foreground leading-relaxed focus:outline-none focus:border-accent resize-y";
const pClass = "text-sm text-foreground/80 leading-relaxed";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-foreground/40">{label}</span>
            {children}
        </div>
    );
}

function SkitRoadmapSheet({ roadmap, onCycleStatus }: {
    roadmap: import("@/lib/story-room-seed").SkitRoadmap | undefined;
    onCycleStatus: (step: number) => void;
}) {
    if (!roadmap) return <div className="card p-10 text-center text-foreground/30 text-sm">No skit roadmap loaded yet.</div>;
    return (
        <div className="flex flex-col gap-6">
            <div className="card p-6 flex flex-col gap-3">
                <span className="section-eyebrow">Premise first · story as the reward</span>
                <h3 className="text-lg font-extrabold text-foreground">What to make next</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">{roadmap.intro}</p>
                <div className="mt-2 p-4 rounded-xl bg-accent/10 border border-accent/20">
                    <span className="text-xs font-bold text-accent">The KIRBAI fit</span>
                    <p className="text-sm text-foreground/70 mt-1">{roadmap.kirbaiFit}</p>
                </div>
            </div>

            <div className="card p-6 flex flex-col gap-4">
                <h3 className="section-subtitle">Green-light framework — needs 2 of 4 before production</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {roadmap.greenlightTests.map(t => (
                        <div key={t.name} className="p-3 rounded-xl bg-surface/40 border border-border/40">
                            <strong className="text-xs font-bold text-foreground">{t.name}</strong>
                            <p className="text-[11px] text-foreground/50 mt-1 leading-relaxed">{t.description}</p>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-foreground/50 italic">{roadmap.greenlightRule}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {roadmap.cards.map(card => {
                    const style = ROADMAP_STATUS[card.status];
                    return (
                        <div key={card.step} className="card p-5 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <span className="text-[10px] font-mono text-foreground/30">STEP {card.step}</span>
                                    <h4 className="text-base font-bold text-foreground leading-snug">{card.title}</h4>
                                    <p className="text-xs text-foreground/40 mt-0.5">{card.cast}</p>
                                </div>
                                <button onClick={() => onCycleStatus(card.step)} className={`badge shrink-0 ${style.badge}`} title="Click to advance status">
                                    {card.statusLabel}
                                </button>
                            </div>
                            <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                                {card.fields.map(f => (
                                    <div key={f.label}>
                                        <span className="text-[11px] font-bold text-foreground/35">{f.label}</span>
                                        <p className="text-xs text-foreground/65 leading-relaxed">{f.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-5 flex flex-col gap-2">
                    <h4 className="section-subtitle">How to choose the next skit</h4>
                    <ol className="flex flex-col gap-2 list-decimal list-inside">
                        {roadmap.howToChoose.map((l, i) => <li key={i} className="text-xs text-foreground/60 leading-relaxed">{l}</li>)}
                    </ol>
                </div>
                <div className="card p-5 flex flex-col gap-3">
                    <h4 className="section-subtitle">Hook audit — lock before production</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {roadmap.hookAuditFields.map(f => <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-surface/60 text-foreground/60 border border-border/40">{f}</span>)}
                    </div>
                    <p className="text-xs text-foreground/50 leading-relaxed"><strong className="text-foreground/70">Tarot warning:</strong> {roadmap.tarotWarning}</p>
                    <p className="text-xs text-foreground/50 leading-relaxed"><strong className="text-foreground/70">Cold-viewer rule:</strong> {roadmap.coldViewerRule}</p>
                </div>
            </div>
        </div>
    );
}

function MusicVideoSheetView({ sheets }: { sheets: import("@/lib/story-room-seed").MusicVideoSheet[] | undefined }) {
    if (!sheets || sheets.length === 0) return <div className="card p-10 text-center text-foreground/30 text-sm">No music video sheet loaded yet.</div>;
    return (
        <div className="flex flex-col gap-6">
            {sheets.map(mv => (
                <div key={mv.title} className="flex flex-col gap-4">
                    <div className="card p-6 flex flex-col gap-2">
                        <span className="section-eyebrow">{mv.kicker}</span>
                        <h3 className="text-lg font-extrabold text-foreground">{mv.title}</h3>
                        <p className="text-sm text-foreground/60 leading-relaxed">{mv.summary}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {mv.locks.map(l => <span key={l} className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">{l}</span>)}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="card p-5 flex flex-col gap-2">
                            <h4 className="section-subtitle">Locked story engine</h4>
                            {mv.storyEngine.map(f => (
                                <div key={f.label}><span className="text-[11px] font-bold text-foreground/35">{f.label}</span><p className="text-xs text-foreground/65 leading-relaxed">{f.value}</p></div>
                            ))}
                            <p className="text-xs text-foreground/50 italic pt-1 border-t border-border/40 mt-1">{mv.storyNote}</p>
                        </div>
                        <div className="card p-5 flex flex-col gap-2">
                            <h4 className="section-subtitle">Locked location plan</h4>
                            {mv.locationPlan.map(f => (
                                <div key={f.label}><span className="text-[11px] font-bold text-foreground/35">{f.label}</span><p className="text-xs text-foreground/65 leading-relaxed">{f.value}</p></div>
                            ))}
                            <p className="text-xs text-foreground/50 italic pt-1 border-t border-border/40 mt-1">{mv.locationNote}</p>
                        </div>
                    </div>

                    <div className="card p-5 flex flex-col gap-3">
                        <h4 className="section-subtitle">Story map — sync exact cuts to final master</h4>
                        <div className="flex flex-col divide-y divide-border/40">
                            {mv.timeline.map(beat => (
                                <div key={beat.label} className="py-2.5 flex flex-col sm:flex-row sm:items-start gap-2">
                                    <span className="text-xs font-mono text-accent/70 w-28 shrink-0">{beat.label}</span>
                                    <div>
                                        <strong className="text-xs font-bold text-foreground">{beat.title}</strong>
                                        <p className="text-xs text-foreground/55 leading-relaxed">{beat.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mv.performers.map(p => (
                            <div key={p.name} className="card p-4 flex flex-col gap-1.5">
                                <span className="text-[11px] font-bold text-foreground/35">{p.tier}</span>
                                <h5 className="text-sm font-bold text-foreground">{p.name}</h5>
                                <p className="text-[11px] text-foreground/55 leading-relaxed">{p.role}</p>
                                <p className="text-[11px] text-foreground/45 leading-relaxed">{p.action}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="card p-5 flex flex-col gap-2">
                            <h4 className="section-subtitle">Hook + retention rules</h4>
                            <ul className="flex flex-col gap-1.5 list-disc list-inside">
                                {mv.hookRules.map((r, i) => <li key={i} className="text-xs text-foreground/60 leading-relaxed">{r}</li>)}
                            </ul>
                        </div>
                        <div className="card p-5 flex flex-col gap-2">
                            <h4 className="section-subtitle">Production + asset locks</h4>
                            <ul className="flex flex-col gap-1.5 list-disc list-inside">
                                {mv.productionNotes.map((r, i) => <li key={i} className="text-xs text-foreground/60 leading-relaxed">{r}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function FinalBattleSheetView({ beats }: { beats: import("@/lib/story-room-seed").BattleBeat[] | undefined }) {
    if (!beats || beats.length === 0) return <div className="card p-10 text-center text-foreground/30 text-sm">No final battle beat sheet loaded yet.</div>;
    return (
        <div className="flex flex-col gap-3">
            {beats.map(b => (
                <div key={b.number} className={`card p-5 flex items-start gap-4 ${b.finisher ? "border-accent/40 bg-accent/5" : ""}`}>
                    <span className="w-8 h-8 rounded-full bg-surface/60 border border-border/50 flex items-center justify-center text-xs font-black text-foreground/60 shrink-0">{b.number}</span>
                    <div>
                        <h4 className="text-sm font-bold text-foreground">{b.title}</h4>
                        <p className="text-xs text-foreground/60 leading-relaxed mt-0.5">{b.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
