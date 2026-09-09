import { NextResponse } from 'next/server';
import { getRow, setRow } from '@/lib/db';
import { PRC_STORY_ROOM_SEED, type StoryRoomState } from '@/lib/story-room-seed';

export const dynamic = 'force-dynamic';

const keyFor = (mode: string) => (mode === 'factory' ? 'story_room_factory' : 'story_room_kirbai');

export async function GET(req: Request) {
    try {
        const mode = new URL(req.url).searchParams.get('mode') || 'kirbai';
        let data = (await getRow(keyFor(mode))) as StoryRoomState | null;

        // Seed the Kirbai board once from the imported PRC corkboard.
        if (!data && mode === 'kirbai') {
            data = PRC_STORY_ROOM_SEED;
            await setRow('story_room_kirbai', data);
        }

        // Back-fill the Skit Roadmap / Music Videos / Final Battle sheets onto boards saved
        // before those tabs existed (Phase 1 only shipped the relationship board).
        if (data && mode === 'kirbai' && (!data.skitRoadmap || !data.musicVideos || !data.finalBattle)) {
            data = {
                ...data,
                skitRoadmap: data.skitRoadmap ?? PRC_STORY_ROOM_SEED.skitRoadmap,
                musicVideos: data.musicVideos ?? PRC_STORY_ROOM_SEED.musicVideos,
                finalBattle: data.finalBattle ?? PRC_STORY_ROOM_SEED.finalBattle,
            };
            await setRow('story_room_kirbai', data);
        }

        return NextResponse.json(data ?? { era: '', characters: [] });
    } catch (e: any) {
        console.error('Story Room GET error:', e);
        return NextResponse.json({ era: '', characters: [] });
    }
}

export async function POST(req: Request) {
    try {
        const mode = new URL(req.url).searchParams.get('mode') || 'kirbai';
        const body = (await req.json()) as StoryRoomState;
        if (!Array.isArray(body?.characters)) throw new Error('Missing characters array');
        await setRow(keyFor(mode), body);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Story Room POST error:', e);
        return NextResponse.json({ error: e.message || 'Failed to save story room' }, { status: 500 });
    }
}
