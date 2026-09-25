"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, CalendarDays, Lightbulb, Loader2, X } from "lucide-react";
import type { CampaignBoard as Board, CampaignCard, CardStatus, Stream } from "@/app/api/campaign-board/route";
import { castFor, spriteUrl, useCast } from "@/lib/cast";

type Go = (module: "studio" | "cast" | "storyroom" | "lore", view?: "board" | "calendar") => void;

const STATUS: Record<CardStatus, { label: string; cls: string }> = {
    idea: { label: "Idea", cls: "text-foreground/55 bg-foreground/5 border-foreground/10" },
    "in-progress": { label: "In progress", cls: "text-amber-500 bg-amber-400/10 border-amber-400/20" },
    ready: { label: "Ready", cls: "text-emerald-500 bg-emerald-400/10 border-emerald-400/20" },
    posted: { label: "Posted", cls: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
};
const STATUS_ORDER: CardStatus[] = ["idea", "in-progress", "ready", "posted"];
const nextStatus = (s: CardStatus) => STATUS_ORDER[(STATUS_ORDER.indexOf(s) + 1) % STATUS_ORDER.length];

const STREAM: Record<Stream, { label: string; color: string }> = {
    video: { label: "Video", color: "var(--stream-video, #B79CFF)" },
    carousel: { label: "Carousel", color: "var(--stream-carousel, #FFA9C6)" },
    comedy: { label: "Comedy", color: "var(--stream-comedy, #7FD9C4)" },
};

const isMilestone = (c: CampaignCard) => /LOCKED|GOAL/i.test(c.subtitle ?? "");
// "GOAL, not locked" also contains "locked", so GOAL has to win.
const isLocked = (c: CampaignCard) => !/GOAL/i.test(c.subtitle ?? "") && /LOCKED/i.test(c.subtitle ?? "");
const shortTitle = (t: string) => t.replace(/ (trailer|drops).*$/i, "").replace(/^"(.*?)".*/, "$1");

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
    return `In ${out} days`;
}
function greeting() {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const LINKS = [
    { label: "TikTok Studio", href: "https://www.tiktok.com/tiktokstudio/analytics/" },
    { label: "Meta Business Suite", href: "https://business.facebook.com/latest/posts/published_posts?business_id=1524540791867233&asset_id=959080893962864" },
    { label: "DistroKid stats", href: "https://distrokid.com/stats/?data=streams" },
    { label: "Skool: AI Music", href: "https://www.skool.com/aimusic" },
];

const MOODS = ["happy", "excited", "singing", "starry-eyed", "cheerful", "proud", "surprised"];

export default function Home({ go }: { go: Go }) {
    const [board, setBoard] = useState<Board | null>(null);
    const cast = useCast();
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
    const upcoming = [...late, ...soon];

    const clefairyLines = [
        nextDrop && nextOut !== null && (nextOut === 0 ? "It's drop day! ✨" : `${nextOut} days till ${shortTitle(nextDrop.title)}! ✨`),
        late.length > 0 && `${late.length} post${late.length > 1 ? "s" : ""} slipped past ${late.length > 1 ? "their dates" : "its date"}. Reschedule or post?`,
        soon.length > 0 && `${soon.length} post${soon.length > 1 ? "s" : ""} lined up in the next two weeks.`,
        backlog.length > 0 && `${backlog.length} undated ideas waiting. Any ready for a date?`,
        "Clefa! Tap me again, I have more to say.",
        "Moon Stone status: still shiny.",
    ].filter(Boolean) as string[];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <p className="text-sm text-foreground/50">{greeting()}, Erik</p>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mt-0.5">Here&apos;s your week</h1>
                </div>
                <Clefairy lines={clefairyLines} />
            </div>

            {/* Hero: next drop + runway */}
            <div className="relative card overflow-hidden">
                <Image src="/assets/banner.jpg" alt="" fill className="object-cover opacity-50" priority />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
                <div className="relative p-6 sm:p-8 flex flex-col gap-8">
                    {nextDrop ? (
                        <div className="flex items-center gap-6 flex-wrap">
                            <div className="flex items-baseline gap-2">
                                <span className="text-7xl font-bold leading-none tracking-tighter text-gradient tabular-nums">{nextOut}</span>
                                <span className="text-base font-medium text-foreground/50">{nextOut === 1 ? "day" : "days"}</span>
                            </div>
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <span className="text-sm text-foreground/50">Next drop · {shortDate(nextDrop.scheduledDate!)}</span>
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">{nextDrop.title}</h2>
                                <div className="flex items-center gap-2">
                                    <span className={`badge ${isLocked(nextDrop) ? "text-emerald-500 bg-emerald-400/10 border-emerald-400/20" : "text-accent bg-accent/10 border-accent/20"}`}>
                                        {isLocked(nextDrop) ? "Locked" : "Goal"}
                                    </span>
                                </div>
                            </div>
                            <div className="ml-auto hidden md:block"><Sprites names={castFor(nextDrop.title, cast)} size={72} max={3} /></div>
                        </div>
                    ) : (
                        <h2 className="text-2xl font-bold text-foreground">No release on the calendar yet.</h2>
                    )}
                    {milestones.length > 1 && <Runway milestones={milestones} cast={cast} />}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coming up */}
                <div className="lg:col-span-2 card overflow-hidden self-start">
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                        <h3 className="section-subtitle">Coming up</h3>
                        <button onClick={() => go("studio", "calendar")} className="flex items-center gap-1.5 text-sm font-medium text-accent hover:opacity-80">
                            <CalendarDays className="w-4 h-4" /> Calendar
                        </button>
                    </div>
                    {upcoming.length === 0 && (
                        <p className="px-5 pb-6 text-sm text-foreground/45">Nothing dated in the next two weeks. Good time to schedule something from the backlog.</p>
                    )}
                    <div className="flex flex-col">
                        {upcoming.map(c => {
                            const out = daysOut(c.scheduledDate!);
                            const overdue = out < 0;
                            return (
                                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 border-t border-border hover:bg-foreground/[0.02] transition-colors">
                                    <div className="w-[88px] shrink-0">
                                        <div className={`text-sm font-semibold ${overdue ? "text-red-400" : out <= 1 ? "text-accent" : "text-foreground/85"}`}>{whenLabel(out)}</div>
                                        <div className="text-xs text-foreground/40">{shortDate(c.scheduledDate!)}</div>
                                    </div>
                                    <div className="w-[76px] shrink-0 hidden sm:block"><Sprites names={castFor(c.title, cast)} size={34} max={2} /></div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`truncate text-[15px] ${isMilestone(c) ? "font-semibold text-foreground" : "text-foreground/85"}`}>{c.title}</div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STREAM[c.stream].color }} />
                                            <span className="text-xs text-foreground/45">{STREAM[c.stream].label}</span>
                                            {isMilestone(c) && <span className="text-xs text-accent">· Release</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateCard(c.id, { status: nextStatus(c.status) })}
                                        title="Click to advance status"
                                        className={`badge shrink-0 cursor-pointer hover:brightness-110 ${STATUS[c.status].cls}`}
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
                            <div className="flex p-0.5 bg-foreground/5 rounded-full flex-1">
                                {(Object.keys(STREAM) as Stream[]).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setIdeaStream(s)}
                                        className={`flex-1 px-2 py-1 text-xs font-medium rounded-full transition-all ${ideaStream === s ? "bg-surface text-foreground shadow" : "text-foreground/45 hover:text-foreground/70"}`}
                                    >
                                        {STREAM[s].label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={dropIdea} disabled={!idea.trim()} className="btn-primary py-1.5 px-3.5">Save</button>
                        </div>
                        <p className="text-xs text-foreground/40">
                            {saved ? "Saved to the Studio backlog ✓" : `Goes to the Studio backlog (${backlog.length} waiting)`}
                        </p>
                    </div>

                    {board.threads.length > 0 && (
                        <div className="card p-5 flex flex-col gap-3">
                            <h3 className="section-subtitle">Needs a decision</h3>
                            {board.threads.map(t => (
                                <div key={t.id} className="flex items-start gap-2.5 text-sm text-foreground/65 leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                                    <span className="flex-1">{t.text}</span>
                                    <button
                                        onClick={() => persist({ ...board, threads: board.threads.filter(x => x.id !== t.id) })}
                                        title="Mark resolved"
                                        className="text-foreground/25 hover:text-foreground/60 shrink-0 mt-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="card p-2 flex flex-col">
                        {([["cast", "Cast Sheet"], ["storyroom", "Story Room"], ["lore", "Lore"]] as const).map(([id, label]) => (
                            <button key={id} onClick={() => go(id)} className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:bg-foreground/5 transition-colors">
                                {label} <ArrowRight className="w-4 h-4 text-foreground/30" />
                            </button>
                        ))}
                        <div className="h-px bg-border mx-3 my-1" />
                        {LINKS.map(l => (
                            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-foreground/55 hover:text-foreground hover:bg-foreground/5 transition-colors">
                                {l.label} <ArrowUpRight className="w-4 h-4 text-foreground/30" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Sprites({ names, size, max = 3 }: { names: string[]; size: number; max?: number }) {
    return (
        <div className="flex -space-x-2">
            {names.slice(0, max).map(s => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s} src={spriteUrl(s)} alt={s} title={s} width={size} height={size} loading="lazy" className="object-contain drop-shadow-md" />
            ))}
        </div>
    );
}

/** Every locked/goal release on one line, from today to the last one, so the season reads at a glance. */
function Runway({ milestones, cast }: { milestones: CampaignCard[]; cast: ReturnType<typeof useCast> }) {
    const outs = milestones.map(m => daysOut(m.scheduledDate!));
    const start = Math.min(0, ...outs);
    const end = Math.max(...outs);
    const span = Math.max(1, end - start);
    const pct = (d: number) => ((d - start) / span) * 100;
    const nudge = (p: number) => (p < 8 ? 15 : p > 92 ? 85 : 50);

    return (
        <div className="pt-10">
            <div className="relative h-1 rounded-full bg-foreground/10 mx-6">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-accent-sunset" style={{ width: `${pct(0)}%` }} />
                {milestones.map((m, i) => (
                    <div key={m.id} className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: `${pct(outs[i])}%`, top: -38 }}>
                        <Sprites names={castFor(m.title, cast)} size={30} max={1} />
                        <div className={`mt-1 w-3 h-3 rounded-full ring-4 ring-background ${outs[i] < 0 ? "bg-foreground/30" : isLocked(m) ? "bg-emerald-400" : "bg-accent"}`} />
                    </div>
                ))}
            </div>
            <div className="relative h-10 mx-6 mt-3 hidden sm:block">
                {milestones.map((m, i) => (
                    <div key={m.id} className="absolute text-center w-32" style={{ left: `${pct(outs[i])}%`, transform: `translateX(-${nudge(pct(outs[i]))}%)` }}>
                        <div className="text-xs font-semibold text-foreground/80 truncate">{shortTitle(m.title)}</div>
                        <div className="text-[11px] text-foreground/40">{shortDate(m.scheduledDate!)}</div>
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
        <div className="flex items-center gap-3 max-w-[380px]">
            <div className="relative px-4 py-2.5 rounded-2xl rounded-br-md bg-surface border border-border text-sm text-foreground/80 leading-snug shadow-sm">
                {lines[i % lines.length]}
            </div>
            <button
                onClick={tap}
                title="Tap Clefairy"
                className={`relative w-16 h-16 shrink-0 rounded-full overflow-hidden border border-border bg-gradient-to-br from-pink-300/30 to-violet-300/20 hover:scale-105 transition-transform ${bounce ? "animate-wounce" : ""}`}
            >
                <Image src={`/assets/muse/${mood}.png`} alt="Clefairy" fill className="object-contain scale-[1.4]" unoptimized />
            </button>
        </div>
    );
}
