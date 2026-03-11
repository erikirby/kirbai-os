"use client"

import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, Sparkles, Filter } from 'lucide-react';

type ConceptType = 'reel' | 'post' | 'music' | 'general';
type ConceptStatus = 'concept' | 'in-dev' | 'executed' | 'archived';

interface Concept {
    id: string;
    title: string;
    type: ConceptType;
    status: ConceptStatus;
    body: string;
    character?: string;
    created_at: string;
    updated_at: string;
}

const TYPE_STYLES: Record<ConceptType, string> = {
    reel: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
    post: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    music: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    general: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

const STATUS_STYLES: Record<ConceptStatus, string> = {
    concept: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20',
    'in-dev': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    executed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    archived: 'text-neutral-600 bg-neutral-600/10 border-neutral-600/20',
};

const TYPE_LABELS: Record<ConceptType, string> = {
    reel: 'Reel',
    post: 'Post',
    music: 'Music',
    general: 'Brainstorm',
};

const STATUS_LABELS: Record<ConceptStatus, string> = {
    concept: 'Concept',
    'in-dev': 'In Dev',
    executed: 'Executed',
    archived: 'Archived',
};

const PHEROMOSA_SEED: Omit<Concept, 'created_at' | 'updated_at'> = {
    id: 'concept_pheromosa_001',
    title: 'Pheromosa: Compulsive Purification',
    type: 'reel',
    status: 'concept',
    character: 'Pheromosa',
    body: `Yes. Lock that in. This isn't just a good idea; it's the core psychological hook for the entire video.

This angle elevates Pheromosa from a simple escapee into a character with a compelling, problematic flaw. Her obsession with sterility and order is her coping mechanism. She's not just running from trauma; she's trying to erase it by literally wiping it clean.

This is Compulsive Purification.

Scene Flow: Pheromosa's Cleanup

1. The Intrusion: Pheromosa breaks into the lab. The initial shots show her disgust—not at the horror of the experiments, but at the mess. A knocked-over beaker, scattered data pads, a smear of pink nutrient gel on the floor. It's untidy. Unacceptable.

2. The Dance of Disinfection: The music kicks in. Her "dancing" is the act of cleaning.
• She uses a swift, elegant kick to shatter a cracked incubation tube (a failed prototype), sweeping the glass into a neat pile with her foot.
• She finds the discarded blueprint mentioning the "Pink Bois" and the "Matriarch." She doesn't read it; she sees it as clutter. She folds it with sharp, precise movements and incinerates it with a focused energy blast.
• She wipes a smudged console with her hand, leaving it gleaming. The screen reflects her impassive face for a moment before she moves on.

3. The Tragic Irony: The climax isn't her escape. It's a wide shot of the now-immaculate lab. Everything is sterile, orderly, and shining. She strikes a final, triumphant pose, satisfied with her work. The audience knows she hasn't just cleaned a room; she's destroyed all evidence of Gholdengo's crimes, effectively sanitizing his operation and paving the way for the "Pink Hierarchy" to proceed without a trace.

Dark, psychological, dripping with diva energy. She's not just an escapee; she's the cleanup crew, and her fatal flaw is that she's unwittingly the best employee Gholdengo ever had.`,
};

const BLANK_FORM = { title: '', type: 'general' as ConceptType, status: 'concept' as ConceptStatus, body: '', character: '' };

export default function CreativeHub({ theme }: { theme?: string }) {
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showNew, setShowNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState(BLANK_FORM);
    const [editForm, setEditForm] = useState(BLANK_FORM);
    const [filterType, setFilterType] = useState<ConceptType | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<ConceptStatus | 'all'>('all');

    const load = async () => {
        try {
            const res = await fetch('/api/concepts');
            const data = await res.json();
            let loaded: Concept[] = data.concepts || [];

            // Seed Pheromosa concept if empty
            if (loaded.length === 0) {
                const now = new Date().toISOString();
                const seeded: Concept = { ...PHEROMOSA_SEED, created_at: now, updated_at: now };
                await fetch('/api/concepts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(seeded),
                });
                loaded = [seeded];
            }
            setConcepts(loaded);
        } catch (e) {
            console.error('Failed to load concepts', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const saveConcept = async (concept: Partial<Concept> & { id?: string }) => {
        setIsSaving(true);
        try {
            await fetch('/api/concepts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(concept),
            });
            await load();
        } finally {
            setIsSaving(false);
        }
    };

    const deleteConcept = async (id: string) => {
        await fetch(`/api/concepts?id=${id}`, { method: 'DELETE' });
        setConcepts(prev => prev.filter(c => c.id !== id));
    };

    const handleNew = async () => {
        if (!form.title.trim() || !form.body.trim()) return;
        await saveConcept({ ...form, id: `concept_${Date.now()}` });
        setForm(BLANK_FORM);
        setShowNew(false);
    };

    const handleEdit = async (id: string) => {
        await saveConcept({ id, ...editForm });
        setEditingId(null);
    };

    const startEdit = (c: Concept) => {
        setEditForm({ title: c.title, type: c.type, status: c.status, body: c.body, character: c.character || '' });
        setEditingId(c.id);
        setExpandedId(c.id);
    };

    const filtered = concepts.filter(c => {
        if (filterType !== 'all' && c.type !== filterType) return false;
        if (filterStatus !== 'all' && c.status !== filterStatus) return false;
        return true;
    });

    return (
        <div className="w-full flex flex-col gap-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter">Creative</h1>
                    <p className="text-foreground/50 text-sm mt-2">
                        Concepts in development. Shower thoughts to Roadmap tasks.
                    </p>
                </div>
                <button
                    onClick={() => { setShowNew(v => !v); setForm(BLANK_FORM); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-accent/80 transition-all shadow-lg shadow-accent/20"
                >
                    {showNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showNew ? 'Cancel' : 'New Concept'}
                </button>
            </div>

            {/* New Concept Form */}
            {showNew && (
                <div className="bg-surface border border-border/20 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-accent mb-2">New Concept</h2>
                    <input
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Title"
                        className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-bold text-lg focus:outline-none focus:border-accent/40 placeholder:text-white/20"
                    />
                    <div className="flex gap-3 flex-wrap">
                        <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Type</label>
                            <select
                                value={form.type}
                                onChange={e => setForm(f => ({ ...f, type: e.target.value as ConceptType }))}
                                className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                            >
                                <option value="reel">Reel</option>
                                <option value="post">Post</option>
                                <option value="music">Music</option>
                                <option value="general">Brainstorm</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Status</label>
                            <select
                                value={form.status}
                                onChange={e => setForm(f => ({ ...f, status: e.target.value as ConceptStatus }))}
                                className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                            >
                                <option value="concept">Concept</option>
                                <option value="in-dev">In Dev</option>
                                <option value="executed">Executed</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Character (optional)</label>
                            <input
                                value={form.character}
                                onChange={e => setForm(f => ({ ...f, character: e.target.value }))}
                                placeholder="e.g. Pheromosa"
                                className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none placeholder:text-white/20"
                            />
                        </div>
                    </div>
                    <textarea
                        value={form.body}
                        onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                        placeholder="Paste your concept, script idea, scene breakdown, or half-baked thought..."
                        rows={10}
                        className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white/80 text-sm font-mono leading-relaxed focus:outline-none focus:border-accent/40 resize-none placeholder:text-white/20"
                    />
                    <button
                        onClick={handleNew}
                        disabled={isSaving || !form.title.trim() || !form.body.trim()}
                        className="self-end flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-accent/80 transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save Concept
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-3 items-center flex-wrap">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/30">
                    <Filter className="w-3 h-3" /> Filter
                </div>
                {(['all', 'reel', 'post', 'music', 'general'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border transition-all ${filterType === t
                            ? 'bg-accent text-white border-accent'
                            : 'border-border/20 text-foreground/40 hover:text-foreground/70'
                            }`}
                    >
                        {t === 'all' ? 'All Types' : t === 'general' ? 'Brainstorm' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
                <div className="w-px h-4 bg-border/20 mx-1" />
                {(['all', 'concept', 'in-dev', 'executed', 'archived'] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border transition-all ${filterStatus === s
                            ? 'bg-white/10 text-white border-white/20'
                            : 'border-border/20 text-foreground/40 hover:text-foreground/70'
                            }`}
                    >
                        {s === 'all' ? 'All Statuses' : STATUS_LABELS[s as ConceptStatus]}
                    </button>
                ))}
            </div>

            {/* Cards */}
            {isLoading ? (
                <div className="flex items-center justify-center py-24 text-accent">
                    <Loader2 className="w-8 h-8 animate-spin opacity-50" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 opacity-30">
                    <Sparkles className="w-10 h-10 mb-4" />
                    <p className="text-lg font-bold">No concepts yet.</p>
                    <p className="text-sm text-foreground/60 mt-1">Hit "New Concept" and dump your brain.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filtered.map(concept => {
                        const isExpanded = expandedId === concept.id;
                        const isEditing = editingId === concept.id;

                        return (
                            <div
                                key={concept.id}
                                className="bg-surface border border-border/10 rounded-2xl overflow-hidden shadow-xl hover:border-border/30 transition-colors group"
                            >
                                {/* Card Header */}
                                <div
                                    className="flex items-center gap-4 p-5 cursor-pointer"
                                    onClick={() => !isEditing && setExpandedId(isExpanded ? null : concept.id)}
                                >
                                    <div className="flex-1 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${TYPE_STYLES[concept.type]}`}>
                                                {TYPE_LABELS[concept.type]}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${STATUS_STYLES[concept.status]}`}>
                                                {STATUS_LABELS[concept.status]}
                                            </span>
                                            {concept.character && (
                                                <span className="text-[9px] font-mono text-foreground/30 tracking-wider">
                                                    {concept.character}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-white leading-tight">{concept.title}</h3>
                                        {!isExpanded && (
                                            <p className="text-sm text-foreground/40 line-clamp-2 font-mono leading-relaxed">
                                                {concept.body}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={e => { e.stopPropagation(); startEdit(concept); }}
                                                className="p-1.5 text-white/30 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={e => { e.stopPropagation(); deleteConcept(concept.id); }}
                                                className="p-1.5 text-red-500/40 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/5"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {isExpanded
                                            ? <ChevronUp className="w-4 h-4 text-foreground/30" />
                                            : <ChevronDown className="w-4 h-4 text-foreground/30" />
                                        }
                                    </div>
                                </div>

                                {/* Expanded Body */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 px-5 pb-5 pt-4 flex flex-col gap-4">
                                        {isEditing ? (
                                            <>
                                                <input
                                                    value={editForm.title}
                                                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                                    className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-bold text-lg focus:outline-none focus:border-accent/40"
                                                />
                                                <div className="flex gap-3 flex-wrap">
                                                    <select
                                                        value={editForm.type}
                                                        onChange={e => setEditForm(f => ({ ...f, type: e.target.value as ConceptType }))}
                                                        className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                                                    >
                                                        <option value="reel">Reel</option>
                                                        <option value="post">Post</option>
                                                        <option value="music">Music</option>
                                                        <option value="general">Brainstorm</option>
                                                    </select>
                                                    <select
                                                        value={editForm.status}
                                                        onChange={e => setEditForm(f => ({ ...f, status: e.target.value as ConceptStatus }))}
                                                        className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                                                    >
                                                        <option value="concept">Concept</option>
                                                        <option value="in-dev">In Dev</option>
                                                        <option value="executed">Executed</option>
                                                        <option value="archived">Archived</option>
                                                    </select>
                                                    <input
                                                        value={editForm.character}
                                                        onChange={e => setEditForm(f => ({ ...f, character: e.target.value }))}
                                                        placeholder="Character"
                                                        className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none placeholder:text-white/20"
                                                    />
                                                </div>
                                                <textarea
                                                    value={editForm.body}
                                                    onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))}
                                                    rows={14}
                                                    className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white/80 text-sm font-mono leading-relaxed focus:outline-none focus:border-accent/40 resize-none"
                                                />
                                                <div className="flex gap-2 self-end">
                                                    <button
                                                        onClick={() => handleEdit(concept.id)}
                                                        disabled={isSaving}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-accent/20 border border-accent/30 rounded-xl text-accent text-xs font-black hover:bg-accent/40 transition-colors"
                                                    >
                                                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="flex items-center gap-1.5 px-4 py-2 text-white/30 text-xs font-black hover:text-white transition-colors"
                                                    >
                                                        <X className="w-3 h-3" /> Cancel
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm text-foreground/70 font-mono leading-relaxed whitespace-pre-wrap">
                                                {concept.body}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
