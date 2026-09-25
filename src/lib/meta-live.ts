// Live Instagram + Facebook numbers straight from the Graph API. READ-ONLY: this file only ever
// makes GET requests, even though META_ACCESS_TOKEN also carries posting permission.
const GRAPH = 'https://graph.facebook.com/v21.0';
const PAGE_ID = '959080893962864'; // Kirbai Facebook Page
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

async function get<T>(path: string, token: string): Promise<T> {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${GRAPH}/${path}${sep}access_token=${token}`, { cache: 'no-store' });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json as T;
}

export async function getMetaLive(force = false): Promise<MetaLive | null> {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) return null;
    if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;

    try {
        const page = await get<{ followers_count: number; instagram_business_account?: { id: string; followers_count: number; media_count: number } }>(
            `${PAGE_ID}?fields=followers_count,instagram_business_account{id,followers_count,media_count}`, token);
        const ig = page.instagram_business_account;

        let recent: LivePost[] = [];
        if (ig) {
            const media = await get<{ data: { id: string; caption?: string; permalink: string; timestamp: string; media_product_type: string; like_count?: number; comments_count?: number }[] }>(
                `${ig.id}/media?fields=id,caption,permalink,timestamp,media_product_type,like_count,comments_count&limit=12`, token);
            recent = await Promise.all(media.data.map(async m => {
                let reach: number | null = null, interactions: number | null = null;
                try {
                    const ins = await get<{ data: { name: string; values: { value: number }[] }[] }>(`${m.id}/insights?metric=reach,total_interactions`, token);
                    reach = ins.data.find(d => d.name === 'reach')?.values[0]?.value ?? null;
                    interactions = ins.data.find(d => d.name === 'total_interactions')?.values[0]?.value ?? null;
                } catch { /* some media types have no insights */ }
                return {
                    id: m.id, caption: m.caption ?? '', permalink: m.permalink, timestamp: m.timestamp,
                    type: m.media_product_type === 'REELS' ? 'Reel' : m.media_product_type === 'FEED' ? 'Post' : m.media_product_type,
                    likes: m.like_count ?? 0, comments: m.comments_count ?? 0, reach, interactions,
                };
            }));
        }

        const data: MetaLive = {
            fetchedAt: new Date().toISOString(),
            instagram: ig ? { followers: ig.followers_count, mediaCount: ig.media_count } : null,
            facebook: { followers: page.followers_count },
            recent,
        };
        cache = { at: Date.now(), data };
        return data;
    } catch (e) {
        // Serve the last good numbers if Meta hiccups; otherwise report the error.
        if (cache) return { ...cache.data, error: e instanceof Error ? e.message : String(e) };
        return { fetchedAt: new Date().toISOString(), instagram: null, facebook: null, recent: [], error: e instanceof Error ? e.message : String(e) };
    }
}
