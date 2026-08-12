"use client";

import React, { useState } from 'react';
import { Award, ExternalLink, Play, Eye, Share2, Heart, Users, DollarSign, Search, Filter } from 'lucide-react';

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
    platform: 'Instagram' | 'Facebook';
}

interface LeaderboardProps {
    posts: PostItem[];
}

export default function TopReelsLeaderboard({ posts }: LeaderboardProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [platformFilter, setPlatformFilter] = useState<'All' | 'Instagram' | 'Facebook'>('All');
    const [sortBy, setSortBy] = useState<'views' | 'reach' | 'reactions' | 'shares' | 'follows' | 'earningsUsd'>('views');

    if (!posts || posts.length === 0) return null;

    // Filter posts
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
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    return (
        <div className="card p-6 flex flex-col gap-6 border border-border/80 relative overflow-hidden">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                        <Award className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-foreground tracking-tight">Top Content & Reels Leaderboard</h3>
                        <p className="text-[11px] text-foreground/50">Performance rankings across Instagram Reels and Facebook Video content</p>
                    </div>
                </div>

                {/* Filter & Sort Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Filter by caption/song..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-surface/80 border border-border/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent w-48 font-medium"
                        />
                    </div>

                    {/* Platform Selector */}
                    <div className="flex items-center bg-surface/80 p-1 rounded-xl border border-border/60 text-xs">
                        {(['All', 'Instagram', 'Facebook'] as const).map((platform) => (
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
                    <div className="flex items-center gap-1.5 bg-surface/80 px-2 py-1.5 rounded-xl border border-border/60 text-xs">
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

            {/* Posts Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPosts.slice(0, 12).map((post, idx) => {
                    const isIG = post.platform === 'Instagram';
                    const platformColor = isIG ? 'border-pink-500/30 text-pink-400 bg-pink-500/10' : 'border-blue-500/30 text-blue-400 bg-blue-500/10';

                    return (
                        <div key={idx} className="card p-4 flex flex-col justify-between gap-3 border border-border/50 hover:border-border transition-all bg-surface/40 hover:bg-surface/70 group">
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${platformColor}`}>
                                        {post.platform}
                                    </span>
                                    {post.durationSeconds > 0 && (
                                        <span className="text-[10px] font-mono text-foreground/40 flex items-center gap-1">
                                            <Play className="w-2.5 h-2.5" /> {post.durationSeconds}s
                                        </span>
                                    )}
                                </div>
                                
                                {post.permalink && (
                                    <a
                                        href={post.permalink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-foreground/40 hover:text-accent transition-colors p-1"
                                        title="View Post"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                )}
                            </div>

                            {/* Caption */}
                            <p className="text-xs font-semibold text-foreground/90 leading-snug line-clamp-3 italic">
                                "{post.caption}"
                            </p>

                            {/* Key Stats Bar */}
                            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/40 text-center text-[10px]">
                                <div className="flex flex-col items-center">
                                    <span className="text-foreground/40 uppercase font-mono text-[8px]">Views</span>
                                    <span className="font-extrabold text-foreground">{formatNumber(post.views)}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-foreground/40 uppercase font-mono text-[8px]">Likes</span>
                                    <span className="font-extrabold text-pink-400">{formatNumber(post.reactions)}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-foreground/40 uppercase font-mono text-[8px]">Shares</span>
                                    <span className="font-extrabold text-emerald-400">{formatNumber(post.shares)}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-foreground/40 uppercase font-mono text-[8px]">
                                        {post.earningsUsd > 0 ? 'Earnings' : 'Follows'}
                                    </span>
                                    <span className="font-extrabold text-accent">
                                        {post.earningsUsd > 0 ? `$${post.earningsUsd.toFixed(2)}` : `+${post.follows}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
