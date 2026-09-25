import { NextResponse } from 'next/server';
import { getRow, setRow } from '@/lib/db';

export const dynamic = 'force-dynamic';

const KEY = 'song_cast';

export type SongStatus = 'released' | 'upcoming' | 'written' | 'idea';

export interface CastSong {
    id: string;
    era: string;
    title: string;
    /** Characters the song is about (they have their own song). */
    mains: string[];
    /** Characters who only show up in the video/lore. */
    cameos: string[];
    status: SongStatus;
    note?: string;
}

export interface SongCast {
    eras: string[];
    songs: CastSong[];
}

// Seeded from lyrics (distrokid ready lyrics/), docs/pretty-rare-candies-characters.md,
// vault_projects tracklists, and Erik's confirmations. Only locked cameos are included.
function seed(): SongCast {
    const eras = [
        'Next Era',
        'Singles',
        'Pink Rare Candies',
        'Pretty Rare Candies',
        'Pink Bois',
        'Heart Scales',
        'Banned Badge',
    ];
    let n = 0;
    const s = (era: string, title: string, mains: string[], status: SongStatus, cameos: string[] = [], note = ''): CastSong =>
        ({ id: `song_${n++}`, era, title, mains, cameos, status, note });

    const songs: CastSong[] = [
        s('Next Era', 'Malamar song', ['Malamar'], 'written'),
        s('Next Era', 'Gengar song', ['Gengar'], 'written'),
        s('Next Era', 'Mimikyu song', ['Mimikyu'], 'written'),
        s('Next Era', 'Roster, songs TBD', ['Delphox', 'Misdreavus', 'Kadabra', 'Hypno', 'Absol'], 'idea', [], 'Banette is a maybe.'),

        s('Singles', 'Psycho Boost', ['Deoxys'], 'upcoming', [], 'Season finale single. Goal date, not locked.'),
        s('Singles', "You're Getting Drowsy", ['Drowzee'], 'released', [], 'Dream Eater single, 2026-06-15.'),

        s('Pink Rare Candies', 'House of Regi', ['Regigigas', 'Regirock', 'Regice', 'Registeel', 'Regieleki', 'Regidrago'], 'upcoming', [], 'Title track. Lyrics spell Regice "Regi-ice".'),
        s('Pink Rare Candies', 'Pink Rare Candies (Pink Pheromones × Pretty Rare Candies)', ['Diancie', 'Salazzle'], 'upcoming'),
        s('Pink Rare Candies', 'Poison Pink × Toxic Spikes', ['Roserade', 'Nidoking'], 'upcoming'),
        s('Pink Rare Candies', 'Marvel Scale × Wrap Me In Pink', ['Milotic', 'Dratini'], 'upcoming'),
        s('Pink Rare Candies', 'Decorate × Pink Bois', ['Alcremie', 'Heracross'], 'upcoming'),
        s('Pink Rare Candies', 'Aurora Veil × Paint Me Pink', ['Alolan Ninetales', 'Voltorb'], 'upcoming'),
        s('Pink Rare Candies', 'Flash Flash × Pink Buzz', ['Primarina', 'Electabuzz'], 'upcoming'),
        s('Pink Rare Candies', 'Runway Regi × Rock The Pink', ['Regirock', 'Rhyhorn'], 'upcoming'),
        s('Pink Rare Candies', 'Sparkling Aria × The Pink Below', ['Primarina', 'Kyogre'], 'upcoming'),
        s('Pink Rare Candies', 'Heavy Pink × Destiny Bond', ['Swampert', 'Froslass'], 'upcoming'),
        s('Pink Rare Candies', 'Diamond Storm × Pink Haze', ['Diancie', 'Quagsire'], 'upcoming'),

        s('Pretty Rare Candies', 'Pretty Rare Candies', ['Diancie', 'Primarina', 'Roserade', 'Milotic', 'Froslass', 'Alolan Ninetales', 'Regirock'], 'released', [], 'Title track, full cast.'),
        s('Pretty Rare Candies', 'Flash Flash', ['Primarina'], 'released', ['Krabby']),
        s('Pretty Rare Candies', 'Toxic Spikes', ['Roserade'], 'released', ['Lilligant', 'Florges'], 'Ex for revenge song (Toxicroak) favored, not locked.'),
        s('Pretty Rare Candies', 'Marvel Scale', ['Milotic'], 'released', [], 'Love triangle undecided: Serperior / Dragonair / Gyarados.'),
        s('Pretty Rare Candies', 'Decorate', ['Alcremie'], 'released', ['Slurpuff', 'Vanillite'], 'Suitor leaning Indeedee vs. Meowstic.'),
        s('Pretty Rare Candies', 'Aurora Veil', ['Alolan Ninetales'], 'released'),
        s('Pretty Rare Candies', 'Runway Regi', ['Regirock'], 'released'),
        s('Pretty Rare Candies', 'Destiny Bond', ['Froslass'], 'released'),
        s('Pretty Rare Candies', 'Diamond Storm', ['Diancie'], 'released', ['Lucario'], 'Pining after Mega Lucario Z.'),
        s('Pretty Rare Candies', 'Sparkling Aria', ['Primarina'], 'released'),

        s('Pink Bois', 'Pink Pheromones', ['Salazzle'], 'released', [], 'Pheromone Edition intro.'),
        s('Pink Bois', 'Pink Bois', ['Heracross'], 'released'),
        s('Pink Bois', 'Pink Buzz', ['Electabuzz'], 'released'),
        s('Pink Bois', 'Poison Pink', ['Nidoking'], 'released'),
        s('Pink Bois', 'Wrap Me In Pink', ['Dratini'], 'released'),
        s('Pink Bois', 'Heavy Pink', ['Swampert'], 'released'),
        s('Pink Bois', 'Pink Haze', ['Quagsire'], 'released'),
        s('Pink Bois', 'Rock The Pink', ['Rhyhorn'], 'released'),
        s('Pink Bois', 'Paint Me Pink', ['Voltorb'], 'released'),
        s('Pink Bois', 'The Pink Below', ['Kyogre'], 'released'),
        s('Pink Bois', 'Pink Hierarchy (Bye Bye Butterfree)', ['Butterfree'], 'released'),

        s('Heart Scales', 'Scrappy Klutz', ['Lopunny'], 'released'),
        s('Heart Scales', 'Flower Trick', ['Meowscarada'], 'released'),
        s('Heart Scales', "I'm the Pheromosa", ['Pheromosa'], 'released'),
        s('Heart Scales', 'Relic Song', ['Meloetta'], 'released'),
        s('Heart Scales', 'Make It Rain', ['Gholdengo'], 'released'),
        s('Heart Scales', 'Just a Ditto', ['Ditto'], 'released'),

        s('Banned Badge', 'Mean Look', ['Gothitelle'], 'released'),
        s('Banned Badge', 'Magic Bounce', ['Hatterene'], 'released'),
        s('Banned Badge', 'Lovely Kiss', ['Jynx'], 'released'),
        s('Banned Badge', 'Power Whip', ['Tsareena'], 'released'),
        s('Banned Badge', 'Pixilate', ['Gardevoir'], 'released'),
    ];
    return { eras, songs };
}

export async function GET() {
    try {
        let data = await getRow(KEY) as SongCast | null;
        if (!data) {
            data = seed();
            await setRow(KEY, data);
        }
        return NextResponse.json({ success: true, cast: data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { cast } = await req.json();
        if (!cast || !Array.isArray(cast.songs)) {
            return NextResponse.json({ success: false, error: 'Invalid cast' }, { status: 400 });
        }
        await setRow(KEY, cast);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
