"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import type { CastSong, SongCast, SongStatus } from "@/app/api/song-cast/route";

const STATUS: Record<SongStatus, { label: string; cls: string }> = {
    released: { label: "Released", cls: "text-violet-500 bg-violet-400/10 border-violet-400/20" },
    upcoming: { label: "Upcoming", cls: "text-accent bg-accent/10 border-accent/20" },
    written: { label: "Written", cls: "text-amber-500 bg-amber-400/10 border-amber-400/20" },
    idea: { label: "Idea", cls: "text-foreground/50 bg-foreground/5 border-foreground/10" },
};

/** Pokémon HOME renders by name, e.g. "Alolan Ninetales" -> ninetales-alolan. */
function spriteUrl(name: string) {
    let n = name.toLowerCase().trim().replace(/[.'’]/g, "");
    const form = n.match(/^(alolan|galarian|hisuian|paldean|mega)\s+(.+)$/);
    if (form) n = `${form[2]}-${form[1]}`;
    return `https://img.pokemondb.net/sprites/home/normal/${n.replace(/\s+/g, "-")}.png`;
}

function Mon({ name, size = 48, dim = false }: { name: string; size?: number; dim?: boolean }) {
    const [broken, setBroken] = useState(false);
    return (
        <div className={`flex flex-col items-center gap-1 ${dim ? "opacity-70" : ""}`} style={{ width: size + 16 }} title={name}>
            {broken ? (
                <div className="rounded-full bg-foreground/10 flex items-center justify-center text-foreground/40 font-bold" style={{ width: size, height: size, fontSize: size / 3 }}>
                    {name[0]}
                </div>
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={spriteUrl(name)} alt={name} width={size} height={size} loading="lazy" onError={() => setBroken(true)} className="object-contain drop-shadow" />
            )}
            <span className={`text-center leading-tight truncate w-full ${size >= 40 ? "text-[10px] font-semibold text-foreground/70" : "text-[9px] text-foreground/45"}`}>{name}</span>
        </div>
    );
}

const splitNames = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

export default function CastSheet() {
    const [cast, setCast] = useState<SongCast | null>(null);
    const [view, setView] = useState<"songs" | "characters">("songs");
    const [q, setQ] = useState("");
    const [editing, setEditing] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/song-cast").then(r => r.json()).then(d => { if (d.success) setCast(d.cast); });
    }, []);

    const persist = (next: SongCast) => {
        setCast(next);
        fetch("/api/song-cast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cast: next }) });
    };

    const saveSong = (song: CastSong) => {
        if (!cast) return;
        const exists = cast.songs.some(s => s.id === song.id);
        persist({ ...cast, songs: exists ? cast.songs.map(s => s.id === song.id ? song : s) : [...cast.songs, song] });
        setEditing(null);
    };

    const deleteSong = (id: string) => {
        if (!cast) return;
        persist({ ...cast, songs: cast.songs.filter(s => s.id !== id) });
        setEditing(null);
    };

    const addSong = (era: string) => {
        if (!cast) return;
        const song: CastSong = { id: `song_${Date.now().toString(36)}`, era, title: "New song", mains: [], cameos: [], status: "idea", note: "" };
        persist({ ...cast, songs: [...cast.songs, song] });
        setEditing(song.id);
    };

    const needle = q.trim().toLowerCase();
    const matches = (s: CastSong) => !needle
        || s.title.toLowerCase().includes(needle)
        || [...s.mains, ...s.cameos].some(c => c.toLowerCase().includes(needle));

    // Character -> the songs they're in, mains before cameos.
    const byCharacter = useMemo(() => {
        if (!cast) return [];
        const map = new Map<string, { song: CastSong; role: "main" | "cameo" }[]>();
        for (const song of cast.songs) {
            song.mains.forEach(c => map.set(c, [...(map.get(c) ?? []), { song, role: "main" }]));
            song.cameos.forEach(c => map.set(c, [...(map.get(c) ?? []), { song, role: "cameo" }]));
        }
        return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    }, [cast]);

    if (!cast) {
        return <div className="card p-10 flex items-center justify-center gap-3 text-foreground/40 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading the cast…</div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div className="section-header">
                    <span className="section-eyebrow">Who&apos;s in what</span>
                    <h2 className="section-title text-2xl">Cast Sheet</h2>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-surface/40">
                        <Search className="w-3.5 h-3.5 text-foreground/30" />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Song or Pokémon…" className="bg-transparent outline-none text-sm w-44 placeholder:text-foreground/30" />
                        {q && <button onClick={() => setQ("")}><X className="w-3.5 h-3.5 text-foreground/30" /></button>}
                    </div>
                    <div className="flex p-0.5 bg-surface/60 rounded-xl border border-border/50">
                        {(["songs", "characters"] as const).map(v => (
                            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${view === v ? "bg-accent text-white shadow-md" : "text-foreground/40 hover:text-foreground/70"}`}>
                                By {v === "songs" ? "song" : "character"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {view === "songs" && cast.eras.map(era => {
                const songs = cast.songs.filter(s => s.era === era && matches(s));
                if (needle && songs.length === 0) return null;
                return (
                    <section key={era} className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-foreground">{era}</h3>
                            <span className="text-xs text-foreground/30">{songs.length} song{songs.length === 1 ? "" : "s"}</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {songs.map(song => editing === song.id
                                ? <SongEditor key={song.id} song={song} eras={cast.eras} onSave={saveSong} onDelete={() => deleteSong(song.id)} onCancel={() => setEditing(null)} />
                                : (
                                    <button key={song.id} onClick={() => setEditing(song.id)} className="card p-4 text-left flex flex-col gap-3 hover:border-accent/30 transition-all">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="text-sm font-bold text-foreground leading-snug">{song.title}</h4>
                                            <span className={`badge shrink-0 ${STATUS[song.status].cls}`}>{STATUS[song.status].label}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {song.mains.map(m => <Mon key={m} name={m} />)}
                                            {song.mains.length === 0 && <span className="text-xs text-foreground/30 italic">No main set</span>}
                                        </div>
                                        {song.cameos.length > 0 && (
                                            <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-border/50">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/30 mr-1">Cameos</span>
                                                {song.cameos.map(c => <Mon key={c} name={c} size={26} dim />)}
                                            </div>
                                        )}
                                        {song.note && <p className="text-[11px] text-foreground/45 leading-relaxed">{song.note}</p>}
                                    </button>
                                ))}
                            {!needle && (
                                <button onClick={() => addSong(era)} className="rounded-2xl border border-dashed border-border flex items-center justify-center gap-2 text-foreground/25 hover:text-accent hover:border-accent/40 transition-all min-h-[100px]">
                                    <Plus className="w-4 h-4" /> <span className="text-[10px] font-semibold uppercase tracking-wider">Add song</span>
                                </button>
                            )}
                        </div>
                    </section>
                );
            })}

            {view === "characters" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {byCharacter.filter(([name, rows]) => !needle || name.toLowerCase().includes(needle) || rows.some(r => r.song.title.toLowerCase().includes(needle))).map(([name, rows]) => (
                        <div key={name} className="card p-4 flex items-start gap-3">
                            <Mon name={name} size={52} />
                            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/30">
                                    {rows.length} appearance{rows.length === 1 ? "" : "s"}
                                </span>
                                {rows.map(({ song, role }) => (
                                    <div key={song.id + role} className="flex items-center gap-2 text-xs">
                                        <span className={`truncate ${role === "main" ? "font-semibold text-foreground/80" : "text-foreground/45"}`}>{song.title}</span>
                                        <span className="text-[9px] text-foreground/30 shrink-0">{role === "cameo" ? "cameo · " : ""}{song.era}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SongEditor({ song, eras, onSave, onDelete, onCancel }: {
    song: CastSong; eras: string[];
    onSave: (s: CastSong) => void; onDelete: () => void; onCancel: () => void;
}) {
    const [title, setTitle] = useState(song.title);
    const [mains, setMains] = useState(song.mains.join(", "));
    const [cameos, setCameos] = useState(song.cameos.join(", "));
    const [status, setStatus] = useState<SongStatus>(song.status);
    const [era, setEra] = useState(song.era);
    const [note, setNote] = useState(song.note ?? "");

    const label = "text-[9px] font-bold uppercase tracking-wider text-foreground/35";
    return (
        <div className="card p-4 flex flex-col gap-2.5 border-accent/40">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} className="input-field text-sm font-bold py-2 px-3" />
            <span className={label}>Mains (comma separated)</span>
            <input value={mains} onChange={e => setMains(e.target.value)} placeholder="Primarina, Roserade" className="input-field text-xs py-2 px-3" />
            <span className={label}>Cameos</span>
            <input value={cameos} onChange={e => setCameos(e.target.value)} placeholder="Krabby" className="input-field text-xs py-2 px-3" />
            <div className="flex gap-2">
                <select value={status} onChange={e => setStatus(e.target.value as SongStatus)} className="input-field text-xs py-2 px-2 flex-1">
                    {(Object.keys(STATUS) as SongStatus[]).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                </select>
                <select value={era} onChange={e => setEra(e.target.value)} className="input-field text-xs py-2 px-2 flex-1">
                    {eras.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Notes" className="input-field text-xs p-3 h-16 resize-none" />
            <div className="flex items-center gap-2">
                <button onClick={() => onSave({ ...song, title: title.trim() || song.title, mains: splitNames(mains), cameos: splitNames(cameos), status, era, note })} className="btn-primary text-[10px] py-1.5 px-3">Save</button>
                <button onClick={onCancel} className="btn-ghost text-[10px] py-1.5 px-3">Cancel</button>
                <button onClick={onDelete} className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-foreground/30 hover:text-red-400">Delete</button>
            </div>
        </div>
    );
}
