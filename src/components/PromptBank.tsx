"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Plus, Trash2, ChevronDown, ChevronRight, Edit2, AlertCircle, Sparkles } from "lucide-react";

interface Prompt {
    id: string;
    name: string;
    text: string;
}

interface PromptsData {
    universal: string[];
    categories: Record<string, Prompt[]>;
}

const CATEGORY_ORDER = ["Video — Grok", "Art Style", "Suno"];

export default function PromptBank({ theme }: { theme?: string } = {}) {
    const [data, setData] = useState<PromptsData>({ universal: [], categories: {} });
    const [isLoading, setIsLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
    const [editingUniversal, setEditingUniversal] = useState<number | null>(null);
    const [editingUniversalText, setEditingUniversalText] = useState("");
    const [newUniversalText, setNewUniversalText] = useState("");
    const [addingUniversal, setAddingUniversal] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<{ cat: string; id: string } | null>(null);
    const [editForm, setEditForm] = useState({ name: "", text: "" });
    const [addingPrompt, setAddingPrompt] = useState<string | null>(null);
    const [addForm, setAddForm] = useState({ name: "", text: "" });
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/prompts')
            .then(r => r.json())
            .then(json => {
                if (json.success) setData(json.data);
                // Open all categories by default
                const open: Record<string, boolean> = {};
                CATEGORY_ORDER.forEach(c => open[c] = true);
                setOpenCategories(open);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const save = async (updated: PromptsData) => {
        setData(updated);
        await fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const showNotice = (msg: string) => {
        setNotice(msg);
        setTimeout(() => setNotice(null), 2500);
    };

    // Universal rules handlers
    const saveUniversal = async (idx: number) => {
        const updated = { ...data, universal: data.universal.map((r, i) => i === idx ? editingUniversalText : r) };
        await save(updated);
        setEditingUniversal(null);
    };

    const deleteUniversal = async (idx: number) => {
        const updated = { ...data, universal: data.universal.filter((_, i) => i !== idx) };
        await save(updated);
    };

    const addUniversal = async () => {
        if (!newUniversalText.trim()) return;
        const updated = { ...data, universal: [...data.universal, newUniversalText.trim()] };
        await save(updated);
        setNewUniversalText("");
        setAddingUniversal(false);
    };

    // Category prompt handlers
    const saveEditPrompt = async () => {
        if (!editingPrompt) return;
        const { cat, id } = editingPrompt;
        const updated = {
            ...data,
            categories: {
                ...data.categories,
                [cat]: (data.categories[cat] || []).map(p => p.id === id ? { ...p, ...editForm } : p)
            }
        };
        await save(updated);
        setEditingPrompt(null);
        showNotice("Prompt updated.");
    };

    const deletePrompt = async (cat: string, id: string) => {
        const updated = {
            ...data,
            categories: {
                ...data.categories,
                [cat]: (data.categories[cat] || []).filter(p => p.id !== id)
            }
        };
        await save(updated);
    };

    const addPrompt = async (cat: string) => {
        if (!addForm.name.trim() || !addForm.text.trim()) return;
        const newPrompt: Prompt = { id: `prompt-${Date.now()}`, name: addForm.name.trim(), text: addForm.text.trim() };
        const updated = {
            ...data,
            categories: {
                ...data.categories,
                [cat]: [...(data.categories[cat] || []), newPrompt]
            }
        };
        await save(updated);
        setAddingPrompt(null);
        setAddForm({ name: "", text: "" });
        showNotice("Prompt added.");
    };

    const allCategories = [...new Set([...CATEGORY_ORDER, ...Object.keys(data.categories)])];

    if (isLoading) return (
        <div className="p-10 text-foreground/40 font-mono text-xs uppercase tracking-widest">Loading prompt bank...</div>
    );

    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Notice */}
            {notice && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
                    <Check className="w-4 h-4" /> {notice}
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center ml-1">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">Prompt Bank</h2>
                    <p className="text-[10px] text-foreground/60 uppercase tracking-[0.4em] font-black">Reusable AI Directives</p>
                </div>
            </div>

            {/* Universal Rules */}
            <div className="p-6 bg-accent/5 border border-accent/20 squircle shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-accent" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Universal Rules</h3>
                        <span className="text-[9px] text-foreground/30 uppercase tracking-widest">— apply to every prompt</span>
                    </div>
                    <button
                        onClick={() => { setAddingUniversal(true); setNewUniversalText(""); }}
                        className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-accent/20 text-accent hover:bg-accent/10 transition-colors flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" /> Add Rule
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    {data.universal.map((rule, idx) => (
                        <div key={idx} className="group">
                            {editingUniversal === idx ? (
                                <div className="flex gap-2">
                                    <input
                                        value={editingUniversalText}
                                        onChange={e => setEditingUniversalText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveUniversal(idx); if (e.key === 'Escape') setEditingUniversal(null); }}
                                        className="flex-1 px-3 py-2 bg-black/30 border border-accent/30 rounded-lg text-sm font-mono focus:outline-none"
                                        autoFocus
                                    />
                                    <button onClick={() => saveUniversal(idx)} className="px-3 py-1 bg-accent/20 border border-accent/30 rounded-lg text-accent text-xs font-black hover:bg-accent/40 transition-colors">Save</button>
                                    <button onClick={() => setEditingUniversal(null)} className="px-3 py-1 text-foreground/40 text-xs font-black hover:text-foreground transition-colors">Cancel</button>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between gap-4 p-3 bg-black/20 rounded-xl border border-white/5 group-hover:border-accent/20 transition-all">
                                    <p className="text-sm font-mono text-foreground/80 flex-1 leading-relaxed">{rule}</p>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button onClick={() => copyToClipboard(rule, `u-${idx}`)} className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/40 hover:text-foreground transition-colors">
                                            {copiedId === `u-${idx}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                        <button onClick={() => { setEditingUniversal(idx); setEditingUniversalText(rule); }} className="p-1.5 rounded-lg hover:bg-white/10 text-foreground/40 hover:text-foreground transition-colors">
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => deleteUniversal(idx)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-foreground/40 hover:text-red-400 transition-colors">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {addingUniversal && (
                        <div className="flex gap-2">
                            <input
                                value={newUniversalText}
                                onChange={e => setNewUniversalText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addUniversal(); if (e.key === 'Escape') setAddingUniversal(false); }}
                                placeholder="New universal rule..."
                                className="flex-1 px-3 py-2 bg-black/30 border border-accent/30 rounded-lg text-sm font-mono focus:outline-none placeholder:text-foreground/30"
                                autoFocus
                            />
                            <button onClick={addUniversal} className="px-3 py-1 bg-accent/20 border border-accent/30 rounded-lg text-accent text-xs font-black hover:bg-accent/40 transition-colors">Add</button>
                            <button onClick={() => setAddingUniversal(false)} className="px-3 py-1 text-foreground/40 text-xs font-black hover:text-foreground transition-colors">Cancel</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Prompt Categories */}
            <div className="flex flex-col gap-5">
                {allCategories.map(cat => {
                    const prompts = data.categories[cat] || [];
                    const isOpen = openCategories[cat] !== false;
                    return (
                        <div key={cat} className="bg-surface/20 border border-border/10 squircle shadow-xl overflow-hidden">
                            {/* Category Header */}
                            <button
                                onClick={() => setOpenCategories(prev => ({ ...prev, [cat]: !isOpen }))}
                                className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-4 h-4 text-accent/60" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">{cat}</span>
                                    <span className="text-[9px] text-foreground/30 font-mono">{prompts.length} prompts</span>
                                </div>
                                {isOpen ? <ChevronDown className="w-4 h-4 text-foreground/40" /> : <ChevronRight className="w-4 h-4 text-foreground/40" />}
                            </button>

                            {/* Prompts List */}
                            {isOpen && (
                                <div className="px-6 pb-6 flex flex-col gap-3 border-t border-border/5 pt-4">
                                    {prompts.map(prompt => (
                                        <div key={prompt.id} className="group">
                                            {editingPrompt?.id === prompt.id ? (
                                                <div className="flex flex-col gap-2 p-4 bg-black/20 rounded-xl border border-accent/20">
                                                    <input
                                                        value={editForm.name}
                                                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                        placeholder="Prompt name..."
                                                        className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-xs font-bold focus:outline-none"
                                                    />
                                                    <textarea
                                                        value={editForm.text}
                                                        onChange={e => setEditForm(f => ({ ...f, text: e.target.value }))}
                                                        rows={4}
                                                        className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm font-mono focus:outline-none resize-none"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button onClick={saveEditPrompt} className="px-4 py-1.5 bg-accent/20 border border-accent/30 rounded-lg text-accent text-xs font-black hover:bg-accent/40 transition-colors">Save</button>
                                                        <button onClick={() => setEditingPrompt(null)} className="px-4 py-1.5 text-foreground/40 text-xs font-black hover:text-foreground transition-colors">Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-4 p-4 bg-black/20 rounded-xl border border-white/5 group-hover:border-white/10 transition-all">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-2">{prompt.name}</p>
                                                        <p className="text-sm font-mono text-foreground/70 leading-relaxed">{prompt.text}</p>
                                                    </div>
                                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                        <button
                                                            onClick={() => copyToClipboard(prompt.text, prompt.id)}
                                                            title="Copy prompt"
                                                            className="p-2 rounded-lg hover:bg-accent/10 text-foreground/40 hover:text-accent transition-colors"
                                                        >
                                                            {copiedId === prompt.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingPrompt({ cat, id: prompt.id }); setEditForm({ name: prompt.name, text: prompt.text }); }}
                                                            title="Edit"
                                                            className="p-2 rounded-lg hover:bg-white/5 text-foreground/40 hover:text-foreground transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deletePrompt(cat, prompt.id)}
                                                            title="Delete"
                                                            className="p-2 rounded-lg hover:bg-red-500/10 text-foreground/40 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add Prompt */}
                                    {addingPrompt === cat ? (
                                        <div className="flex flex-col gap-2 p-4 bg-black/20 rounded-xl border border-accent/20">
                                            <input
                                                value={addForm.name}
                                                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="Prompt name..."
                                                className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-xs font-bold focus:outline-none placeholder:text-foreground/30"
                                                autoFocus
                                            />
                                            <textarea
                                                value={addForm.text}
                                                onChange={e => setAddForm(f => ({ ...f, text: e.target.value }))}
                                                placeholder="Paste your prompt here..."
                                                rows={4}
                                                className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm font-mono focus:outline-none resize-none placeholder:text-foreground/30"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => addPrompt(cat)} className="px-4 py-1.5 bg-accent/20 border border-accent/30 rounded-lg text-accent text-xs font-black hover:bg-accent/40 transition-colors">Add Prompt</button>
                                                <button onClick={() => { setAddingPrompt(null); setAddForm({ name: "", text: "" }); }} className="px-4 py-1.5 text-foreground/40 text-xs font-black hover:text-foreground transition-colors">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setAddingPrompt(cat); setAddForm({ name: "", text: "" }); }}
                                            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border/20 text-foreground/30 hover:text-foreground/60 hover:border-border/40 transition-all text-xs font-black uppercase tracking-widest"
                                        >
                                            <Plus className="w-3 h-3" /> Add Prompt
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
