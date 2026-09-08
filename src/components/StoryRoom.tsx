"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import type { StoryCharacter, StoryRoomState } from "@/lib/story-room-seed";

interface StoryRoomProps {
    theme?: string;
    mode?: "kirbai" | "factory";
}

const ROLE_STYLES: Record<StoryCharacter["role"], string> = {
    lead: "border-accent/70",
    supporting: "border-border",
    mystery: "border-purple-400/70 border-dashed",
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `character-${Date.now()}`;

export default function StoryRoom({ mode = "kirbai" }: StoryRoomProps) {
    const [state, setState] = useState<StoryRoomState>({ era: "", characters: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsaved, setHasUnsaved] = useState(false);

    const boardRef = useRef<HTMLDivElement | null>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dragRef = useRef<{ id: string; moved: boolean } | null>(null);

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
                setState({ era: data.era ?? "", characters: Array.isArray(data.characters) ? data.characters : [] });
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

    const patchSelected = (patch: Partial<StoryCharacter>) => {
        if (!selected) return;
        mutate(chars => chars.map(c => (c.id === selected.id ? { ...c, ...patch } : c)));
    };

    // --- Drag to reposition ---
    const onPointerDown = (e: React.PointerEvent, id: string) => {
        if (!editing) return;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        dragRef.current = { id, moved: false };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        const board = boardRef.current;
        if (!drag || !board) return;
        const rect = board.getBoundingClientRect();
        const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 2, 97);
        const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 3, 94);
        drag.moved = true;
        mutate(chars => chars.map(c => (c.id === drag.id ? { ...c, x, y } : c)));
    };
    const onPointerUp = (e: React.PointerEvent, id: string) => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag || !drag.moved) setSelectedId(id); // treat as click
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
                <span className="text-xs font-mono uppercase tracking-widest">Opening the Story Room…</span>
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-gradient">STORY ROOM</h2>
                    <p className="text-xs text-foreground/50 mt-1">
                        {state.era ? `${state.era} · ` : ""}Relationship board — the wound, the seeds to plant, and the finale payoff for each character.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">
                        {isSaving ? "Saving…" : hasUnsaved ? "Unsaved" : "Synced"}
                    </span>
                    {editing && (
                        <button onClick={addCharacter} className="btn-secondary text-[10px] uppercase font-bold px-3 py-1.5 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5" /> Character
                        </button>
                    )}
                    <button
                        onClick={() => setEditing(v => !v)}
                        className={`text-[10px] uppercase font-bold px-3 py-1.5 flex items-center gap-1.5 ${editing ? "btn-primary" : "btn-secondary"}`}
                    >
                        {editing ? <><Check className="w-3.5 h-3.5" /> Done</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
                {/* Board */}
                <div
                    ref={boardRef}
                    onPointerMove={onPointerMove}
                    className="relative w-full rounded-2xl border border-border overflow-hidden select-none"
                    style={{
                        aspectRatio: "16 / 13",
                        background:
                            "repeating-linear-gradient(45deg, color-mix(in srgb, var(--accent-color) 4%, transparent) 0 2px, transparent 2px 22px), color-mix(in srgb, var(--surface-color) 70%, transparent)",
                    }}
                >
                    {state.characters.map(c => {
                        const isSel = c.id === selectedId;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onPointerDown={e => onPointerDown(e, c.id)}
                                onPointerUp={e => onPointerUp(e, c.id)}
                                onClick={() => { if (!editing) setSelectedId(c.id); }}
                                title={`${c.name} — ${c.tag}`}
                                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 p-2 rounded-xl bg-background/80 backdrop-blur border ${ROLE_STYLES[c.role]} ${isSel ? "ring-2 ring-accent shadow-lg z-20 scale-105" : "z-10 hover:z-20 hover:scale-105"} ${editing ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} transition-transform`}
                                style={{ left: `${clamp(c.x, 4, 96)}%`, top: `${clamp(c.y, 5, 94)}%`, width: 96 }}
                            >
                                <span className="w-11 h-11 rounded-lg overflow-hidden bg-surface/60 flex items-center justify-center">
                                    {c.icon
                                        ? <Image src={c.icon} alt="" width={44} height={44} className="object-contain" />
                                        : <span className="text-lg font-black text-foreground/40">{c.name.charAt(0)}</span>}
                                </span>
                                <strong className="text-[10px] leading-tight text-center text-foreground line-clamp-1 w-full">{c.name}</strong>
                                <small className="text-[8px] leading-tight text-center text-foreground/45 line-clamp-2 w-full">{c.tag}</small>
                            </button>
                        );
                    })}

                    {/* connectors for the selected character */}
                    {selected && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true">
                            {selected.related.map(rid => {
                                const other = state.characters.find(c => c.id === rid);
                                if (!other) return null;
                                return (
                                    <line
                                        key={rid}
                                        x1={`${clamp(selected.x, 4, 96)}%`} y1={`${clamp(selected.y, 5, 94)}%`}
                                        x2={`${clamp(other.x, 4, 96)}%`} y2={`${clamp(other.y, 5, 94)}%`}
                                        stroke="var(--accent-color)" strokeWidth={1.5} strokeOpacity={0.5}
                                        strokeDasharray="4 4"
                                    />
                                );
                            })}
                        </svg>
                    )}
                </div>

                {/* Detail */}
                <div className="card p-5 flex flex-col gap-4 min-h-[300px]">
                    {!selected ? (
                        <p className="text-sm text-foreground/50 m-auto">Pick a character on the board to open its thread.</p>
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
                                        <span className="text-[11px] font-mono uppercase tracking-wide text-accent/80">{selected.tag}</span>
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
                                    <button onClick={addSeed} className="mt-2 text-[10px] uppercase font-bold text-accent/80 flex items-center gap-1"><Plus className="w-3 h-3" /> Seed</button>
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
            </div>
        </div>
    );
}

const taClass = "w-full bg-surface/40 border border-border rounded-lg p-2 text-sm text-foreground leading-relaxed focus:outline-none focus:border-accent resize-y";
const pClass = "text-sm text-foreground/80 leading-relaxed";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">{label}</span>
            {children}
        </div>
    );
}
