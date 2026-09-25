// The one pathway for an outside AI (Claude, ChatGPT, a script) to read and update Kirbai OS.
// Used by /api/ai (REST), /api/mcp (MCP connector) and nothing else writes these keys behind the UI's back.
import { getRow, setRow } from '@/lib/db';
import { loadSongCast, SONG_CAST_KEY, type CastSong, type SongStatus } from '@/lib/song-cast';
import type { CampaignBoard, CampaignCard, CardStatus, Stream, Platform } from '@/app/api/campaign-board/route';

const BOARD_KEY = 'prc_campaign_board';
const PROJECTS_KEY = 'vault_projects';
export const NOTES_KEY = 'ai_notes';
export const LOG_KEY = 'ai_log';

export interface AiNote { id: string; text: string; source: string; created_at: string }
export interface AiLogEntry { at: string; source: string; summary: string }

interface VaultProject {
    id: string; title: string; alias: string; status?: string; releaseDate?: string;
    lore?: string; worldbuilding?: string; tracklist?: string[]; visualVibe?: string;
    targetTrackCount?: number; [k: string]: unknown;
}

export type Op =
    | { op: 'add_item'; title: string; date?: string; stream?: Stream; subtitle?: string; notes?: string; status?: CardStatus; platforms?: Platform[] }
    | { op: 'update_item'; id?: string; match?: string; title?: string; date?: string | null; stream?: Stream; subtitle?: string; notes?: string; status?: CardStatus; platforms?: Platform[] }
    | { op: 'delete_item'; id?: string; match?: string }
    | { op: 'add_decision'; text: string }
    | { op: 'resolve_decision'; id?: string; match?: string }
    | { op: 'upsert_song'; title: string; era?: string; mains?: string[]; cameos?: string[]; status?: SongStatus; note?: string }
    | { op: 'delete_song'; title: string }
    | { op: 'update_project'; match: string; status?: string; releaseDate?: string; tracklist?: string[]; lore?: string; worldbuilding?: string; append_lore?: string; append_worldbuilding?: string; visualVibe?: string }
    | { op: 'add_note'; text: string }
    | { op: 'dismiss_note'; id: string };

const STREAMS: Stream[] = ['video', 'carousel', 'comedy'];
const STATUSES: CardStatus[] = ['idea', 'in-progress', 'ready', 'posted'];
const today = () => new Date().toISOString().slice(0, 10);
const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function findBy<T>(list: T[], label: (t: T) => string, id: (t: T) => string, key?: { id?: string; match?: string }): T | undefined {
    if (key?.id) { const hit = list.find(x => id(x) === key.id); if (hit) return hit; }
    if (!key?.match) return undefined;
    const n = norm(key.match);
    return list.find(x => norm(label(x)) === n) ?? list.find(x => norm(label(x)).includes(n) || n.includes(norm(label(x))));
}

function tasks(done: boolean) {
    return ['Upload', 'Write caption', 'Convert / export', 'Post'].map((label, i) => ({ id: ['upload', 'caption', 'convert', 'post'][i], label, done }));
}

/** Apply a batch of ops. Each op reports ok/error on its own so one bad op doesn't sink the rest. */
export async function applyOps(ops: Op[], source = 'ai'): Promise<{ results: { op: string; ok: boolean; detail: string }[] }> {
    const board = ((await getRow(BOARD_KEY)) ?? { cards: [], threads: [] }) as CampaignBoard;
    const cast = await loadSongCast();
    const projects = ((await getRow(PROJECTS_KEY)) ?? []) as VaultProject[];
    const notes = ((await getRow(NOTES_KEY)) ?? []) as AiNote[];
    const dirty = { board: false, cast: false, projects: false, notes: false };
    const results: { op: string; ok: boolean; detail: string }[] = [];
    const now = new Date().toISOString();
    const findCard = (k: { id?: string; match?: string }) => findBy(board.cards, c => c.title, c => c.id, k);

    for (const o of ops) {
        try {
            switch (o.op) {
                case 'add_item': {
                    if (!o.title?.trim()) throw new Error('title is required');
                    const stream = STREAMS.includes(o.stream as Stream) ? o.stream! : 'video';
                    const status = STATUSES.includes(o.status as CardStatus) ? o.status! : 'idea';
                    const card: CampaignCard = {
                        id: rid('card'), stream, title: o.title.trim(), subtitle: o.subtitle ?? '', notes: o.notes ?? '',
                        status, pinned: false, tasks: tasks(status === 'posted'), created_at: now, updated_at: now,
                        ...(o.date ? { scheduledDate: o.date } : {}), ...(o.platforms ? { platforms: o.platforms } : {}),
                    };
                    board.cards.push(card); dirty.board = true;
                    results.push({ op: o.op, ok: true, detail: `Added "${card.title}"${o.date ? ` on ${o.date}` : ' to the backlog'} (id ${card.id})` });
                    break;
                }
                case 'update_item': {
                    const c = findCard(o);
                    if (!c) throw new Error(`No calendar item matches "${o.id ?? o.match}"`);
                    if (o.title !== undefined) c.title = o.title;
                    if (o.subtitle !== undefined) c.subtitle = o.subtitle;
                    if (o.notes !== undefined) c.notes = o.notes;
                    if (o.stream && STREAMS.includes(o.stream)) c.stream = o.stream;
                    if (o.status && STATUSES.includes(o.status)) { c.status = o.status; if (o.status === 'posted') c.tasks = c.tasks.map(t => ({ ...t, done: true })); }
                    if (o.platforms) c.platforms = o.platforms;
                    if (o.date === null) delete c.scheduledDate; else if (o.date) c.scheduledDate = o.date;
                    c.updated_at = now; dirty.board = true;
                    results.push({ op: o.op, ok: true, detail: `Updated "${c.title}"` });
                    break;
                }
                case 'delete_item': {
                    const c = findCard(o);
                    if (!c) throw new Error(`No calendar item matches "${o.id ?? o.match}"`);
                    board.cards = board.cards.filter(x => x.id !== c.id); dirty.board = true;
                    results.push({ op: o.op, ok: true, detail: `Deleted "${c.title}"` });
                    break;
                }
                case 'add_decision': {
                    if (!o.text?.trim()) throw new Error('text is required');
                    board.threads.push({ id: rid('thread'), text: o.text.trim() }); dirty.board = true;
                    results.push({ op: o.op, ok: true, detail: `Added decision: ${o.text.trim()}` });
                    break;
                }
                case 'resolve_decision': {
                    const t = findBy(board.threads, x => x.text, x => x.id, o);
                    if (!t) throw new Error(`No open decision matches "${o.id ?? o.match}"`);
                    board.threads = board.threads.filter(x => x.id !== t.id); dirty.board = true;
                    results.push({ op: o.op, ok: true, detail: `Resolved: ${t.text}` });
                    break;
                }
                case 'upsert_song': {
                    if (!o.title?.trim()) throw new Error('title is required');
                    const existing = findBy(cast.songs, s => s.title, s => s.id, { match: o.title });
                    if (existing && norm(existing.title) === norm(o.title)) {
                        if (o.era) existing.era = o.era;
                        if (o.mains) existing.mains = o.mains;
                        if (o.cameos) existing.cameos = o.cameos;
                        if (o.status) existing.status = o.status;
                        if (o.note !== undefined) existing.note = o.note;
                        results.push({ op: o.op, ok: true, detail: `Updated song "${existing.title}"` });
                    } else {
                        const era = o.era || 'Next Era';
                        const song: CastSong = { id: rid('song'), era, title: o.title.trim(), mains: o.mains ?? [], cameos: o.cameos ?? [], status: o.status ?? 'idea', note: o.note ?? '' };
                        cast.songs.push(song);
                        results.push({ op: o.op, ok: true, detail: `Added song "${song.title}" to ${era}` });
                    }
                    const eraName = o.era;
                    if (eraName && !cast.eras.includes(eraName)) cast.eras.unshift(eraName);
                    dirty.cast = true;
                    break;
                }
                case 'delete_song': {
                    const s = cast.songs.find(x => norm(x.title) === norm(o.title));
                    if (!s) throw new Error(`No song titled "${o.title}"`);
                    cast.songs = cast.songs.filter(x => x.id !== s.id); dirty.cast = true;
                    results.push({ op: o.op, ok: true, detail: `Deleted song "${s.title}"` });
                    break;
                }
                case 'update_project': {
                    const p = findBy(projects.filter(x => x.alias === 'Kirbai'), x => x.title, x => x.id, { match: o.match });
                    if (!p) throw new Error(`No Kirbai Vault project matches "${o.match}"`);
                    if (o.status) p.status = o.status;
                    if (o.releaseDate) p.releaseDate = o.releaseDate;
                    if (o.tracklist) p.tracklist = o.tracklist;
                    if (o.visualVibe !== undefined) p.visualVibe = o.visualVibe;
                    if (o.lore !== undefined) p.lore = o.lore;
                    if (o.worldbuilding !== undefined) p.worldbuilding = o.worldbuilding;
                    if (o.append_lore) p.lore = `${p.lore ?? ''}\n\n[${today()}] ${o.append_lore}`.trim();
                    if (o.append_worldbuilding) p.worldbuilding = `${p.worldbuilding ?? ''}\n\n[${today()}] ${o.append_worldbuilding}`.trim();
                    p.updatedAt = Date.now(); dirty.projects = true;
                    results.push({ op: o.op, ok: true, detail: `Updated Vault project "${p.title}"` });
                    break;
                }
                case 'add_note': {
                    if (!o.text?.trim()) throw new Error('text is required');
                    notes.unshift({ id: rid('note'), text: o.text.trim(), source, created_at: now }); dirty.notes = true;
                    results.push({ op: o.op, ok: true, detail: 'Saved note' });
                    break;
                }
                case 'dismiss_note': {
                    const before = notes.length;
                    const kept = notes.filter(n => n.id !== o.id);
                    if (kept.length === before) throw new Error(`No note with id ${o.id}`);
                    notes.splice(0, notes.length, ...kept); dirty.notes = true;
                    results.push({ op: o.op, ok: true, detail: 'Dismissed note' });
                    break;
                }
                default:
                    throw new Error(`Unknown op "${(o as { op: string }).op}"`);
            }
        } catch (e) {
            results.push({ op: (o as { op: string })?.op ?? '?', ok: false, detail: e instanceof Error ? e.message : String(e) });
        }
    }

    if (dirty.board) await setRow(BOARD_KEY, board);
    if (dirty.cast) await setRow(SONG_CAST_KEY, cast);
    if (dirty.projects) await setRow(PROJECTS_KEY, projects);
    if (dirty.notes) await setRow(NOTES_KEY, notes.slice(0, 100));

    const okOnes = results.filter(r => r.ok && r.op !== 'dismiss_note');
    if (okOnes.length) {
        const log = ((await getRow(LOG_KEY)) ?? []) as AiLogEntry[];
        log.unshift({ at: now, source, summary: okOnes.map(r => r.detail).join(' · ') });
        await setRow(LOG_KEY, log.slice(0, 50));
    }
    return { results };
}

/** Everything an AI needs to know before suggesting changes, as JSON + a readable markdown brief. */
export async function getContext() {
    const board = ((await getRow(BOARD_KEY)) ?? { cards: [], threads: [] }) as CampaignBoard;
    const cast = await loadSongCast();
    const projects = (((await getRow(PROJECTS_KEY)) ?? []) as VaultProject[]).filter(p => p.alias === 'Kirbai');
    const notes = ((await getRow(NOTES_KEY)) ?? []) as AiNote[];
    const log = ((await getRow(LOG_KEY)) ?? []) as AiLogEntry[];

    const dated = board.cards.filter(c => c.scheduledDate).sort((a, b) => (a.scheduledDate! < b.scheduledDate! ? -1 : 1));
    const upcoming = dated.filter(c => c.status !== 'posted' || c.scheduledDate! >= today());
    const backlog = board.cards.filter(c => !c.scheduledDate && c.status !== 'posted');

    const line = (c: CampaignCard) => `- [${c.id}] ${c.scheduledDate ?? 'no date'} · ${c.title} (${c.stream}, ${c.status})${c.subtitle ? ` · ${c.subtitle}` : ''}`;
    const md = [
        `# Kirbai OS — current state (${today()})`,
        '',
        '## Release calendar (Studio)',
        ...(upcoming.length ? upcoming.map(line) : ['(nothing scheduled)']),
        '',
        '## Backlog (undated ideas)',
        ...(backlog.length ? backlog.map(line) : ['(empty)']),
        '',
        '## Open decisions',
        ...(board.threads.length ? board.threads.map(t => `- [${t.id}] ${t.text}`) : ['(none)']),
        '',
        '## Cast Sheet (song -> characters)',
        ...cast.eras.flatMap(era => {
            const songs = cast.songs.filter(s => s.era === era);
            return songs.length ? [`### ${era}`, ...songs.map(s => `- ${s.title} [${s.status}]: ${s.mains.join(', ') || '?'}${s.cameos.length ? ` (cameos: ${s.cameos.join(', ')})` : ''}${s.note ? ` · ${s.note}` : ''}`)] : [];
        }),
        '',
        '## Vault projects',
        ...projects.map(p => `- ${p.title} [${p.status ?? 'Draft'}]${p.releaseDate ? ` released ${p.releaseDate}` : ''} · ${(p.tracklist ?? []).length} tracks`),
        '',
        '## Recent notes from chats',
        ...(notes.slice(0, 10).map(n => `- ${n.created_at.slice(0, 10)} (${n.source}): ${n.text}`)),
        ...(notes.length ? [] : ['(none)']),
    ].join('\n');

    return {
        today: today(),
        markdown: md,
        calendar: upcoming, backlog, decisions: board.threads,
        cast, projects: projects.map(p => ({ id: p.id, title: p.title, status: p.status, releaseDate: p.releaseDate, tracklist: p.tracklist, lore: p.lore, worldbuilding: p.worldbuilding })),
        notes: notes.slice(0, 20), recentChanges: log.slice(0, 10),
    };
}

export const OPS_HELP = `Ops (send as {"ops":[...], "source":"chatgpt"|"claude"}):
- add_item {title, date?: "YYYY-MM-DD", stream?: video|carousel|comedy, subtitle?, notes?, status?: idea|in-progress|ready|posted}  (no date = backlog idea)
- update_item {id or match (title), title?, date? (null = unschedule), stream?, subtitle?, notes?, status?}
- delete_item {id or match}
- add_decision {text} / resolve_decision {id or match}
- upsert_song {title, era?, mains?: [..], cameos?: [..], status?: released|upcoming|written|idea, note?}
- delete_song {title}
- update_project {match (Vault project title), status?, releaseDate?, tracklist?, append_lore?, append_worldbuilding?, lore?, worldbuilding?}
- add_note {text}  (free-form plans/thoughts that don't fit elsewhere; shown on Home)
Mark a subtitle containing "LOCKED" or "GOAL" to make an item a release milestone.`;
