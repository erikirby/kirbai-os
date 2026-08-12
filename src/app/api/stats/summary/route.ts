import { NextResponse } from 'next/server';
import { getKirbaiStatsBaseline, getPulseStateAsync, getRow, getYouTubeStatsAsync } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'kirbai';

        // Fetch master baseline dataset
        const baseline = getKirbaiStatsBaseline();
        
        // Fetch dynamic overlays from Supabase & YouTube API
        const [pulseState, youtubeData, revenueEngine] = await Promise.all([
            getPulseStateAsync(mode),
            getYouTubeStatsAsync(mode),
            getRow(`revenue_engine_${mode === 'factory' ? 'factory' : 'kirbai'}`)
        ]);

        // Platform Freshness Badges
        const freshness = {
            instagram: {
                status: 'RECENT',
                badgeText: 'META EXPORT',
                dateRange: baseline.instagram.coverage
                    ? `${baseline.instagram.coverage.firstPublishDate} to ${baseline.instagram.coverage.lastPublishDate}`
                    : 'Jul 2026',
                lastUpdated: baseline.generatedAt
            },
            facebook: {
                status: 'RECENT',
                badgeText: 'META EXPORT',
                dateRange: baseline.facebook.coverage
                    ? `${baseline.facebook.coverage.firstPublishDate} to ${baseline.facebook.coverage.lastPublishDate}`
                    : 'Aug 2026',
                lastUpdated: baseline.generatedAt
            },
            distroKid: {
                status: 'RECENT',
                badgeText: 'ROYALTY LEDGER',
                dateRange: baseline.distroKid.coverage
                    ? `${baseline.distroKid.coverage.firstSaleMonth} to ${baseline.distroKid.coverage.lastSaleMonth}`
                    : 'Sep 2024 to May 2026',
                caveat: baseline.distroKid.reportingCaveat || 'DistroKid royalties arrive with a 2-3 month lag; latest sale month may be partial.',
                lastUpdated: baseline.generatedAt
            },
            youtube: {
                status: youtubeData?.stats?.length ? 'LIVE' : 'CACHED',
                badgeText: youtubeData?.stats?.length ? 'YOUTUBE API' : 'OFFICIAL API',
                lastUpdated: youtubeData?.persistedAt || new Date().toISOString()
            },
            tiktok: {
                status: pulseState?.tiktok?.reach ? 'PARSED' : 'MANUAL INPUT',
                badgeText: pulseState?.tiktok?.reach ? 'TIKTOK EXPORT' : 'IN-APP INPUT',
                lastUpdated: pulseState?.tiktok?.lastUpdated || null
            }
        };

        // Extract YouTube channel totals
        const ytStats = youtubeData?.stats || [];
        const kirbaiYt = ytStats.find((s: any) => s.id === 'kirbai') || { views: 0, subscribers: 0, videoCount: 0 };

        // Consolidate totals
        const igTotals = baseline.instagram.totals;
        const fbTotals = baseline.facebook.totals;
        const dkTotals = revenueEngine?.kpis ? {
            quantity: revenueEngine.kpis.totalStreams,
            earningsUsd: revenueEngine.kpis.totalRevenue
        } : baseline.distroKid.totals;

        const ttViews = parseInt(pulseState?.tiktok?.reach || '0', 10);
        const ttFollowers = parseInt(pulseState?.tiktok?.followers || '0', 10);

        const grandTotals = {
            crossPlatformViews: igTotals.views + fbTotals.views + kirbaiYt.views + ttViews,
            crossPlatformReach: igTotals.reach + fbTotals.reach + ttViews,
            totalFollowers: igTotals.follows + ttFollowers + kirbaiYt.subscribers,
            totalEarningsUsd: dkTotals.earningsUsd + fbTotals.earningsUsd,
            distroKidRevenue: dkTotals.earningsUsd,
            metaBonusEarnings: fbTotals.earningsUsd,
            totalStreamsOrUnits: dkTotals.quantity
        };

        // Platform Comparisons
        const platformComparison = [
            {
                platform: 'Instagram',
                icon: 'instagram',
                views: igTotals.views,
                reach: igTotals.reach,
                reactions: igTotals.reactions,
                shares: igTotals.shares,
                saves: igTotals.saves,
                followers: igTotals.follows,
                earningsUsd: 0,
                color: '#EC4899', // Pink
            },
            {
                platform: 'Facebook',
                icon: 'facebook',
                views: fbTotals.views,
                reach: fbTotals.reach,
                reactions: fbTotals.reactions,
                shares: fbTotals.shares,
                saves: 0,
                followers: 0,
                earningsUsd: fbTotals.earningsUsd,
                color: '#3B82F6', // Blue
            },
            {
                platform: 'YouTube',
                icon: 'youtube',
                views: kirbaiYt.views,
                reach: kirbaiYt.views,
                reactions: 0,
                shares: 0,
                saves: 0,
                followers: kirbaiYt.subscribers,
                earningsUsd: 0,
                color: '#EF4444', // Red
            },
            {
                platform: 'TikTok',
                icon: 'tiktok',
                views: ttViews,
                reach: ttViews,
                reactions: 0,
                shares: 0,
                saves: 0,
                followers: ttFollowers,
                earningsUsd: 0,
                color: '#00F2FE', // Cyan/Black
            }
        ];

        // Revenue Timeline (Monthly Trend)
        const revenueTimeline = baseline.distroKid.saleMonths || [];

        // Store Revenue Distribution
        const storesDistribution = revenueEngine?.byStore?.length ? revenueEngine.byStore.map((s: any) => ({
            name: s.store,
            earningsUsd: s.earnings,
            quantity: s.streams
        })) : baseline.distroKid.topStores;

        // Track Leaderboard
        const trackLeaderboard = revenueEngine?.bySong?.length ? revenueEngine.bySong.map((s: any) => ({
            name: s.title,
            earningsUsd: s.earnings,
            quantity: s.streams
        })) : baseline.distroKid.topTracks;

        // Top Posts & Reels Leaderboard (IG & FB Combined)
        const combinedPosts = [
            ...baseline.instagram.topPosts.map((p: any) => ({ ...p, platform: 'Instagram' })),
            ...baseline.facebook.topPosts.map((p: any) => ({ ...p, platform: 'Facebook' }))
        ].sort((a, b) => b.views - a.views);

        return NextResponse.json({
            success: true,
            freshness,
            grandTotals,
            platformComparison,
            revenueTimeline,
            storesDistribution,
            trackLeaderboard,
            topPosts: combinedPosts,
            youtubeStats: ytStats,
            tacticalSignals: baseline.baselineSignals || [],
            usageRules: baseline.usageRules || []
        });

    } catch (e: any) {
        console.error('Error fetching unified stats summary:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
