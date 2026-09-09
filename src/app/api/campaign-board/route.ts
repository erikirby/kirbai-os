import { NextResponse } from 'next/server';
import { getRow, setRow } from '@/lib/db';

const KEY = 'prc_campaign_board';

export type CardStatus = 'idea' | 'in-progress' | 'ready' | 'posted';
export type Stream = 'video' | 'carousel' | 'comedy';
export type Platform = 'instagram' | 'facebook' | 'tiktok';

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
    /** Target post date for the Calendar view. Undated cards sit in the backlog. */
    scheduledDate?: string;
    /** Which platforms this goes out on. Native content defaults to instagram. */
    platforms?: Platform[];
}

export interface OpenThread {
    id: string;
    text: string;
}

export interface PlatformCadence {
    postsPerWeek: string;
    note: string;
}

export interface CadencePlan {
    updated_at: string;
    dataAsOf: string;
    platforms: Record<Platform, PlatformCadence>;
    findings: string[];
}

export interface CampaignBoard {
    cards: CampaignCard[];
    threads: OpenThread[];
    cadence?: CadencePlan;
}

function defaultTasks(done: boolean): MenialTask[] {
    return [
        { id: 'upload', label: 'Upload', done },
        { id: 'caption', label: 'Write caption', done },
        { id: 'convert', label: 'Convert / export', done },
        { id: 'post', label: 'Post', done },
    ];
}

function cadencePlan(): CadencePlan {
    return {
        updated_at: new Date().toISOString(),
        dataAsOf: '2026-09-08 (live Meta pull; static snapshot 2026-09-03)',
        platforms: {
            instagram: {
                postsPerWeek: '3 Reels + 1 carousel',
                note: 'July ran ~4-5 posts/week of templated "Islander reveal: X" teasers and averaged only 4K-13K reach each. Sept has run 3 posts/week (Runway Regi 214K reach, Poké Island Ep.2 5.6K, Regi carousel 25K) at a much higher engagement rate. Volume wasn\'t the problem — repeating one format was. Hold this cadence; don\'t scale posts back up without a new format behind them.',
            },
            facebook: {
                postsPerWeek: '3-4 (repost only)',
                note: '$0 monetization on every post (not enrolled/eligible for payout). Auto-cross-post whatever goes to Instagram — no dedicated FB shoots, edits, or captions.',
            },
            tiktok: {
                postsPerWeek: '1-2 (repost only)',
                note: '$0 in royalties despite 2.62M trailing-year views; the app leans on product-selling content that doesn\'t fit Kirbai. Repost the strongest IG Reels as-is for reach only — no dedicated TikTok production.',
            },
        },
        findings: [
            'June-July dip explained: the highest-cadence stretch of the year (July IG: 19 posts) coincided with the lowest per-post views (avg ~7.3K) because every post was the same "Islander reveal: [Character]" teaser template. Aug-Sept dropped cadence but shifted to the Poké Island narrative series and culture-reference formats (Runway Regi referencing @regirocktok) and reach jumped 4-40x. Format fatigue, not volume, drove the dip.',
            'Engagement-rate proxy (total_interactions / reach, pulled live 2026-09-08 — instagram_reel_retention is not actually exposed by the deployed connector despite being listed, so true skip-rate/watch-time isn\'t available; flag this to fix before the next cadence review): pre-release teaser Reels ran ~8-14%. Poké Island episodes and the Runway Regi drag-culture Reel ran ~14-25%. Weight new Reels toward episodic Poké Island continuity and culture/meme-literate bits over standalone character reveals.',
            'Poké Island (2 episodes live, built on PRC track remixes) is the clearest post-release format winner and should be the spine of Q4 IG content, not a side series.',
            'Facebook page_impressions and page_fan_adds are rejected as invalid metric names by the live connector (needs a SAFE_PAGE_METRICS fix in the connector\'s lib/meta.ts, same shape as the plays→views Reels fix) — page_post_engagements/page_views_total returned empty rather than erroring. Facebook cadence above is set from the static $0-monetization snapshot, not a live number.',
            'TikTok tools errored on this pull (no TIKTOK_ACCESS_TOKEN configured) — cadence above is set from the Sept 3 snapshot, not live data.',
        ],
    };
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

            // Post-release calendar — dated, data-driven (see cadence.findings)
            card({ stream: 'carousel', title: 'Milotic hero-card redo', subtitle: 'Post-release backlog', status: 'idea', notes: 'Redo to match the current hero-card template (locked pose/text conventions used by the other 7 cast members). Outstanding since pre-release per docs/pretty-rare-candies-characters.md.', scheduledDate: '2026-09-15', platforms: ['instagram'] }),
            card({ stream: 'video', title: 'Poké Island: Episode 3', subtitle: 'Narrative series — proven format', status: 'idea', notes: 'Highest engagement-rate format post-release (see cadence.findings). Keep building the episodic cast dynamic rather than one-off character bits.', scheduledDate: '2026-09-19', platforms: ['instagram', 'facebook'] }),
            card({ stream: 'comedy', title: 'Runway Regi follow-up bit', subtitle: 'Culture-reference format', status: 'idea', notes: 'Sept 2 Runway Regi (referencing @regirocktok) is the single best performer of the whole rollout — 214K reach, ~25% engagement rate. Do a same-format follow-up (different Regis/legendaries, same drag-runway bit) while it\'s still hot.', scheduledDate: '2026-09-12', platforms: ['instagram'] }),
            card({ stream: 'carousel', title: 'Cast lyric-card catch-up', subtitle: 'Format: lyric cards', status: 'idea', notes: 'Lower-lift carousel slot for characters that never got a lyric-card writeup (Milotic + Ninetales already done).', scheduledDate: '2026-09-22', platforms: ['instagram'] }),
        ],
        threads: [
            { id: 'thread_finale', text: 'No finale asset locked yet — mock elimination/reunion special is one option.' },
            { id: 'thread_roster', text: 'Character roster + track mapping not confirmed anywhere in writing.' },
        ],
        cadence: cadencePlan(),
    };
}

/** Back-fills cadence + dated calendar cards onto boards persisted before the Calendar view existed. Idempotent. */
function migrate(board: CampaignBoard): CampaignBoard {
    let next = board;
    if (!next.cadence) {
        next = { ...next, cadence: cadencePlan() };
    }
    const resolvedThreadIds = new Set(['thread_cadence', 'thread_order']);
    if (next.threads.some(t => resolvedThreadIds.has(t.id))) {
        next = { ...next, threads: next.threads.filter(t => !resolvedThreadIds.has(t.id)) };
    }
    if (!next.cards.some(c => c.id.startsWith('card_cal_seed_'))) {
        const seeded = seed();
        const calendarCards = seeded.cards.filter(c => c.scheduledDate).map((c, i) => ({ ...c, id: `card_cal_seed_${i}` }));
        next = { ...next, cards: [...next.cards, ...calendarCards] };
    }
    // The board already had its own "Pretty Rare Candies — Title Track Video" backlog card before
    // this migration existed. Erik confirmed 2026-09-08 it's already released (as is Runway Regi) —
    // fold the duplicate into the real card and mark it posted rather than leaving it "scheduled."
    const titleTrackRe = /title.?track/i;
    const duplicateMv = next.cards.find(c => c.id === 'card_cal_seed_2' && titleTrackRe.test(c.title));
    const existingMv = next.cards.find(c => c.id !== duplicateMv?.id && titleTrackRe.test(c.title));
    if (duplicateMv && existingMv) {
        next = {
            ...next,
            cards: next.cards
                .filter(c => c.id !== duplicateMv.id)
                .map(c => c.id === existingMv.id ? { ...c, status: 'posted' as CardStatus, scheduledDate: undefined } : c),
        };
    }
    // Erik confirmed 2026-09-08: Runway Regi already released, Alcremie is next. Swap the generic
    // "follow-up bit" placeholder for the actual next release (only if it hasn't been retitled since).
    next = {
        ...next,
        cards: next.cards.map(c => c.id === 'card_cal_seed_3' && c.title === 'Runway Regi follow-up bit'
            ? {
                ...c,
                title: 'Alcremie payoff clip — lighter-touch redo',
                notes: 'Redo Alcremie\'s payoff to the single-looping-effect format used for the ice-type payoffs (currently a shopping-bags/notification-icon concept flagged in docs/pretty-rare-candies-characters.md as not yet updated). Confirmed as the next release after Runway Regi (Erik, 2026-09-08).',
                scheduledDate: '2026-09-11',
            }
            : c),
    };
    return next;
}

async function getBoard(): Promise<CampaignBoard> {
    const data = await getRow(KEY);
    if (!data) {
        const seeded = seed();
        await setRow(KEY, seeded);
        return seeded;
    }
    const migrated = migrate(data as CampaignBoard);
    if (migrated !== data) {
        await setRow(KEY, migrated);
    }
    return migrated;
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
