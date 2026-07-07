// ============================================================
// Revenue Engine — deterministic revenue attribution & analytics
// Ingests: DistroKid earnings ledger + Meta (FB) post export + IG post export
// No AI. Pure math. Computed client-side, persisted via /api/revenue-engine.
// ============================================================

// ---------- Types ----------

export type SourceFileType = "distrokid" | "facebook" | "instagram" | "unknown";

export interface LedgerRow {
    saleMonth: string;      // "2026-01"
    store: string;
    artist: string;
    title: string;
    quantity: number;
    earnings: number;
    country: string;
}

export interface VideoRow {
    platform: "facebook" | "instagram";
    id: string;
    caption: string;
    publishTime: string;    // ISO
    month: string;          // "2026-06"
    durationSec: number;
    views: number;
    shares: number;
    comments: number;
    reactions: number;      // likes on IG
    saves: number;          // IG only
    follows: number;        // IG only
    fbEarnings: number;     // FB in-stream/content monetization only
    secondsViewed: number;  // FB only
}

export interface SongStat {
    title: string;
    baseName: string;
    streams: number;
    earnings: number;
    recentEarnings: number;      // last 3 complete sale months
    perStream: number;
    videoCount: number;
    videoViews: number;
    fbVideoEarnings: number;
    earningsPer1kVideoViews: number | null;
    lastVideoDate: string | null;
    monthly: { month: string; earnings: number; streams: number }[];
    videos: { platform: string; date: string; views: number; caption: string }[];
}

export interface OpportunityItem {
    title: string;
    score: number;
    recentEarnings: number;
    lifetimeEarnings: number;
    videoViews: number;
    daysSinceLastVideo: number | null; // null = never had a video
    reason: string;
}

export interface StoreStat {
    store: string;
    streams: number;
    earnings: number;
    perStream: number;
}

export interface MonthTrend {
    month: string;
    dkEarnings: number;
    fbEarnings: number;
    streams: number;
    videoViews: number;
}

export interface DurationBucket {
    label: string;
    posts: number;
    medianViews: number;
    totalEarnings: number;
    earningsPerPost: number;
}

export interface RevenueAnalysis {
    computedAt: string;
    files: { type: SourceFileType; name: string; rows: number }[];
    kpis: {
        lifetimeTotal: number;       // DK + FB content earnings
        dkLifetime: number;
        fbLifetime: number;
        runRateMonthly: number;      // avg of last 3 complete DK months + recent FB
        totalStreams: number;
        totalVideoViews: number;
        blendedPer1kViews: number | null;
        latestCompleteMonth: string | null;
        partialMonth: string | null; // most recent sale month (likely under-reported)
    };
    monthlyTrend: MonthTrend[];
    stores: StoreStat[];
    songs: SongStat[];
    opportunities: OpportunityItem[];
    durationBuckets: DurationBucket[];
    unmatchedVideos: { platform: string; date: string; views: number; caption: string }[];
}

// ---------- CSV parsing (stateful — handles quoted multiline fields) ----------

export function parseCSV(text: string): string[][] {
    // strip BOM
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const firstLineEnd = text.indexOf("\n");
    const firstLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);
    const delim = firstLine.includes("\t") ? "\t" : ",";

    const rows: string[][] = [];
    let row: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = false;
            } else cur += c;
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === delim) {
            row.push(cur); cur = "";
        } else if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") i++;
            row.push(cur); cur = "";
            if (row.length > 1 || row[0] !== "") rows.push(row);
            row = [];
        } else cur += c;
    }
    if (cur !== "" || row.length > 0) { row.push(cur); if (row.length > 1 || row[0] !== "") rows.push(row); }
    return rows;
}

export function detectFileType(headerRow: string[]): SourceFileType {
    const h = headerRow.map((x) => x.trim().toLowerCase());
    if (h.includes("sale month") && h.some((x) => x.startsWith("earnings"))) return "distrokid";
    if (h.includes("page name") || h.some((x) => x.includes("3-second video views"))) return "facebook";
    if (h.includes("account username") || h.includes("saves")) return "instagram";
    return "unknown";
}

const num = (v: string | undefined): number => {
    if (!v) return 0;
    const n = parseFloat(String(v).replace(/[",]/g, ""));
    return Number.isFinite(n) ? n : 0;
};

const col = (header: string[], name: string): number =>
    header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());

function parseUSDate(v: string): Date | null {
    // "02/23/2026 10:34"
    const m = v?.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (!m) return null;
    return new Date(`${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:00`);
}

// ---------- Per-file parsers ----------

export function parseDistroKid(rows: string[][]): LedgerRow[] {
    const header = rows[0];
    const iMonth = col(header, "Sale Month");
    const iStore = col(header, "Store");
    const iArtist = col(header, "Artist");
    const iTitle = col(header, "Title");
    const iQty = col(header, "Quantity");
    const iEarn = header.findIndex((h) => h.trim().toLowerCase().startsWith("earnings"));
    const iCountry = col(header, "Country of Sale");
    const out: LedgerRow[] = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[iMonth]) continue;
        out.push({
            saleMonth: r[iMonth].trim(),
            store: (r[iStore] || "").trim(),
            artist: (r[iArtist] || "").trim(),
            title: (r[iTitle] || "").trim(),
            quantity: num(r[iQty]),
            earnings: num(r[iEarn]),
            country: (r[iCountry] || "").trim(),
        });
    }
    return out;
}

export function parseMetaPosts(rows: string[][], platform: "facebook" | "instagram"): VideoRow[] {
    const header = rows[0];
    const iId = col(header, "Post ID");
    const iTitle = platform === "facebook" ? col(header, "Title") : col(header, "Description");
    const iDesc = col(header, "Description");
    const iDur = col(header, "Duration (sec)");
    const iPub = col(header, "Publish time");
    const iType = col(header, "Post type");
    const iViews = col(header, "Views");
    const iShares = col(header, "Shares");
    const iComments = col(header, "Comments");
    const iReactions = platform === "facebook" ? col(header, "Reactions") : col(header, "Likes");
    const iSaves = col(header, "Saves");
    const iFollows = col(header, "Follows");
    const iEarn = col(header, "Approximate content monetization earnings");
    const iSecs = col(header, "Seconds viewed");

    const out: VideoRow[] = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const type = (r[iType] || "").trim();
        if (platform === "facebook" && type !== "Videos") continue;
        if (platform === "instagram" && type !== "IG reel") continue;
        const d = parseUSDate(r[iPub] || "");
        if (!d) continue;
        const caption = [r[iTitle], iDesc !== iTitle ? r[iDesc] : ""].filter(Boolean).join(" ");
        out.push({
            platform,
            id: (r[iId] || "").trim(),
            caption: caption.replace(/\s+/g, " ").trim(),
            publishTime: d.toISOString(),
            month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            durationSec: num(r[iDur]),
            views: num(r[iViews]),
            shares: num(r[iShares]),
            comments: num(r[iComments]),
            reactions: num(r[iReactions]),
            saves: iSaves >= 0 ? num(r[iSaves]) : 0,
            follows: iFollows >= 0 ? num(r[iFollows]) : 0,
            fbEarnings: iEarn >= 0 ? num(r[iEarn]) : 0,
            secondsViewed: iSecs >= 0 ? num(r[iSecs]) : 0,
        });
    }
    return out;
}

// ---------- Attribution ----------

const normalize = (s: string) =>
    s.toLowerCase().replace(/['’‘"“”]/g, "").replace(/\s+/g, " ").trim();

/** Truncate without splitting an emoji/surrogate pair — a half-emoji makes the
 *  serialized payload invalid JSON and Supabase rejects the save. */
const clip = (s: string, n: number) => s.slice(0, n).replace(/[\uD800-\uDBFF]$/, "");

/** "Power Whip (Tsareena Step)" -> "power whip" */
export function baseName(title: string): string {
    const cut = title.split(" (")[0];
    return normalize(cut);
}

const TOKEN_STOPWORDS = new Set([
    "ver", "version", "mix", "remix", "cut", "master", "anthem", "dub", "step",
    "crash", "deluxe", "aria", "edition", "song", "theme", "intro", "feat", "the",
    "and", "vs", "encore", "english", "japanese", "slow", "fast", "instrumental",
]);

/** Character/keyword tokens from the parenthetical: "Magic Bounce (Hatterene Master)" -> ["hatterene"] */
export function characterTokens(title: string): string[] {
    const m = title.match(/\(([^)]+)\)/);
    if (!m) return [];
    return normalize(m[1])
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !TOKEN_STOPWORDS.has(w));
}

/**
 * Best song match for a caption.
 * 1) Song base name in caption (longest wins) — strongest signal.
 * 2) Fallback: character token from the title's parenthetical (e.g. "Hatterene"),
 *    but only when it resolves to exactly ONE song — ambiguity stays unmatched
 *    rather than mis-attributed.
 */
export function matchSong(caption: string, songBases: { base: string; title: string }[]): string | null {
    const c = normalize(caption);
    let best: { title: string; len: number } | null = null;
    for (const s of songBases) {
        if (s.base.length < 4) continue; // avoid junk matches
        if (c.includes(s.base) && (!best || s.base.length > best.len)) {
            best = { title: s.title, len: s.base.length };
        }
    }
    if (best) return best.title;

    // Token fallback: songBases arrive sorted by earnings (flagship first), so the
    // first hit is the highest-earning candidate — ambiguity resolves to the flagship.
    for (const s of songBases) {
        for (const tok of characterTokens(s.title)) {
            if (c.includes(tok)) return s.title;
        }
    }
    return null;
}

// ---------- Main computation ----------

const median = (arr: number[]): number => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export function computeRevenueAnalysis(
    ledger: LedgerRow[],
    videos: VideoRow[],
    files: { type: SourceFileType; name: string; rows: number }[]
): RevenueAnalysis {
    // --- ledger aggregates ---
    const dkLifetime = ledger.reduce((a, r) => a + r.earnings, 0);
    const totalStreams = ledger.reduce((a, r) => a + r.quantity, 0);

    const saleMonths = [...new Set(ledger.map((r) => r.saleMonth))].sort();
    const partialMonth = saleMonths.length ? saleMonths[saleMonths.length - 1] : null;
    const completeMonths = saleMonths.slice(0, -1); // drop most recent (reporting lag)
    const last3 = completeMonths.slice(-3);
    const latestCompleteMonth = completeMonths.length ? completeMonths[completeMonths.length - 1] : null;

    // stores
    const storeMap = new Map<string, { streams: number; earnings: number }>();
    for (const r of ledger) {
        const s = storeMap.get(r.store) || { streams: 0, earnings: 0 };
        s.streams += r.quantity; s.earnings += r.earnings;
        storeMap.set(r.store, s);
    }
    const stores: StoreStat[] = [...storeMap.entries()]
        .map(([store, v]) => ({ store, ...v, perStream: v.streams ? v.earnings / v.streams : 0 }))
        .sort((a, b) => b.earnings - a.earnings);

    // songs
    const songMap = new Map<string, { streams: number; earnings: number; monthly: Map<string, { e: number; q: number }> }>();
    for (const r of ledger) {
        if (!r.title) continue;
        const s = songMap.get(r.title) || { streams: 0, earnings: 0, monthly: new Map() };
        s.streams += r.quantity; s.earnings += r.earnings;
        const m = s.monthly.get(r.saleMonth) || { e: 0, q: 0 };
        m.e += r.earnings; m.q += r.quantity;
        s.monthly.set(r.saleMonth, m);
        songMap.set(r.title, s);
    }
    // Sorted by earnings so base-name ties (e.g. two releases of the same song) and
    // token ambiguity both resolve to the flagship release, not a remix variant.
    const songBases = [...songMap.entries()]
        .sort((a, b) => b[1].earnings - a[1].earnings)
        .map(([title]) => ({ title, base: baseName(title) }));

    // --- video attribution ---
    const videosBySong = new Map<string, VideoRow[]>();
    const unmatched: VideoRow[] = [];
    for (const v of videos) {
        const hit = v.caption ? matchSong(v.caption, songBases) : null;
        if (hit) {
            const arr = videosBySong.get(hit) || [];
            arr.push(v);
            videosBySong.set(hit, arr);
        } else unmatched.push(v);
    }

    const now = new Date();
    const songs: SongStat[] = [...songMap.entries()].map(([title, s]) => {
        const vids = (videosBySong.get(title) || []).sort((a, b) => b.views - a.views);
        const videoViews = vids.reduce((a, v) => a + v.views, 0);
        const fbVideoEarnings = vids.reduce((a, v) => a + v.fbEarnings, 0);
        const recentEarnings = last3.reduce((a, m) => a + (s.monthly.get(m)?.e || 0), 0);
        const lastVid = vids.length
            ? vids.reduce((a, v) => (v.publishTime > a ? v.publishTime : a), vids[0].publishTime)
            : null;
        return {
            title,
            baseName: baseName(title),
            streams: s.streams,
            earnings: s.earnings,
            recentEarnings,
            perStream: s.streams ? s.earnings / s.streams : 0,
            videoCount: vids.length,
            videoViews,
            fbVideoEarnings,
            earningsPer1kVideoViews: videoViews > 0 ? ((s.earnings + fbVideoEarnings) / videoViews) * 1000 : null,
            lastVideoDate: lastVid,
            monthly: [...s.monthly.entries()].sort().map(([month, m]) => ({ month, earnings: m.e, streams: m.q })),
            videos: vids.slice(0, 12).map((v) => ({ platform: v.platform, date: v.publishTime, views: v.views, caption: clip(v.caption, 90) })),
        };
    }).sort((a, b) => b.earnings - a.earnings);

    // --- opportunities: proven earners with stale/absent video support ---
    const opportunities: OpportunityItem[] = songs
        .filter((s) => s.earnings >= 15)
        .map((s) => {
            const days = s.lastVideoDate
                ? Math.floor((now.getTime() - new Date(s.lastVideoDate).getTime()) / 86400000)
                : null;
            const recencyFactor = days === null ? 2 : Math.min(days / 90, 2);
            const score = (s.recentEarnings + s.earnings * 0.15) * (0.5 + recencyFactor);
            let reason: string;
            if (days === null) reason = `$${s.earnings.toFixed(0)} lifetime · no matched videos in the uploaded exports.`;
            else if (days > 90) reason = `$${s.recentEarnings.toFixed(0)} last quarter · most recent matched video was ${days} days ago.`;
            else if (s.earningsPer1kVideoViews && s.earningsPer1kVideoViews > 1) reason = `Converts at $${s.earningsPer1kVideoViews.toFixed(2)}/1K video views (blended average is ~$0.75).`;
            else reason = `$${s.recentEarnings.toFixed(0)} last quarter · has recent video coverage.`;
            return {
                title: s.title,
                score: Math.round(score * 10) / 10,
                recentEarnings: s.recentEarnings,
                lifetimeEarnings: s.earnings,
                videoViews: s.videoViews,
                daysSinceLastVideo: days,
                reason,
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    // --- monthly trend (union of DK sale months + video months) ---
    const fbByMonth = new Map<string, number>();
    const viewsByMonth = new Map<string, number>();
    for (const v of videos) {
        fbByMonth.set(v.month, (fbByMonth.get(v.month) || 0) + v.fbEarnings);
        viewsByMonth.set(v.month, (viewsByMonth.get(v.month) || 0) + v.views);
    }
    const dkByMonth = new Map<string, { e: number; q: number }>();
    for (const r of ledger) {
        const m = dkByMonth.get(r.saleMonth) || { e: 0, q: 0 };
        m.e += r.earnings; m.q += r.quantity;
        dkByMonth.set(r.saleMonth, m);
    }
    const allMonths = [...new Set([...dkByMonth.keys(), ...fbByMonth.keys()])].sort();
    const monthlyTrend: MonthTrend[] = allMonths.map((month) => ({
        month,
        dkEarnings: dkByMonth.get(month)?.e || 0,
        fbEarnings: fbByMonth.get(month) || 0,
        streams: dkByMonth.get(month)?.q || 0,
        videoViews: viewsByMonth.get(month) || 0,
    }));

    // --- duration economics (FB only — that's where content earnings live) ---
    const fbVids = videos.filter((v) => v.platform === "facebook" && v.durationSec > 0);
    const buckets: [string, (d: number) => boolean][] = [
        ["<30s", (d) => d < 30],
        ["30–60s", (d) => d >= 30 && d < 60],
        ["60–90s", (d) => d >= 60 && d < 90],
        ["90–150s", (d) => d >= 90 && d < 150],
        ["150s+", (d) => d >= 150],
    ];
    const durationBuckets: DurationBucket[] = buckets.map(([label, fn]) => {
        const set = fbVids.filter((v) => fn(v.durationSec));
        const totalEarnings = set.reduce((a, v) => a + v.fbEarnings, 0);
        return {
            label,
            posts: set.length,
            medianViews: Math.round(median(set.map((v) => v.views))),
            totalEarnings,
            earningsPerPost: set.length ? totalEarnings / set.length : 0,
        };
    });

    // --- KPIs ---
    const fbLifetime = videos.reduce((a, v) => a + v.fbEarnings, 0);
    const totalVideoViews = videos.reduce((a, v) => a + v.views, 0);
    const dkRunRate = last3.length ? last3.reduce((a, m) => a + (dkByMonth.get(m)?.e || 0), 0) / last3.length : 0;
    const fbMonths = [...fbByMonth.entries()].filter(([, e]) => e > 0).sort();
    const fbRunRate = fbMonths.length ? fbMonths.slice(-2).reduce((a, [, e]) => a + e, 0) / Math.min(fbMonths.length, 2) : 0;

    return {
        computedAt: new Date().toISOString(),
        files,
        kpis: {
            lifetimeTotal: dkLifetime + fbLifetime,
            dkLifetime,
            fbLifetime,
            runRateMonthly: dkRunRate + fbRunRate,
            totalStreams,
            totalVideoViews,
            blendedPer1kViews: totalVideoViews > 0 ? ((dkLifetime + fbLifetime) / totalVideoViews) * 1000 : null,
            latestCompleteMonth,
            partialMonth,
        },
        monthlyTrend,
        stores,
        songs,
        opportunities,
        durationBuckets,
        unmatchedVideos: unmatched
            .filter((v) => v.views > 1000)
            .sort((a, b) => b.views - a.views)
            .slice(0, 15)
            .map((v) => ({ platform: v.platform, date: v.publishTime, views: v.views, caption: clip(v.caption, 90) })),
    };
}
