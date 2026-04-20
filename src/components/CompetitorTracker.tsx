"use client"

import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Check, X, ShieldAlert, Link as LinkIcon, Instagram, Youtube, HelpCircle } from 'lucide-react';
import StatusButton from './StatusButton';

export interface CompetitorProfile {
    id: string;
    name: string;
    platform: 'youtube' | 'instagram' | 'tiktok' | 'other';
    handleUrl: string;
    notes: string;
    createdAt: string;
}

const PLATFORM_ICONS: Record<string, any> = {
    youtube: <Youtube className="w-4 h-4 text-red-500" />,
    instagram: <Instagram className="w-4 h-4 text-pink-500" />,
    tiktok: <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center text-[8px] font-black text-white outline outline-cyan-500/50 outline-offset-[1px] shadow-[1px_1px_0_theme(colors.pink.500)]">t</div>,
    other: <HelpCircle className="w-4 h-4 text-foreground/50" />
};

export default function CompetitorTracker({ theme, mode = 'kirbai' }: { theme?: string; mode?: string }) {
    const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [form, setForm] = useState({
        name: '',
        platform: 'youtube' as 'youtube' | 'instagram' | 'tiktok' | 'other',
        handleUrl: '',
        notes: ''
    });

    const load = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/competitors?mode=${mode}`);
            const data = await res.json();
            setCompetitors(data.competitors || []);
        } catch (e) {
            console.error('Failed to load competitors', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, [mode]);

    const handleSave = async () => {
        if (!form.name.trim() || !form.handleUrl.trim()) return;
        setIsSaving(true);
        try {
            await fetch(`/api/competitors?mode=${mode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            await load();
            setForm({ name: '', platform: 'youtube', handleUrl: '', notes: '' });
            setShowNew(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this competitor from tracking?")) return;
        await fetch(`/api/competitors?id=${id}&mode=${mode}`, { method: 'DELETE' });
        setCompetitors(prev => prev.filter(c => c.id !== id));
    };

    return (
        <div className="w-full flex flex-col gap-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-accent" /> Competitor Radar
                    </h1>
                    <p className="text-foreground/50 text-sm mt-2">
                        Tracking known rival channels and profiles to inform the Description Generator intelligence loop.
                    </p>
                </div>
                <button
                    onClick={() => setShowNew(v => !v)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-accent/80 transition-all shadow-lg shadow-accent/20"
                >
                    {showNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showNew ? 'Cancel' : 'Track New'}
                </button>
            </div>

            {/* New Competitor Form */}
            {showNew && (
                <div className="bg-surface border border-border/20 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-4">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-accent mb-2">Identify Target</h2>
                    
                    <div className="flex gap-4">
                        <input
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Competitor Name or Alias"
                            className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-bold focus:outline-none focus:border-accent/40 placeholder:text-white/20"
                        />
                        <select
                            value={form.platform}
                            onChange={e => setForm(f => ({ ...f, platform: e.target.value as any }))}
                            className="w-40 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none font-black uppercase tracking-wider text-xs"
                        >
                            <option value="youtube">YouTube</option>
                            <option value="instagram">Instagram</option>
                            <option value="tiktok">TikTok</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="flex-1 flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-accent/40">
                            <div className="pl-4 pr-2 text-white/20"><LinkIcon className="w-4 h-4" /></div>
                            <input
                                value={form.handleUrl}
                                onChange={e => setForm(f => ({ ...f, handleUrl: e.target.value }))}
                                placeholder="https://youtube.com/@rival... or @rival_handle"
                                className="w-full px-2 py-3 bg-transparent text-white focus:outline-none placeholder:text-white/20 text-sm font-mono"
                            />
                        </div>
                    </div>

                    <textarea
                        value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Why are they a threat? What do they do well? (e.g. 'Hooks are crazy good', 'Dark synthwave aesthetic matches ours')"
                        rows={3}
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white/80 text-sm focus:outline-none focus:border-accent/40 resize-none placeholder:text-white/20"
                    />

                    <StatusButton
                        onClick={handleSave}
                        loading={isSaving}
                        disabled={!form.name.trim() || !form.handleUrl.trim()}
                        className="self-end px-6 py-2.5 bg-accent text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-accent/80 transition-all disabled:opacity-50 shadow-lg"
                        icon={<Check className="w-4 h-4" />}
                    >
                        Lock Target
                    </StatusButton>
                </div>
            )}

            {/* List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-24 text-accent">
                    <Loader2 className="w-8 h-8 animate-spin opacity-50" />
                </div>
            ) : competitors.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-24 opacity-30 mt-8 border border-dashed border-border/20 rounded-3xl">
                    <ShieldAlert className="w-10 h-10 mb-4" />
                    <p className="text-lg font-bold">No competitors tracked.</p>
                    <p className="text-sm text-foreground/60 mt-1">Start tracking rivals to inform the Description Generator.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {competitors.map(comp => (
                        <div key={comp.id} className="bg-surface border border-border/10 rounded-2xl p-5 shadow-xl flex flex-col gap-3 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-bl-full -z-10 group-hover:bg-accent/10 transition-colors" />
                            
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-white/10 shadow-inner">
                                        {PLATFORM_ICONS[comp.platform]}
                                    </div>
                                    <h3 className="font-bold text-white text-lg leading-tight">{comp.name}</h3>
                                </div>
                                <button
                                    onClick={() => handleDelete(comp.id)}
                                    className="p-1.5 rounded-md text-foreground/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <a 
                                href={comp.handleUrl.startsWith('http') ? comp.handleUrl : `https://${comp.platform}.com/${comp.handleUrl.replace('@', '')}`}
                                target="_blank" 
                                rel="noreferrer"
                                className="text-xs font-mono text-accent hover:underline flex items-center gap-1.5 mt-1"
                            >
                                <LinkIcon className="w-3 h-3" /> {comp.handleUrl}
                            </a>

                            {comp.notes && (
                                <p className="text-sm text-foreground/60 mt-2 bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed line-clamp-3">
                                    {comp.notes}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
