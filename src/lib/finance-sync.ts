import type { RevenueAnalysis } from './revenue';

type LegacyRevenue = {
    kpis: { totalRevenue: number; totalStreams: number };
    byStore: { store: string; earnings: number; streams: number; rate?: number; lastReportDate?: string; lastSaleMonth?: string }[];
    bySong: { title: string; earnings: number; streams: number }[];
    savedAt?: string;
};

// One adapter for current Revenue Engine results and previously stored records.
export function revenueToFinance(data: (RevenueAnalysis & { savedAt?: string }) | LegacyRevenue) {
    const current = 'songs' in data;
    const stores = current ? data.stores : data.byStore;
    const songs = current ? data.songs : data.bySong;
    const revenue = current ? data.kpis.dkLifetime : data.kpis.totalRevenue;
    if (!Array.isArray(stores) || !Array.isArray(songs) || !Number.isFinite(revenue)) return null;
    return {
        totals: { revenue, streams: data.kpis.totalStreams },
        platforms: stores.map(s => ({
            store: s.store, revenue: s.earnings, streams: s.streams,
            rate: 'perStream' in s ? s.perStream : s.rate,
            reportingLatency: 'lastReportDate' in s && s.lastReportDate && s.lastSaleMonth
                ? { reportDate: s.lastReportDate, saleMonth: s.lastSaleMonth } : null
        })),
        tracks: songs.map(s => ({ title: s.title, revenue: s.earnings, streams: s.streams })),
        advice: `<p>Synced from Revenue Engine. DistroKid earnings: $${revenue.toFixed(2)} across ${data.kpis.totalStreams.toLocaleString()} reported units.</p>`,
        persistedAt: data.savedAt || (current ? data.computedAt : undefined)
    };
}
