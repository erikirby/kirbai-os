import { NextResponse } from 'next/server';
import { setRow } from '@/lib/db';
import { loadSongCast, SONG_CAST_KEY } from '@/lib/song-cast';

export const dynamic = 'force-dynamic';

export type { SongStatus, CastSong, SongCast } from '@/lib/song-cast';

export async function GET() {
    try {
        return NextResponse.json({ success: true, cast: await loadSongCast() });
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
        await setRow(SONG_CAST_KEY, cast);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
