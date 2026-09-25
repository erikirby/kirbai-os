// Live Instagram + Facebook numbers, fetched from Erik's read-only "Kirbai Stats" MCP server.
// Kirbai OS deliberately holds NO Meta token: the site cannot post to Instagram/Facebook, even if
// someone gets into it or a button misfires. The Stats server only exposes read tools.
const STATS_MCP = process.env.KIRBAI_STATS_MCP_URL || 'https://kirbai-stats-connector.vercel.app/api/mcp';
const TTL_MS = 10 * 60 * 1000;

export interface LivePost {
    id: string; caption: string; permalink: string; timestamp: string; type: string;
    likes: number; comments: number; reach: number | null; interactions: number | null;
}
export interface MetaLive {
    fetchedAt: string;
    instagram: { followers: number; mediaCount: number } | null;
    facebook: { followers: number } | null;
    recent: LivePost[];
    error?: string;
}

let cache: { at: number; data: MetaLive } | null = null;

/** Call one read tool on the Stats server and return the JSON block inside its text reply. */
async function callTool<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(STATS_MCP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
        cache: 'no-store',
    });
    const raw = await res.text();
    const payload = raw.split('\n').find(l => l.startsWith('data:'))?.slice(5) ?? raw;
    const msg = JSON.parse(payload);
    if (msg.error) throw new Error(msg.error.message);
    const text: string = msg.result?.content?.[0]?.text ?? '';
    const json = text.match(/```json\s*([\s\S]*?)```/)?.[1];
    if (!json) throw new Error(`${name}: ${text.slice(0, 200) || 'empty reply'}`);
    return JSON.parse(json) as T;
}

export async function getMetaLive(force = false): Promise<MetaLive | null> {
    if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;

    try {
        type Overview = { instagram?: { followers_count: number; media_count: number }; facebook?: { followers_count: number } };
        type Media = { media: { id: string; caption?: string; permalink: string; timestamp: string; media_product_type: string; like_count?: number; comments_count?: number; insights?: { reach?: number; total_interactions?: number } }[] };
        const [overview, media] = await Promise.all([
            callTool<Overview>('social_overview'),
            callTool<Media>('instagram_recent_media', { limit: 12, includeInsights: true }).catch(() => ({ media: [] }) as Media),
        ]);

        const data: MetaLive = {
            fetchedAt: new Date().toISOString(),
            instagram: overview.instagram ? { followers: overview.instagram.followers_count, mediaCount: overview.instagram.media_count } : null,
            facebook: overview.facebook ? { followers: overview.facebook.followers_count } : null,
            recent: (media.media ?? []).map(m => ({
                id: m.id, caption: m.caption ?? '', permalink: m.permalink, timestamp: m.timestamp,
                type: m.media_product_type === 'REELS' ? 'Reel' : m.media_product_type === 'FEED' ? 'Post' : m.media_product_type,
                likes: m.like_count ?? 0, comments: m.comments_count ?? 0,
                reach: m.insights?.reach ?? null, interactions: m.insights?.total_interactions ?? null,
            })),
        };
        cache = { at: Date.now(), data };
        return data;
    } catch (e) {
        // Serve the last good numbers if the Stats server hiccups; otherwise report the error.
        if (cache) return { ...cache.data, error: e instanceof Error ? e.message : String(e) };
        return { fetchedAt: new Date().toISOString(), instagram: null, facebook: null, recent: [], error: e instanceof Error ? e.message : String(e) };
    }
}
