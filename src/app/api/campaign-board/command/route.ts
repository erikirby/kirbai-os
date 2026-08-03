import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { safeCallGemini, extractJsonFromText } from '@/lib/intel';
import { getRow, setRow } from '@/lib/db';
import type { CampaignBoard, CampaignCard, MenialTask, Stream } from '../route';

const KEY = 'prc_campaign_board';

function findCard(cards: CampaignCard[], match?: string): CampaignCard | undefined {
    if (!match) return undefined;
    const needle = match.trim().toLowerCase();
    return cards.find(c => c.title.toLowerCase() === needle)
        || cards.find(c => c.title.toLowerCase().includes(needle) || needle.includes(c.title.toLowerCase()));
}

function defaultTasks(): MenialTask[] {
    return [
        { id: 'upload', label: 'Upload', done: false },
        { id: 'caption', label: 'Write caption', done: false },
        { id: 'convert', label: 'Convert / export', done: false },
        { id: 'post', label: 'Post', done: false },
    ];
}

export async function POST(req: Request) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API Key missing in environment." }, { status: 500 });
    }

    try {
        const { command } = await req.json() as { command: string };
        if (!command || !command.trim()) {
            return NextResponse.json({ success: false, error: 'command is required' }, { status: 400 });
        }

        const board = (await getRow(KEY)) as CampaignBoard;
        const cardSummary = board.cards.map(c => `- "${c.title}" [stream: ${c.stream}, status: ${c.status}]`).join('\n');

        const prompt = `
You are the assistant for "Studio", a calm campaign moodboard for Erik's Pretty Rare Candies (Kirbai/Pokémon) album rollout.
The board has three streams: "video" (music videos), "carousel" (photo carousels), "comedy" (comedy/lifestyle clips).
Card status is one of: idea, in-progress, ready, posted.
Each card also has a menial checklist (Upload / Write caption / Convert / export / Post).

Current cards:
${cardSummary || '(none yet)'}

The user just typed this instruction into the board's command bar:
"${command}"

Turn it into a list of actions. Supported action types:
- add_card: { type, stream, title, subtitle?, notes? }
- update_status: { type, match, status }
- toggle_task: { type, match, task_label, done }
- pin_card: { type, match, pinned }
- update_notes: { type, match, notes }
- delete_card: { type, match }

"match" must be the card's existing title (or a close substring of it) so it can be resolved. Only include fields relevant to the action type.
Also write a short (under 15 words), warm, low-key confirmation message describing what you did, in the app's calm tone.
If the instruction doesn't map to any action (e.g. it's a question), return an empty actions array and answer briefly in "reply".
`;

        const response = await safeCallGemini("gemini-2.5-flash", {
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        reply: { type: Type.STRING },
                        actions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    match: { type: Type.STRING },
                                    stream: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    subtitle: { type: Type.STRING },
                                    notes: { type: Type.STRING },
                                    status: { type: Type.STRING },
                                    task_label: { type: Type.STRING },
                                    done: { type: Type.BOOLEAN },
                                    pinned: { type: Type.BOOLEAN },
                                },
                                required: ["type"],
                            },
                        },
                    },
                    required: ["reply", "actions"],
                },
            },
        });

        const raw = typeof (response as any).text === 'function' ? (response as any).text() : (response as any).text;
        const parsed = JSON.parse(extractJsonFromText(raw));

        const now = new Date().toISOString();
        let cards = [...board.cards];

        for (const action of parsed.actions || []) {
            if (action.type === 'add_card' && action.title) {
                const stream: Stream = ['video', 'carousel', 'comedy'].includes(action.stream) ? action.stream : 'comedy';
                cards.push({
                    id: `card_${Math.random().toString(36).slice(2, 10)}`,
                    stream, title: action.title, subtitle: action.subtitle || '', notes: action.notes || '',
                    status: 'idea', pinned: false, tasks: defaultTasks(),
                    created_at: now, updated_at: now,
                });
            } else if (action.type === 'update_status') {
                const card = findCard(cards, action.match);
                if (card && ['idea', 'in-progress', 'ready', 'posted'].includes(action.status)) {
                    card.status = action.status;
                    card.updated_at = now;
                }
            } else if (action.type === 'toggle_task') {
                const card = findCard(cards, action.match);
                if (card) {
                    const needle = (action.task_label || '').toLowerCase();
                    card.tasks = card.tasks.map(t => t.label.toLowerCase().includes(needle) ? { ...t, done: action.done ?? !t.done } : t);
                    card.updated_at = now;
                }
            } else if (action.type === 'pin_card') {
                const card = findCard(cards, action.match);
                if (card) { card.pinned = action.pinned ?? true; card.updated_at = now; }
            } else if (action.type === 'update_notes') {
                const card = findCard(cards, action.match);
                if (card) { card.notes = action.notes || card.notes; card.updated_at = now; }
            } else if (action.type === 'delete_card') {
                const card = findCard(cards, action.match);
                if (card) cards = cards.filter(c => c.id !== card.id);
            }
        }

        const nextBoard: CampaignBoard = { ...board, cards };
        await setRow(KEY, nextBoard);

        return NextResponse.json({ success: true, board: nextBoard, reply: parsed.reply || 'Done.' });
    } catch (e: any) {
        console.error('[campaign-board/command] Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
