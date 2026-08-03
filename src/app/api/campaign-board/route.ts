import { NextResponse } from 'next/server';
import { getRow, setRow } from '@/lib/db';

const KEY = 'prc_campaign_board';

export type CardStatus = 'idea' | 'in-progress' | 'ready' | 'posted';
export type Stream = 'video' | 'carousel' | 'comedy';

export interface MenialTask {
    id: string;
    label: string;
    done: boolean;
}

export interface CampaignCard {
    id: string;
    stream: Stream;
    title: string;
    subtitle?: string;
    notes?: string;
    status: CardStatus;
    pinned?: boolean;
    tasks: MenialTask[];
    created_at: string;
    updated_at: string;
}

export interface OpenThread {
    id: string;
    text: string;
}

export interface CampaignBoard {
    cards: CampaignCard[];
    threads: OpenThread[];
}

function defaultTasks(done: boolean): MenialTask[] {
    return [
        { id: 'upload', label: 'Upload', done },
        { id: 'caption', label: 'Write caption', done },
        { id: 'convert', label: 'Convert / export', done },
        { id: 'post', label: 'Post', done },
    ];
}

function seed(): CampaignBoard {
    const now = new Date().toISOString();
    const card = (partial: Partial<CampaignCard> & Pick<CampaignCard, 'stream' | 'title' | 'status'>): CampaignCard => ({
        id: `card_${Math.random().toString(36).slice(2, 10)}`,
        subtitle: '',
        notes: '',
        pinned: false,
        tasks: defaultTasks(partial.status === 'posted'),
        created_at: now,
        updated_at: now,
        ...partial,
    });

    return {
        cards: [
            card({ stream: 'carousel', title: 'Cast Reveal — Group Carousel', subtitle: 'Diancie + full cast', status: 'posted', notes: '"Pick your villain" reality-show-intro caption.' }),
            card({ stream: 'comedy', title: 'Jinx — Shopping Trip', subtitle: 'Reference format', status: 'posted', notes: 'Dramatic reality-TV audio over mundane footage. Performed well — this is the reference format for the comedy stream.' }),

            card({ stream: 'comedy', title: 'Confessional Cutaways', subtitle: 'Format idea', status: 'idea', notes: 'Solo "interview" shots — one devastating line about another character.' }),
            card({ stream: 'comedy', title: 'Mundane Task + Reality Score', subtitle: 'Format idea', status: 'idea', notes: 'The Jinx format, generalized to other characters.' }),
            card({ stream: 'comedy', title: 'Fake "Previously On" Recaps', subtitle: 'Format idea', status: 'idea', notes: 'Strings character posts into a continuing storyline.' }),
            card({ stream: 'comedy', title: 'Talking-Head Reaction Cuts', subtitle: 'Format idea', status: 'idea', notes: 'One character reacting to implied off-screen drama.' }),
            card({ stream: 'comedy', title: 'Exit Interview / Elimination Bit', subtitle: 'Format idea', status: 'idea', notes: 'Candidate for the campaign\'s missing finale beat.' }),

            card({ stream: 'video', title: 'Confessional-to-Performance', subtitle: 'Structure idea', status: 'idea', notes: 'Interview breaks into a performance sequence.' }),
            card({ stream: 'video', title: 'Group Challenge Gone Wrong', subtitle: 'Structure idea', status: 'idea', notes: 'Reality-competition framing escalates into the song\'s conflict.' }),
            card({ stream: 'video', title: 'Single-Location + B-Roll Drama', subtitle: 'Structure idea', status: 'idea', notes: 'Lower-lift default for tracks that don\'t get a full narrative video.' }),
            card({ stream: 'video', title: 'Rivalry Duet', subtitle: 'Structure idea', status: 'idea', notes: 'Two characters with tension share a video.' }),
        ],
        threads: [
            { id: 'thread_finale', text: 'No finale asset locked yet — mock elimination/reunion special is one option.' },
            { id: 'thread_roster', text: 'Character roster + track mapping not confirmed anywhere in writing.' },
            { id: 'thread_order', text: 'Posting order for the 8 character carousels not decided — leaning toward teaser Reel performance data (shares/saves) over album track order.' },
            { id: 'thread_cadence', text: 'YouTube teasers go public 1/day starting at album release — cadence not mapped against the IG posting schedule.' },
        ],
    };
}

async function getBoard(): Promise<CampaignBoard> {
    const data = await getRow(KEY);
    if (!data) {
        const seeded = seed();
        await setRow(KEY, seeded);
        return seeded;
    }
    return data as CampaignBoard;
}

export async function GET() {
    try {
        const board = await getBoard();
        return NextResponse.json({ success: true, board });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json() as { board: CampaignBoard };
        if (!body.board) {
            return NextResponse.json({ success: false, error: 'board is required' }, { status: 400 });
        }
        await setRow(KEY, body.board);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
