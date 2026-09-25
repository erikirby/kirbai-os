"use client";

import { useEffect, useState } from "react";
import type { SongCast } from "@/app/api/song-cast/route";

/** Pokémon HOME renders by name, e.g. "Alolan Ninetales" -> ninetales-alolan. */
export function spriteUrl(name: string) {
    let n = name.toLowerCase().trim().replace(/[.'’]/g, "");
    const form = n.match(/^(alolan|galarian|hisuian|paldean|mega)\s+(.+)$/);
    if (form) n = `${form[2]}-${form[1]}`;
    return `https://img.pokemondb.net/sprites/home/normal/${n.replace(/\s+/g, "-")}.png`;
}

let cached: Promise<SongCast | null> | null = null;

/** The Cast Sheet (song -> characters), fetched once per page load and shared. */
export function useCast(): SongCast | null {
    const [cast, setCast] = useState<SongCast | null>(null);
    useEffect(() => {
        cached ??= fetch("/api/song-cast").then(r => r.json()).then(d => (d.success ? d.cast : null)).catch(() => null);
        cached.then(setCast);
    }, []);
    return cast;
}

/** Call after editing the Cast Sheet so other screens pick up the change. */
export function invalidateCast() {
    cached = null;
}

/**
 * Characters for a calendar card title: any character named in the title first,
 * then the mains of any song whose name appears in it (e.g. "Toxic Spikes" -> Roserade).
 */
export function castFor(title: string, cast: SongCast | null): string[] {
    if (!cast) return [];
    const t = title.toLowerCase();
    const out: string[] = [];
    const add = (c: string) => { if (!out.includes(c)) out.push(c); };

    const names = new Set(cast.songs.flatMap(s => [...s.mains, ...s.cameos]));
    names.forEach(n => { if (t.includes(n.toLowerCase())) add(n); });

    for (const song of cast.songs) {
        const parts = song.title.replace(/\s*\(.*?\)\s*/g, " ").split("×").map(p => p.trim().toLowerCase());
        // A fusion ("A × B") only counts when both halves are named, so "Flash Flash" doesn't pull in Pink Buzz's cast.
        const hit = parts.length > 1 ? parts.every(p => t.includes(p)) : parts[0].length >= 5 && t.includes(parts[0]);
        if (hit) song.mains.forEach(add);
    }
    return out;
}
