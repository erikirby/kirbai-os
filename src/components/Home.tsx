"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Lightbulb, Loader2, X } from "lucide-react";
import type { CampaignBoard as Board, CampaignCard, CardStatus, Stream } from "@/app/api/campaign-board/route";

type Go = (module: "studio" | "storyroom" | "lore" | "vault") => void;

const STATUS: Record<CardStatus, { label: string; cls: string }> = {
    idea: { label: "Idea", cls: "text-foreground/50 bg-foreground/5 border-foreground/10" },
    "in-progress": { label: "In Progress", cls: "text-amber-500 bg-amber-400/10 border-amber-400/20" },
    ready: { label: "Ready", cls: "text-emerald-500 bg-emerald-400/10 border-emerald-400/20" },
    posted: { label: "Posted", cls: "text-violet-500 bg-violet-400/10 border-violet-400/20" },
};
const STATUS_ORDER: CardStatus[] = ["idea", "in-progress", "ready", "posted"];
const nextStatus = (s: CardStatus) => STATUS_ORDER[(STATUS_ORDER.indexOf(s) + 1) % STATUS_ORDER.length];

const STREAM: Record<Stream, { label: string; color: string }> = {
    video: { label: "Video", color: "var(--stream-video, #B79CFF)" },
    carousel: { label: "Carousel", color: "var(--stream-carousel, #FFA9C6)" },
    comedy: { label: "Comedy", color: "var(--stream-comedy, #7FD9C4)" },
};

// Same song -> cast mapping the Studio calendar uses.
const CAST: { match: RegExp; sprites: string[] }[] = [
    { match: /flash flash/i, sprites: ["primarina", "krabby"] },
    { match: /nidoking|toxic spikes/i, sprites: ["nidoking", "roserade"] },
    { match: /alcremie|decorate/i, sprites: ["alcremie", "heracross"] },
    { match: /house of regi/i, sprites: ["regigigas"] },
    { match: /psycho boost|deoxys/i, sprites: ["deoxys"] },
    { match: /next era/i, sprites: ["malamar", "gengar", "mimikyu"] },
    { match: /fusion album/i, sprites: ["regigigas"] },
];
const spritesFor = (title: string) => CAST.find(c => c.match.test(title))?.sprites ?? [];

const isMilestone = (c: CampaignCard) => /LOCKED|GOAL/i.test(c.subtitle ?? "");
// "GOAL, not locked" also contains "locked", so GOAL has to win.
const isLocked = (c: CampaignCard) => !/GOAL/i.test(c.subtitle ?? "") && /LOCKED/i.test(c.subtitle ?? "");

function daysOut(iso: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso + "T12:00:00").getTime() - today.getTime()) / 86400000);
}
function shortDate(iso: string) {
    return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function whenLabel(out: number) {
    if (out === 0) return "Today";
    if (out === 1) return "Tomorrow";
    if (out < 0) return `${-out}d late`;
    return `in ${out}d`;
}

const LINKS = [
    { label: "TikTok Studio", href: "https://www.tiktok.com/tiktokstudio/analytics/" },
    { label: "Meta Business Suite", href: "https://business.facebook.com/latest/posts/published_posts?business_id=1524540791867233&asset_id=959080893962864" },
    { label: "DistroKid Stats", href: "https://distrokid.com/stats/?data=streams" },
    { label: "Skool: AI Music", href: "https://www.skool.com/aimusic" },
];

const MOODS = ["happy", "excited", "singing", "starry-eyed", "cheerful", "proud", "surprised"];

export default function Home({ go }: { go: Go }) {
    const [board, setBoard] = useState<Board | null>(null);
    const [idea, setIdea] = useState("");
    const [ideaStream, setIdeaStream] = useState<Stream>("video");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch("/api/campaign-board").then(r => r.json()).then(d => { if (d.success) setBoard(d.board); });
    }, []);

    const persist = (next: Board) => {
        setBoard(next);
        fetch("/api/campaign-board", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ board: next }),
        });
    };

    const updateCard = (id: string, patch: Partial<CampaignCard>) => {
        if (!board) return;
        persist({ ...board, cards: board.cards.map(c => c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c) });
    };

    const dropIdea = () => {
        if (!board || !idea.trim()) return;
        const now = new Date().toISOString();
        const card: CampaignCard = {
            id: `card_${Math.random().toString(36).slice(2, 10)}`,
            stream: ideaStream, title: idea.trim(), subtitle: "", notes: "",
            status: "idea", pinned: false,
            tasks: [
                { id: "upload", label: "Upload", done: false },
                { id: "caption", label: "Write caption", done: false },
                { id: "convert", label: "Convert / export", done: false },
                { id: "post", label: "Post", done: false },
            ],
            created_at: now, updated_at: now,
        };
        persist({ ...board, cards: [...board.cards, card] });
        setIdea("");
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const derived = useMemo(() => {
        if (!board) return null;
        const dated = board.cards.filter(c => c.scheduledDate).sort((a, b) => (a.scheduledDate! < b.scheduledDate! ? -1 : 1));
        const late = dated.filter(c => c.status !== "posted" && daysOut(c.scheduledDate!) < 0);
        const soon = dated.filter(c => { const o = daysOut(c.scheduledDate!); return o >= 0 && o <= 14; });
        const milestones = dated.filter(isMilestone);
        const nextDrop = milestones.find(c => daysOut(c.scheduledDate!) >= 0) ?? null;
        const backlog = board.cards.filter(c => !c.scheduledDate && c.status !== "posted");
        return { late, soon, milestones, nextDrop, backlog };
    }, [board]);

    if (!board || !derived) {
        return (
            <div className="card p-10 flex items-center justify-center gap-3 text-foreground/40 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading your week…
            </div>
        );
    }

    const { late, soon, milestones, nextDrop, backlog } = derived;
    const nextOut = nextDrop ? daysOut(nextDrop.scheduledDate!) : null;

    const clefairyLines = [
        nextDrop && nextOut !== null && `${nextOut === 0 ? "It's drop day" : `${nextOut} days till ${nextDrop.title.replace(/ (trailer|drops).*$/i, "")}`}! ✨`,
        late.length > 0 && `${late.length} thing${late.length > 1 ? "s" : ""} slipped past ${late.length > 1 ? "their dates" : "its date"}. Reschedule or post?`,
        soon.length > 0 && `${soon.length} post${soon.length > 1 ? "s" : ""} lined up in the next two weeks.`,
        backlog.length > 0 && `${backlog.length} undated ideas in the backlog. Any of them ready for a date?`,
        "Clefa! Tap me again, I have more to say.",
        "Moon Stone status: still shiny.",
    ].filter(Boolean) as string[];

    return (
        <div className="flex flex-col gap-6">
            {/* Hero: next drop countdown */}
            <div className="relative card overflow-hidden min-h-[200px]">
                <Image src="/assets/banner.jpg" alt="" fill className="object-cover opacity-60" priority />
                <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/20" />
                <div className="relative p-6 sm:p-8 flex items-center justify-between gap-6 flex-wrap">
                    <div className="flex flex-col gap-2 min-w-0">
                        <span className="section-eyebrow">{greeting()} · Next drop</span>
                        {nextDrop ? <>
                            <div className="flex items-end gap-3">
                                <span className="text-6xl sm:text-7xl font-extrabold leading-none text-gradient tabular-nums">{nextOut}</span>
                                <span className="text-sm font-semibold text-foreground/50 pb-2">{nextOut === 1 ? "day" : "days"}</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">{nextDrop.title}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-foreground/50">{shortDate(nextDrop.scheduledDate!)}</span>
                                <span className={`badge ${isLocked(nextDrop) ? "text-emerald-500 bg-emerald-400/10 border-emerald-400/20" : "text-accent bg-accent/10 border-accent/20"}`}>
                                    {isLocked(nextDrop) ? "Locked" : "Goal"}
                                </span>
                                <Sprites names={spritesFor(nextDrop.title)} size={28} />
                            </div>
                        </> : (
                            <h2 className="text-xl font-extrabold text-foreground">No release on the calendar yet.</h2>
                        )}
                    </div>
                    <Clefairy lines={clefairyLines} />
                </div>
            </div>

            {/* Release runway */}
            {milestones.length > 1 && <Runway milestones={milestones} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coming up */}
                <div className="lg:col-span-2 card overflow-hidden self-start">
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                        <h3 className="section-subtitle">Next 2 weeks</h3>
                        <button onClick={() => go("studio")} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent/80 hover:text-accent">
                            Open Studio <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    {[...late, ...soon].length === 0 && (
                        <p className="px-5 pb-6 text-sm text-foreground/40">Nothing dated in the next two weeks. Good time to schedule something from the backlog.</p>
                    )}
                    <div className="flex flex-col">
                        {[...late, ...soon].map(c => {
                            const out = daysOut(c.scheduledDate!);
                            const overdue = out < 0;
                            return (
                                <div key={c.id} className={`flex items-center gap-3 px-5 py-3 border-t border-border/50 ${isMilestone(c) ? "bg-accent/[0.04]" : ""}`}>
                                    <div className="w-[70px] shrink-0">
                                        <div className={`text-xs font-bold ${overdue ? "text-red-400" : out <= 1 ? "text-accent" : "text-foreground/80"}`}>{whenLabel(out)}</div>
                                        <div className="text-[10px] text-foreground/30">{shortDate(c.scheduledDate!)}</div>
                                    </div>
                                    <div className="w-[60px] shrink-0 hidden sm:block"><Sprites names={spritesFor(c.title)} size={24} max={2} /></div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`truncate text-sm ${isMilestone(c) ? "font-bold text-foreground" : "font-medium text-foreground/85"}`}>{c.title}</div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STREAM[c.stream].color }} />
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/30">{STREAM[c.stream].label}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateCard(c.id, { status: nextStatus(c.status) })}
                                        title="Click to advance status"
                                        className={`badge shrink-0 cursor-pointer ${STATUS[c.status].cls}`}
                                    >
                                        {STATUS[c.status].label}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right rail */}
                <div className="flex flex-col gap-6">
                    <div className="card p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-accent" />
                            <h3 className="section-subtitle">Drop an idea</h3>
                        </div>
                        <textarea
                            value={idea}
                            onChange={e => setIdea(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) dropIdea(); }}
                            placeholder="Future song, video bit, carousel concept…"
                            className="input-field text-sm p-3 h-20 resize-none"
                        />
                        <div className="flex items-center gap-2">
                            <div className="flex p-0.5 bg-surface/60 rounded-xl border border-border/50 flex-1">
                                {(Object.keys(STREAM) as Stream[]).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setIdeaStream(s)}
                                        className={`flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${ideaStream === s ? "bg-accent text-white" : "text-foreground/40 hover:text-foreground/70"}`}
                                    >
                                        {STREAM[s].label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={dropIdea} disabled={!idea.trim()} className="btn-primary text-[10px] py-1.5 px-3">Save</button>
                        </div>
                        <p className="text-[10px] text-foreground/35">
                            {saved ? "Saved to the Studio backlog ✓" : `Goes to the Studio backlog (${backlog.length} waiting).`}
                        </p>
                    </div>

                    {board.threads.length > 0 && (
                        <div className="card p-5 flex flex-col gap-2">
                            <h3 className="section-subtitle">Needs a decision</h3>
                            {board.threads.map(t => (
                                <div key={t.id} className="flex items-start gap-2 text-xs text-foreground/60 leading-relaxed">
                                    <span className="text-accent mt-0.5">•</span>
                                    <span className="flex-1">{t.text}</span>
                                    <button
                                        onClick={() => persist({ ...board, threads: board.threads.filter(x => x.id !== t.id) })}
                                        title="Resolved"
                                        className="text-foreground/20 hover:text-foreground/60 shrink-0"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="card p-5 flex flex-col gap-3">
                        <h3 className="section-subtitle">Jump to</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {([["studio", "Studio"], ["storyroom", "Story Room"], ["lore", "Lore"], ["vault", "Vault"]] as const).map(([id, label]) => (
                                <button key={id} onClick={() => go(id)} className="px-3 py-2.5 rounded-xl border border-border bg-surface/40 hover:border-accent/40 hover:text-accent text-[11px] font-semibold text-foreground/70 transition-all">
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-col gap-1 pt-1">
                            {LINKS.map(l => (
                                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="flex items-center justify-between px-1 py-1 text-[11px] text-foreground/45 hover:text-accent transition-colors">
                                    {l.label} <ArrowRight className="w-3 h-3" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function greeting() {
    const h = new Date().getHours();
    return h < 12 ? "Morning, Erik" : h < 18 ? "Afternoon, Erik" : "Evening, Erik";
}

function Sprites({ names, size, max = 3 }: { names: string[]; size: number; max?: number }) {
    return (
        <div className="flex gap-0.5">
            {names.slice(0, max).map(s => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s} src={`/sprites/${s}.png`} alt={s} title={s} width={size} height={size} className="object-contain" style={{ imageRendering: "pixelated" }} />
            ))}
        </div>
    );
}

/** Every locked/goal release on one line, from today to the last one, so the season reads at a glance. */
function Runway({ milestones }: { milestones: CampaignCard[] }) {
    const outs = milestones.map(m => daysOut(m.scheduledDate!));
    const start = Math.min(0, ...outs);
    const end = Math.max(...outs);
    const span = Math.max(1, end - start);
    const pct = (d: number) => ((d - start) / span) * 100;

    return (
        <div className="card px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-8">
                <h3 className="section-subtitle">Release runway</h3>
                <span className="text-[10px] text-foreground/35">{end}d to the last goal</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-foreground/10 mx-4 mb-2 sm:mb-0">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-accent-sunset" style={{ width: `${pct(0)}%` }} />
                <div className="absolute -top-1.5 w-4 h-4 rounded-full border-2 border-background bg-foreground" style={{ left: `calc(${pct(0)}% - 8px)` }} title="Today" />
                {milestones.map((m, i) => {
                    const o = outs[i];
                    const done = o < 0;
                    return (
                        <div key={m.id} className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: `${pct(o)}%`, top: -30 }}>
                            <Sprites names={spritesFor(m.title)} size={22} max={1} />
                            <div className={`mt-1 w-3 h-3 rounded-full border-2 border-background ${done ? "bg-foreground/30" : isLocked(m) ? "bg-emerald-400" : "bg-accent"}`} />
                        </div>
                    );
                })}
            </div>
            <div className="relative h-10 mx-4 mt-2 hidden sm:block">
                {milestones.map((m, i) => (
                    // Keep the first/last labels inside the card instead of hanging off the edge.
                    <div key={m.id} className="absolute text-center w-28" style={{ left: `${pct(outs[i])}%`, transform: `translateX(-${pct(outs[i]) < 8 ? 15 : pct(outs[i]) > 92 ? 85 : 50}%)` }}>
                        <div className="text-[10px] font-bold text-foreground/70 truncate">{m.title.replace(/ (trailer|drops).*$/i, "").replace(/^"(.*)"/, "$1")}</div>
                        <div className="text-[9px] text-foreground/35">{shortDate(m.scheduledDate!)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Tap-to-talk Clefairy. Only cries when tapped, never on page load. */
function Clefairy({ lines }: { lines: string[] }) {
    const [i, setI] = useState(0);
    const [mood, setMood] = useState("happy");
    const [bounce, setBounce] = useState(false);
    const audio = useRef<HTMLAudioElement | null>(null);

    const tap = () => {
        if (!audio.current) {
            audio.current = new Audio("/assets/muse/clefairy_cry.mp3");
            audio.current.volume = 0.3;
        }
        audio.current.currentTime = 0;
        audio.current.play().catch(() => {});
        setI(n => (n + 1) % lines.length);
        setMood(MOODS[Math.floor(Math.random() * MOODS.length)]);
        setBounce(true);
        setTimeout(() => setBounce(false), 400);
    };

    return (
        <div className="flex items-center gap-3 max-w-[340px]">
            <div className="card px-4 py-3 text-xs font-semibold text-foreground/80 leading-relaxed relative">
                {lines[i % lines.length]}
            </div>
            <button
                onClick={tap}
                title="Clefairy"
                className={`relative w-20 h-20 shrink-0 rounded-full overflow-hidden border-2 border-white/20 bg-surface/60 backdrop-blur ${bounce ? "animate-wounce" : ""}`}
            >
                <Image src={`/assets/muse/${mood}.png`} alt="Clefairy" fill className="object-contain scale-[1.4]" unoptimized />
            </button>
        </div>
    );
}
