"use client";

import React, { useState } from 'react';
import { Award, ExternalLink, Play, Eye, Share2, Heart, Users, DollarSign, Search, Filter, LayoutList, LayoutGrid } from 'lucide-react';

interface PostItem {
    postId: string;
    publishDate: string;
    type: string;
    caption: string;
    permalink: string;
    durationSeconds: number;
    views: number;
    reach: number;
    reactions: number;
    comments: number;
    shares: number;
    saves: number;
    follows: number;
    earningsUsd: number;
    platform: 'Instagram' | 'Facebook' | 'TikTok';
}

interface LeaderboardProps {
    posts: PostItem[];
}

export default function TopReelsLeaderboard({ posts }: LeaderboardProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [platformFilter, setPlatformFilter] = useState<'All' | 'Instagram' | 'Facebook' | 'TikTok'>('All');
    const [sortBy, setSortBy] = useState<'views' | 'reach' | 'reactions' | 'shares' | 'follows' | 'earningsUsd'>('views');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    if (!posts || posts.length === 0) return null;

    // Filter and sort posts
    const filteredPosts = posts
        .filter((post) => {
            if (platformFilter !== 'All' && post.platform !== platformFilter) return false;
            if (searchQuery.trim() !== '') {
                return post.caption.toLowerCase().includes(searchQuery.toLowerCase());
            }
            return true;
        })
        .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));

    const formatNumber = (num: number) => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) return <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-extrabold flex items-center justify-center border border-amber-400/40 text-xs shadow-md">1</span>;
        if (rank === 2) return <span className="w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-extrabold flex items-center justify-center border border-slate-300/40 text-xs shadow-md">2</span>;
        if (rank === 3) return <span className="w-6 h-6 rounded-full bg-amber-700/30 text-amber-500 font-extrabold flex items-center justify-center border border-amber-600/40 text-xs shadow-md">3</span>;
        return <span className="w-6 h-6 rounded-full bg-surface text-foreground/40 font-mono text-xs flex items-center justify-center border border-border/50">{rank}</span>;
    };

    return (
        <div className="card p-6 flex flex-col gap-6 border border-border/80 relative overflow-hidden">
            {/* Header Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                        <Award className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-foreground tracking-tight">Top Content & Video Leaderboard</h3>
                        <p className="text-[11px] text-foreground/50">Performance rankings across Instagram Reels, Facebook Videos, and TikTok</p>
                    </div>
                </div>

                {/* Filter & View Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* View Switcher (Table vs Grid) */}
                    <div className="flex p-0.5 bg-surface/80 rounded-xl border border-border/60">
                        <button
                            onClick={() => setViewMode('table')}
                            title="Table List View"
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-accent text-white' : 'text-foreground/40 hover:text-foreground'}`}
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            title="Grid Card View"
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-foreground/40 hover:text-foreground'}`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search caption/song..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-surface/80 border border-border/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent w-44 font-medium"
                        />
                    </div>

                    {/* Platform Selector */}
                    <div className="flex items-center bg-surface/80 p-1 rounded-xl border border-border/60 text-xs">
                        {(['All', 'Instagram', 'Facebook', 'TikTok'] as const).map((platform) => (
                            <button
                                key={platform}
                                onClick={() => setPlatformFilter(platform)}
                                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                                    platformFilter === platform ? 'bg-accent text-white shadow-md' : 'text-foreground/50 hover:text-foreground'
                                }`}
                            >
                                {platform}
                            </button>
                        ))}
                    </div>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-1.5 bg-surface/80 px-2.5 py-1.5 rounded-xl border border-border/60 text-xs">
                        <Filter className="w-3 h-3 text-foreground/40" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-foreground focus:outline-none cursor-pointer"
                        >
                            <option value="views">Sort: Views</option>
                            <option value="reach">Sort: Reach</option>
                            <option value="reactions">Sort: Likes/Reactions</option>
                            <option value="shares">Sort: Shares</option>
                            <option value="follows">Sort: Follows Gained</option>
                            <option value="earningsUsd">Sort: Earnings ($)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* High-Density Ranked Table List View (Primary View) */}
            {viewMode === 'table' ? (
                <div className="overflow-x-auto custom-scrollbar border border-border/40 rounded-xl bg-surface/30">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border/60 bg-surface/80 text-[10px] font-mono font-bold uppercase text-foreground/50 tracking-wider">
                                <th className="py-3 px-4 w-12 text-center">Rank</th>
                                <th className="py-3 px-4 w-28">Platform</th>
                                <th className="py-3 px-4">Caption / Track Info</th>
                                <th className="py-3 px-3 text-center">Duration</th>
                                <th className="py-3 px-4 text-right">Views</th>
                                <th className="py-3 px-4 text-right">Likes</th>
                                <th className="py-3 px-4 text-right">Shares</th>
                                <th className="py-3 px-4 text-right">Impact</th>
                                <th className="py-3 px-3 text-center w-12">Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30 text-xs">
                            {filteredPosts.slice(0, 20).map((post, idx) => {
                                const rank = idx + 1;
                                const isIG = post.platform === 'Instagram';
                                const isFB = post.platform === 'Facebook';
                                const platformBadge = isIG 
                                    ? 'border-pink-500/30 text-pink-400 bg-pink-500/10' 
                                    : isFB 
                                    ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' 
                                    : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10';

                                return (
                                    <tr key={idx} className="hover:bg-surface/70 transition-colors group">
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex justify-center">{getRankBadge(rank)}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${platformBadge}`}>
                                                {post.platform}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="max-w-md">
                                                <p className="font-medium text-foreground/90 line-clamp-1 group-hover:text-white transition-colors">
                                                    {post.caption || 'No caption available'}
                                                </p>
                                                <span className="text-[10px] font-mono text-foreground/40 block mt-0.5">
                                                    Published {post.publishDate}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center font-mono text-foreground/50">
                                            {post.durationSeconds ? `${post.durationSeconds}s` : '—'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                                            <div className="flex items-center justify-end gap-1">
                                                <Eye className="w-3 h-3 text-pink-400" />
                                                <span>{formatNumber(post.views)}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-foreground/80">
                                            <div className="flex items-center justify-end gap-1">
                                                <Heart className="w-3 h-3 text-rose-400/80" />
                                                <span>{formatNumber(post.reactions)}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-foreground/80">
                                            <div className="flex items-center justify-end gap-1">
                                                <Share2 className="w-3 h-3 text-emerald-400/80" />
                                                <span>{formatNumber(post.shares)}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold">
                                            {post.earningsUsd > 0 ? (
                                                <span className="text-emerald-400 flex items-center justify-end gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    {post.earningsUsd.toFixed(2)}
                                                </span>
                                            ) : post.follows > 0 ? (
                                                <span className="text-pink-400 flex items-center justify-end gap-1">
                                                    <Users className="w-3 h-3" />
                                                    +{formatNumber(post.follows)}
                                                </span>
                                            ) : (
                                                <span className="text-foreground/30">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {post.permalink ? (
                                                <a
                                                    href={post.permalink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-surface border border-border/50 text-foreground/40 hover:text-white hover:border-accent hover:bg-accent/20 transition-all"
                                                    title="Open video link"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            ) : (
                                                <span className="text-foreground/20">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Optional Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPosts.slice(0, 12).map((post, idx) => {
                        const isIG = post.platform === 'Instagram';
                        const platformBadge = isIG 
                            ? 'border-pink-500/30 text-pink-400 bg-pink-500/10' 
                            : post.platform === 'Facebook' 
                            ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' 
                            : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10';

                        return (
                            <div key={idx} className="card p-4 flex flex-col justify-between gap-3 border border-border/50 hover:border-border transition-all bg-surface/40 hover:bg-surface/70 group">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {getRankBadge(idx + 1)}
                                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${platformBadge}`}>
                                            {post.platform}
                                        </span>
                                    </div>
                                    {post.permalink && (
                                        <a
                                            href={post.permalink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-foreground/40 hover:text-accent transition-colors p-1"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </div>

                                <p className="text-xs text-foreground/80 line-clamp-2 italic font-serif">
                                    "{post.caption}"
                                </p>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center font-mono">
                                    <div>
                                        <span className="text-[9px] text-foreground/40 uppercase block">Views</span>
                                        <span className="text-xs font-bold text-pink-400">{formatNumber(post.views)}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-foreground/40 uppercase block">Likes</span>
                                        <span className="text-xs font-bold text-rose-400">{formatNumber(post.reactions)}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-foreground/40 uppercase block">Impact</span>
                                        <span className="text-xs font-bold text-emerald-400">
                                            {post.earningsUsd > 0 ? `$${post.earningsUsd.toFixed(2)}` : `+${formatNumber(post.follows)}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
