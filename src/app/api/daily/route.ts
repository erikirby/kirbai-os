import { NextResponse } from 'next/server';
import { getRow, setRow } from '@/lib/db';
import { getContext } from '@/lib/kirbai-ops';
import { getMetaLive } from '@/lib/meta-live';
import { findPostedOnInstagram } from '@/lib/posted-match';
import { safeCallGemini } from '@/lib/intel';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Kirbai OS daily brief. Runs once a day from Vercel Cron (see vercel.json) using the site's own
// Gemini key, and is stored so Home can show it. Cost: one Flash call a day (~4K tokens in, ~400 out).
const KEY = 'daily_brief';

export interface DailyBrief {
    date: string;
    generatedAt: string;
    text: string;
    flags: string[];
    followers: { instagram?: number; facebook?: number };
    model: string;
}

const todayCentral = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

async function generate(): Promise<DailyBrief> {
    const [ctx, live, prev] = await Promise.all([getContext(), getMetaLive(true), getRow(KEY) as Promise<DailyBrief | null>]);
    const date = todayCentral();

    // Facts computed in code, so the AI can't get them wrong.
    const flags: string[] = [];
    const late = ctx.calendar.filter(c => c.status !== 'posted' && c.scheduledDate! < date);
    late.forEach(c => flags.push(`"${c.title}" was due ${c.scheduledDate} and isn't marked posted.`));
    if (live?.recent?.length) {
        findPostedOnInstagram([...ctx.calendar, ...ctx.backlog], live.recent).forEach(({ card, post }) =>
            flags.push(`"${card.title}" looks already posted on Instagram (${post.timestamp.slice(0, 10)}) but the calendar says ${card.status}${card.scheduledDate ? ` for ${card.scheduledDate}` : ''}.`));
    }
    const followers = { instagram: live?.instagram?.followers, facebook: live?.facebook?.followers };
    const delta = (k: 'instagram' | 'facebook') =>
        prev?.followers?.[k] && followers[k] ? followers[k]! - prev.followers[k]! : null;

    const week = ctx.calendar.filter(c => c.scheduledDate! >= date && c.scheduledDate! <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
    const recentPosts = (live?.recent ?? []).slice(0, 6).map(p => `- ${p.timestamp.slice(0, 10)} ${p.type}: reach ${p.reach ?? '?'}, ${p.likes} likes · ${p.caption.split('\n')[0].slice(0, 80)}`).join('\n');

    const prompt = `You write Erik's daily Kirbai OS brief. Kirbai is his Pokémon character-song music project.
Today is ${date}. Write 4 to 6 short bullet points, friendly and plain, like a friend catching him up. No hype, no ad copy, never use em dashes.
Cover: what's due in the next 7 days, anything that needs fixing (use the flags exactly), how recent posts did, and one concrete suggestion for today.
Only use facts below. Don't invent numbers or dates.

Flags (already verified):
${flags.map(f => `- ${f}`).join('\n') || '- none'}

Next 7 days:
${week.map(c => `- ${c.scheduledDate}: ${c.title} (${c.status})`).join('\n') || '- nothing scheduled'}

Followers now: Instagram ${followers.instagram ?? '?'}${delta('instagram') !== null ? ` (${delta('instagram')! >= 0 ? '+' : ''}${delta('instagram')} since last brief)` : ''}, Facebook ${followers.facebook ?? '?'}${delta('facebook') !== null ? ` (${delta('facebook')! >= 0 ? '+' : ''}${delta('facebook')} since last brief)` : ''}

Recent Instagram posts:
${recentPosts || '- (live data unavailable)'}

Open decisions:
${ctx.decisions.map(t => `- ${t.text}`).join('\n') || '- none'}

Latest notes from his chats:
${ctx.notes.slice(0, 5).map(n => `- ${n.text}`).join('\n') || '- none'}`;

    let text = '';
    let model = 'gemini-2.5-flash';
    try {
        const res = await safeCallGemini('gemini-2.5-flash', { contents: prompt });
        text = (res.text ?? '').trim();
    } catch (e) {
        model = 'none (AI unavailable)';
        text = [...flags.map(f => `- ${f}`), ...week.map(c => `- Coming up ${c.scheduledDate}: ${c.title}`)].join('\n') || '- Nothing urgent today.';
    }
    text = text.replace(/\s*—\s*/g, ', ');

    const brief: DailyBrief = { date, generatedAt: new Date().toISOString(), text, flags, followers, model };
    await setRow(KEY, brief);
    return brief;
}

/**
 * GET /api/daily          -> today's brief (generates it if it's missing or from an earlier day)
 * GET /api/daily?force=1  -> regenerate now
 */
export async function GET(req: Request) {
    try {
        const force = new URL(req.url).searchParams.get('force') === '1';
        const stored = (await getRow(KEY)) as DailyBrief | null;
        const fresh = stored && Date.now() - new Date(stored.generatedAt).getTime() < 10 * 60 * 1000;
        // Refresh is capped at once per 10 minutes so the free AI quota can't be burned by repeat clicks.
        if (stored && (fresh || (!force && stored.date === todayCentral()))) return NextResponse.json({ success: true, brief: stored });
        return NextResponse.json({ success: true, brief: await generate() });
    } catch (e) {
        return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
}
