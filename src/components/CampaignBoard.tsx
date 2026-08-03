"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Plus, Pin, ChevronDown, X, Sparkles, Wand2, Loader2 } from "lucide-react";
import type { CampaignBoard as Board, CampaignCard, Stream, CardStatus, MenialTask } from "@/app/api/campaign-board/route";

const STREAMS: { id: Stream; label: string; blurb: string; accent: string }[] = [
    { id: "video", label: "Music Videos", blurb: "One card per track / character", accent: "var(--stream-video)" },
    { id: "carousel", label: "Still Photo Carousels", blurb: "One card per character — 4 slides each", accent: "var(--stream-carousel)" },
    { id: "comedy", label: "Comedy & Lifestyle", blurb: "One card per bit idea", accent: "var(--stream-comedy)" },
];

const STATUS_ORDER: CardStatus[] = ["idea", "in-progress", "ready", "posted"];

const STATUS_STYLE: Record<CardStatus, { label: string; dot: string; ring: string; badge: string }> = {
    idea: { label: "Idea", dot: "bg-foreground/25", ring: "ring-foreground/10", badge: "text-foreground/50 bg-foreground/5 border-foreground/10" },
    "in-progress": { label: "In Progress", dot: "bg-amber-400", ring: "ring-amber-400/25", badge: "text-amber-500 bg-amber-400/10 border-amber-400/20" },
    ready: { label: "Ready", dot: "bg-emerald-400", ring: "ring-emerald-400/25", badge: "text-emerald-500 bg-emerald-400/10 border-emerald-400/20" },
    posted: { label: "Posted", dot: "bg-violet-400", ring: "ring-violet-400/25", badge: "text-violet-500 bg-violet-400/10 border-violet-400/20" },
};

function nextStatus(s: CardStatus): CardStatus {
    const i = STATUS_ORDER.indexOf(s);
    return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

function defaultTasks(): MenialTask[] {
    return [
        { id: "upload", label: "Upload", done: false },
        { id: "caption", label: "Write caption", done: false },
        { id: "convert", label: "Convert / export", done: false },
        { id: "post", label: "Post", done: false },
    ];
}

// Small deterministic "pinned to a corkboard" tilt, based on card id.
function tiltFor(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
    return (h % 300) / 100 - 1.5; // -1.5deg .. 1.5deg
}

export default function CampaignBoard() {
    const [board, setBoard] = useState<Board | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [threadsOpen, setThreadsOpen] = useState(false);
    const [addingIn, setAddingIn] = useState<Stream | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [command, setCommand] = useState("");
    const [commandBusy, setCommandBusy] = useState(false);
    const [commandReply, setCommandReply] = useState<string | null>(null);
    const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        fetch("/api/campaign-board").then(r => r.json()).then(d => {
            if (d.success) setBoard(d.board);
        });
    }, []);

    const persist = useCallback((next: Board) => {
        setBoard(next);
        fetch("/api/campaign-board", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ board: next }),
        });
    }, []);

    const updateCard = useCallback((id: string, patch: Partial<CampaignCard>) => {
        if (!board) return;
        const cards = board.cards.map(c => c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c);
        persist({ ...board, cards });
    }, [board, persist]);

    const addCard = useCallback((stream: Stream, title: string) => {
        if (!board || !title.trim()) return;
        const now = new Date().toISOString();
        const card: CampaignCard = {
            id: `card_${Math.random().toString(36).slice(2, 10)}`,
            stream, title: title.trim(), subtitle: "", notes: "",
            status: "idea", pinned: false, tasks: defaultTasks(),
            created_at: now, updated_at: now,
        };
        persist({ ...board, cards: [...board.cards, card] });
        setAddingIn(null);
        setNewTitle("");
    }, [board, persist]);

    const deleteCard = useCallback((id: string) => {
        if (!board) return;
        persist({ ...board, cards: board.cards.filter(c => c.id !== id) });
    }, [board, persist]);

    const dismissThread = useCallback((id: string) => {
        if (!board) return;
        persist({ ...board, threads: board.threads.filter(t => t.id !== id) });
    }, [board, persist]);

    const runCommand = useCallback(async () => {
        if (!command.trim() || commandBusy) return;
        setCommandBusy(true);
        setCommandReply(null);
        try {
            const res = await fetch("/api/campaign-board/command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command }),
            });
            const data = await res.json();
            if (data.success) {
                setBoard(data.board);
                setCommandReply(data.reply || "Done.");
                setCommand("");
            } else {
                setCommandReply(data.error || "Couldn't do that — try rephrasing.");
            }
        } catch {
            setCommandReply("Something went wrong reaching Studio's assistant.");
        } finally {
            setCommandBusy(false);
            if (replyTimer.current) clearTimeout(replyTimer.current);
            replyTimer.current = setTimeout(() => setCommandReply(null), 6000);
        }
    }, [command, commandBusy]);

    const upNext = useMemo(() => {
        if (!board) return null;
        const active = board.cards.filter(c => c.status !== "posted");
        if (active.length === 0) return null;
        const pinned = active.find(c => c.pinned);
        if (pinned) return pinned;
        const rank = (c: CampaignCard) => c.status === "ready" ? 0 : c.status === "in-progress" ? 1 : 2;
        return [...active].sort((a, b) => {
            const r = rank(a) - rank(b);
            if (r !== 0) return r;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })[0];
    }, [board]);

    if (!board) {
        return <div className="card p-10 text-center text-foreground/30 text-sm">Loading the studio…</div>;
    }

    const totalActive = board.cards.length;
    const posted = board.cards.filter(c => c.status === "posted").length;

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div className="section-header">
                    <span className="section-eyebrow">Pretty Rare Candies</span>
                    <h2 className="section-title text-2xl">Studio</h2>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-surface/40">
                    <span className="stat-value text-base">{posted}</span>
                    <span className="stat-label">/ {totalActive} posted</span>
                </div>
            </div>

            {/* AI command bar */}
            <div className="flex flex-col gap-2">
                <div className="card p-2 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-accent ml-2 shrink-0" />
                    <input
                        value={command}
                        onChange={e => setCommand(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") runCommand(); }}
                        placeholder="Tell Studio what changed… “mark the Jinx clip posted”, “add a comedy idea about Diancie’s skincare routine”, “check off caption for Cast Reveal”"
                        className="flex-1 bg-transparent border-none outline-none text-sm py-2 placeholder:text-foreground/30"
                        disabled={commandBusy}
                    />
                    <button
                        onClick={runCommand}
                        disabled={commandBusy || !command.trim()}
                        className="btn-primary text-[10px] py-2 px-4 shrink-0"
                    >
                        {commandBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Go"}
                    </button>
                </div>
                {commandReply && (
                    <div className="px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-xs text-foreground/70 animate-in fade-in slide-in-from-top-1 duration-300">
                        {commandReply}
                    </div>
                )}
            </div>

            {/* Up Next spotlight */}
            {upNext && (
                <div className="card p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 blur-[60px] rounded-full -mr-16 -mt-16" />
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        <span className="section-eyebrow">Up Next</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <h3 className="text-xl font-extrabold text-foreground leading-tight">{upNext.title}</h3>
                            {upNext.subtitle && <p className="text-sm text-foreground/40 mt-1">{upNext.subtitle}</p>}
                        </div>
                        <button
                            onClick={() => updateCard(upNext.id, { status: nextStatus(upNext.status) })}
                            className={`badge ${STATUS_STYLE[upNext.status].badge} px-4 py-2 text-[10px] cursor-pointer`}
                        >
                            {STATUS_STYLE[upNext.status].label} — advance
                        </button>
                    </div>
                </div>
            )}

            {/* Needs Decision */}
            {board.threads.length > 0 && (
                <div className="card overflow-hidden">
                    <button
                        onClick={() => setThreadsOpen(!threadsOpen)}
                        className="w-full flex items-center justify-between px-5 py-3 text-left"
                    >
                        <span className="section-subtitle">Needs Decision ({board.threads.length})</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${threadsOpen ? "rotate-180" : ""}`} />
                    </button>
                    {threadsOpen && (
                        <div className="px-5 pb-5 flex flex-col gap-2">
                            {board.threads.map(t => (
                                <div key={t.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface/40 border border-border/40">
                                    <p className="flex-1 text-sm text-foreground/60 leading-relaxed">{t.text}</p>
                                    <button onClick={() => dismissThread(t.id)} className="text-foreground/20 hover:text-foreground/50 transition-colors shrink-0">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Streams — corkboard / masonry */}
            {STREAMS.map(stream => {
                const cards = board.cards.filter(c => c.stream === stream.id);
                return (
                    <div key={stream.id} className="flex flex-col gap-4">
                        <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stream.accent }} />
                            <div className="section-header">
                                <h3 className="text-base font-bold text-foreground">{stream.label}</h3>
                                <span className="text-xs text-foreground/30">{stream.blurb}</span>
                            </div>
                        </div>
                        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
                            {cards.map(c => (
                                <div key={c.id} className="break-inside-avoid mb-4">
                                    <CardTile
                                        card={c}
                                        accent={stream.accent}
                                        tilt={tiltFor(c.id)}
                                        expanded={expanded === c.id}
                                        onToggleExpand={() => setExpanded(expanded === c.id ? null : c.id)}
                                        onUpdate={patch => updateCard(c.id, patch)}
                                        onDelete={() => deleteCard(c.id)}
                                    />
                                </div>
                            ))}

                            <div className="break-inside-avoid mb-4">
                                {addingIn === stream.id ? (
                                    <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-5 flex flex-col gap-3">
                                        <input
                                            autoFocus
                                            value={newTitle}
                                            onChange={e => setNewTitle(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") addCard(stream.id, newTitle);
                                                if (e.key === "Escape") { setAddingIn(null); setNewTitle(""); }
                                            }}
                                            placeholder="Card title…"
                                            className="input-field text-sm py-2"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => addCard(stream.id, newTitle)} className="btn-primary text-[10px] py-1.5 px-3">Add</button>
                                            <button onClick={() => { setAddingIn(null); setNewTitle(""); }} className="btn-ghost text-[10px] py-1.5 px-3">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setAddingIn(stream.id)}
                                        className="w-full rounded-2xl border border-dashed border-border flex flex-col items-center justify-center gap-2 text-foreground/20 hover:text-accent hover:border-accent/40 transition-all bg-foreground/[0.02] hover:bg-accent/5 min-h-[120px]"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span className="text-[10px] font-semibold uppercase tracking-wider">New Card</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function CardTile({ card, accent, tilt, expanded, onToggleExpand, onUpdate, onDelete }: {
    card: CampaignCard;
    accent: string;
    tilt: number;
    expanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (patch: Partial<CampaignCard>) => void;
    onDelete: () => void;
}) {
    const style = STATUS_STYLE[card.status];
    const doneTasks = card.tasks.filter(t => t.done).length;

    return (
        <div
            className={`card corkboard-card p-5 flex flex-col gap-3 group ${card.status === "posted" ? "opacity-70" : ""}`}
            style={{
                background: `color-mix(in srgb, ${accent} 9%, var(--surface-color))`,
                borderColor: `color-mix(in srgb, ${accent} 22%, var(--border-color))`,
                ["--tilt" as string]: `${tilt}deg`,
            } as any}
        >
            <div className="flex items-start justify-between gap-2">
                <button
                    onClick={() => onUpdate({ status: nextStatus(card.status) })}
                    title="Advance status"
                    className={`w-3 h-3 rounded-full shrink-0 ring-2 mt-1.5 ${style.dot} ${style.ring}`}
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleExpand}>
                    <h4 className="text-sm font-bold text-foreground leading-snug">{card.title}</h4>
                    {card.subtitle && <p className="text-xs text-foreground/35 mt-0.5">{card.subtitle}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => onUpdate({ pinned: !card.pinned })} className={card.pinned ? "text-accent" : "text-foreground/20 hover:text-foreground/50"}>
                        <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="text-foreground/20 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className={`badge ${style.badge}`}>{style.label}</span>
                {card.status !== "idea" && (
                    <span className="text-[10px] text-foreground/25 font-mono">{doneTasks}/{card.tasks.length}</span>
                )}
            </div>

            {expanded && (
                <div className="pt-3 border-t border-border/50 flex flex-col gap-3">
                    {card.notes && <p className="text-xs text-foreground/50 leading-relaxed">{card.notes}</p>}
                    <div className="flex flex-col gap-1.5">
                        {card.tasks.map(t => (
                            <label key={t.id} className="flex items-center gap-2.5 cursor-pointer group/task">
                                <input
                                    type="checkbox"
                                    checked={t.done}
                                    onChange={e => onUpdate({ tasks: card.tasks.map(x => x.id === t.id ? { ...x, done: e.target.checked } : x) })}
                                    className="w-3.5 h-3.5 rounded accent-accent"
                                />
                                <span className={`text-xs ${t.done ? "text-foreground/25 line-through" : "text-foreground/60"}`}>{t.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
