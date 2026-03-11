"use client";

import { useState, useEffect, useRef } from "react";
import {
    Loader2, Plus, Save, Trash2, Mic2, Link as LinkIcon,
    Image as ImageIcon, Sparkles, ChevronDown, ChevronRight,
    ExternalLink, Music, BookOpen, Cpu, ArrowRight, ClipboardList,
    AlertCircle, X, CheckCircle2, FileText, Wand2, ChevronUp
} from "lucide-react";

interface ExternalLink {
    name: string;
    url: string;
}

interface Project {
    id: string;
    title: string;
    alias: "Kirbai" | "AELOW" | "KURAO";
    status?: "Draft" | "WIP" | "Released";
    targetTrackCount?: number;
    lore: string;
    visualVibe: string;
    coverArt: string;
    tracklist: string[];
    externalLinks: ExternalLink[];
    createdAt: number;
}

interface Lyric {
    id: string;
    projectId: string;
    trackName: string;
    content: string;
    updatedAt: number;
}

interface VaultManagerProps {
    theme?: string;
}

// --- Sub-component: Collapsible Section ---
function Section({ title, icon, defaultOpen = false, children }: {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-white/5 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
            >
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/70">
                    {icon}
                    {title}
                </span>
                {open
                    ? <ChevronDown className="w-3 h-3 text-foreground/40" />
                    : <ChevronRight className="w-3 h-3 text-foreground/40" />
                }
            </button>
            {open && (
                <div className="px-5 pb-5 pt-1 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}

export default function VaultManager({ theme = "dark" }: VaultManagerProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [lyrics, setLyrics] = useState<Lyric[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Which track's lyrics are expanded inline
    const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

    // Inline delete confirmation (replaces window.confirm which React 18 breaks)
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

    // Inline Track Formatting State
    const [isFormattingTrack, setIsFormattingTrack] = useState<string | null>(null);

    // Master sheet sync
    const [sheetUrl, setSheetUrl] = useState("");
    const [isSyncingSheet, setIsSyncingSheet] = useState(false);

    // DistroKid tracklist import
    const [distrokidText, setDistrokidText] = useState("");

    // Notice System (Replaces flickering native alerts)
    const [notice, setNotice] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Notice Formatting ---
    const formatErrorMessage = (err: string) => {
        if (!err) return "Inscrutable Neural Error";
        const cleanErr = err.toUpperCase();

        // Check for specific Quota labels to avoid "arbitrary" wait messages
        if (cleanErr.includes("429") || cleanErr.includes("QUOTA")) {
            if (cleanErr.includes("DAY") || cleanErr.includes("DAILY")) {
                return "AI Neural Daily Allowance Exhausted. Access restores at Midnight PST (or switch API Key).";
            }
            if (cleanErr.includes("MINUTE") || cleanErr.includes("REQUESTS PER MINUTE")) {
                return "AI Neural Minute Limit Reached. Please wait 60s for the next burst window.";
            }
            // Generic quota error
            return "AI Neural Quota Restricted. Try again in 60s; if failure persists, Daily limit may be reached.";
        }

        if (cleanErr.includes("503") || cleanErr.includes("UNAVAILABLE")) {
            return "AI Neural Core Overloaded. Attempting reconnection in 5s...";
        }

        // If it looks like a JSON dump from Google AI SDK, try to extract the actual message
        try {
            if (err.includes("{\"error\"")) {
                const jsonStart = err.indexOf("{");
                const jsonStr = err.substring(jsonStart);
                const parsed = JSON.parse(jsonStr);
                if (parsed.error?.message) return parsed.error.message;
            }
        } catch (e) { /* ignore and fallback */ }

        return err.length > 120 ? err.substring(0, 120) + "..." : err;
    };

    // --- Data Loading ---
    useEffect(() => {
        const fetchVault = async () => {
            try {
                const [projRes, lyrRes] = await Promise.all([
                    fetch('/api/vault?type=projects'),
                    fetch('/api/vault?type=lyrics')
                ]);
                const projData = await projRes.json();
                const lyrData = await lyrRes.json();
                if (projData.data) setProjects(projData.data);
                if (lyrData.data) setLyrics(lyrData.data);
            } catch (e) {
                console.error("Failed to load vault");
            } finally {
                setIsLoading(false);
            }
        };
        fetchVault();
    }, []);

    // --- Persistence ---
    const saveProjects = async (newProjects: Project[]) => {
        setIsSaving(true);
        try {
            await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'projects', payload: newProjects })
            });
            setProjects(newProjects);
        } finally {
            setIsSaving(false);
        }
    };

    const saveLyrics = async (newLyrics: Lyric[]) => {
        setIsSaving(true);
        try {
            await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'lyrics', payload: newLyrics })
            });
            setLyrics(newLyrics);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Project Actions ---
    const createProject = () => {
        const p: Project = {
            id: crypto.randomUUID(),
            title: "New Transmission",
            alias: "Kirbai",
            status: "Draft",
            lore: "",
            visualVibe: "",
            coverArt: "",
            tracklist: ["Track 1"],
            externalLinks: [],
            createdAt: Date.now()
        };
        saveProjects([p, ...projects]);
        setActiveProject(p);
        setExpandedTrack(null);
    };

    const updateActiveProject = (field: keyof Project, value: any) => {
        if (!activeProject) return;
        const updated = { ...activeProject, [field]: value };
        setActiveProject(updated);
        saveProjects(projects.map(p => p.id === updated.id ? updated : p));
    };

    const deleteProject = (id: string) => {
        saveProjects(projects.filter(p => p.id !== id));
        saveLyrics(lyrics.filter(l => l.projectId !== id));
        if (activeProject?.id === id) {
            setActiveProject(null);
            setExpandedTrack(null);
        }
        setConfirmingDeleteId(null);
    };

    const reorderProject = (id: string, direction: 'up' | 'down') => {
        const index = projects.findIndex(p => p.id === id);
        if (index === -1) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= projects.length) return;

        const newProjects = [...projects];
        const [removed] = newProjects.splice(index, 1);
        newProjects.splice(newIndex, 0, removed);
        saveProjects(newProjects);
    };

    // --- Tracklist ---
    const addTrack = () => {
        if (!activeProject) return;
        const currentList = activeProject.tracklist || [];
        updateActiveProject('tracklist', [...currentList, `Track ${currentList.length + 1}`]);
    };

    const updateTrackName = (index: number, newName: string) => {
        if (!activeProject) return;
        const updated = [...(activeProject.tracklist || [])];
        updated[index] = newName;
        updateActiveProject('tracklist', updated);
    };

    const removeTrack = (index: number) => {
        if (!activeProject) return;
        updateActiveProject('tracklist', (activeProject.tracklist || []).filter((_, i) => i !== index));
    };

    // --- DistroKid Tracklist Parser (pure regex, no AI needed) ---
    const parseDistrokid = () => {
        if (!activeProject || !distrokidText.trim()) return;

        const METADATA_LABELS = [
            'Plain lyrics', 'Synced lyrics', 'Credits', 'Vizy',
            'Audio Swap', 'Download', 'ISRC', 'Track list'
        ];

        const lines = distrokidText.split('\n').map(l => l.trim()).filter(Boolean);
        const tracks: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            if (/^\d+$/.test(lines[i])) {
                const nextLine = lines[i + 1];
                if (nextLine && !METADATA_LABELS.some(label => nextLine.startsWith(label)) && !/^\d+$/.test(nextLine)) {
                    tracks.push(nextLine);
                }
            }
        }

        if (tracks.length === 0) {
            setNotice({ message: "No tracks found. Paste the full DistroKid tracklist section.", type: 'error' });
            return;
        }

        updateActiveProject('tracklist', tracks);
        setDistrokidText("");
    };

    // --- Lyrics (inline per-track editor) ---
    const getLyricForTrack = (trackName: string) =>
        lyrics.find(l => l.projectId === activeProject?.id && l.trackName === trackName);

    const updateOrCreateLyric = async (trackName: string, content: string) => {
        if (!activeProject) return;
        const existing = getLyricForTrack(trackName);
        let newLyrics: Lyric[];
        if (existing) {
            newLyrics = lyrics.map(l => l.id === existing.id ? { ...l, content, updatedAt: Date.now() } : l);
        } else {
            const newLyric: Lyric = {
                id: crypto.randomUUID(),
                projectId: activeProject.id,
                trackName,
                content,
                updatedAt: Date.now()
            };
            newLyrics = [...lyrics, newLyric];
        }
        await saveLyrics(newLyrics);
    };

    const clearLyric = async (trackName: string) => {
        if (!activeProject) return;
        const existing = getLyricForTrack(trackName);
        if (existing) {
            await saveLyrics(lyrics.filter(l => l.id !== existing.id));
        }
    };

    // --- External Links ---
    const addLink = () => {
        if (!activeProject) return;
        updateActiveProject('externalLinks', [...(activeProject.externalLinks || []), { name: "Link", url: "" }]);
    };

    const updateLink = (index: number, field: 'name' | 'url', value: string) => {
        if (!activeProject) return;
        const updated = [...(activeProject.externalLinks || [])];
        updated[index][field] = value;
        updateActiveProject('externalLinks', updated);
    };

    const removeLink = (index: number) => {
        if (!activeProject) return;
        updateActiveProject('externalLinks', (activeProject.externalLinks || []).filter((_, i) => i !== index));
    };

    // --- Cover Art ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProject) return;
        const reader = new FileReader();
        reader.onloadend = () => updateActiveProject('coverArt', reader.result as string);
        reader.readAsDataURL(file);
    };

    // --- AI Track-Level Lyric Formatter ---
    const handleFormatLyric = async (trackName: string, currentContent: string) => {
        if (!activeProject || !currentContent.trim()) return;
        setIsFormattingTrack(trackName);
        try {
            const res = await fetch('/api/format-lyric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackName,
                    rawText: currentContent
                })
            });
            const json = await res.json();
            if (json.success && json.data) {
                await updateOrCreateLyric(trackName, json.data);
                setNotice({ message: `Formatted lyrics for "${trackName}" natively.`, type: 'success' });
            } else {
                setNotice({ message: formatErrorMessage(json.error || "Unknown error during formatting."), type: 'error' });
            }
        } catch (e) {
            setNotice({ message: "Neural Uplink Interrupted during formatting.", type: 'error' });
        } finally {
            setIsFormattingTrack(null);
        }
    };

    // --- Inline RTF/TXT File Upload ---
    const handleTrackFileUpload = (e: React.ChangeEvent<HTMLInputElement>, trackName: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.match(/\.(txt|rtf)$/i)) {
            setNotice({ message: "Only .txt or .rtf documents are supported.", type: 'error' });
            return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
            const rawText = event.target?.result as string;
            // Update the text box immediately with raw text
            await updateOrCreateLyric(trackName, rawText);
            // Auto-trigger the AI formatting
            await handleFormatLyric(trackName, rawText);
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    // --- Master Sheet Sync ---
    const handleSheetSync = async () => {
        if (!activeProject || !sheetUrl.trim()) return;
        setIsSyncingSheet(true);
        try {
            const res = await fetch('/api/ingest-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: sheetUrl })
            });
            const json = await res.json();
            if (json.success && json.data) {
                const { title, visualVibe, lore, tracklist } = json.data;
                const updated = {
                    ...activeProject,
                    title: title || activeProject.title,
                    visualVibe: visualVibe || activeProject.visualVibe,
                    lore: lore || activeProject.lore,
                    tracklist: tracklist || activeProject.tracklist,
                    externalLinks: [...(activeProject.externalLinks || []), { name: "Master Sheet", url: sheetUrl }]
                };
                setActiveProject(updated);
                saveProjects(projects.map(p => p.id === updated.id ? updated : p));
                setSheetUrl("");
                setNotice({ message: `Sync complete: "${title}" updated with ${tracklist?.length || 0} tracks.`, type: 'success' });
            } else {
                setNotice({ message: formatErrorMessage(json.error || "Unknown"), type: 'error' });
            }
        } catch (e) {
            setNotice({ message: "Neural Uplink Interrupted.", type: 'error' });
        } finally {
            setIsSyncingSheet(false);
        }
    };

    const snes = theme === 'snes';
    const inputBase = 'bg-black/10 border-border/10 text-foreground placeholder:text-foreground/40';

    // Analytics & Readiness for Active Project
    const activeTrackCount = activeProject?.tracklist?.length || 0;
    const targetCount = activeProject?.targetTrackCount || activeTrackCount;
    const formatBadge = targetCount >= 7 ? 'Album' : targetCount >= 4 ? 'EP' : 'Single';
    const missingArt = !activeProject?.coverArt;
    const activeLyricsCount = activeProject ? lyrics.filter(l => l.projectId === activeProject.id && l.content?.trim()).length : 0;
    const expectedLyrics = Math.max(activeTrackCount, activeProject?.targetTrackCount || 0);

    if (isLoading) {
        return (
            <div className="p-10 flex items-center gap-4 text-foreground/50 font-mono text-xs uppercase tracking-widest">
                <Loader2 className="animate-spin w-4 h-4" /> Syncing Neural Net...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 relative">
            {/* Notice Banner */}
            {notice && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 w-full max-w-md p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${notice.type === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : 'bg-green-500/10 border-green-500/20 text-green-500'
                    }`}>
                    {notice.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                    <p className="flex-1 text-[11px] font-black uppercase tracking-widest leading-relaxed">{notice.message}</p>
                    <button onClick={() => setNotice(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">The Vault</h2>
                    <p className="text-[10px] text-foreground/50 uppercase tracking-[0.5em] font-black mt-0.5">Persistent Project Memory</p>
                </div>
                {isSaving && (
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-400 animate-pulse flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Writing to Disk...
                    </span>
                )}
            </div>

            {/* Main Layout: Project List + Detail */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                {/* LEFT: Project Directory */}
                <div className={`xl:col-span-3 p-5 border rounded-2xl flex flex-col gap-4 ${snes ? 'bg-surface/60 border-b-4 border-r-4' : 'bg-surface/30 glass border-border/10'}`}>
                    <button
                        onClick={createProject}
                        className="w-full py-3 border border-dashed border-foreground/20 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50 hover:text-cyan-400 hover:border-cyan-400/40 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-3 h-3" /> Initialize Project
                    </button>

                    <div className="flex flex-col gap-2">
                        {projects.map((p, pIndex) => {
                            const trackCount = (p.tracklist || []).length;
                            const lyricCount = lyrics.filter(l => l.projectId === p.id).length;
                            return (
                                <div key={p.id} className="relative group/card">
                                    <button
                                        onClick={() => { setActiveProject(p); setExpandedTrack(null); }}
                                        className={`w-full text-left p-3 rounded-xl border transition-all ${activeProject?.id === p.id
                                            ? 'border-cyan-400 bg-cyan-400/5 shadow-[0_0_20px_rgba(34,211,238,0.08)]'
                                            : 'border-white/5 bg-black/10 hover:border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-foreground/10 flex items-center justify-center border border-white/10">
                                                {p.coverArt
                                                    ? <img src={p.coverArt} alt="Cover" className="w-full h-full object-cover" />
                                                    : <ImageIcon className="w-3 h-3 text-foreground/30" />
                                                }
                                            </div>
                                            <span className="text-xs font-black tracking-tight text-foreground truncate pr-6">{p.title}</span>
                                        </div>
                                        <div className="flex gap-1.5 flex-wrap">
                                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${p.status === 'Released' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                p.status === 'WIP' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                                    'bg-foreground/10 text-foreground/40 border border-foreground/10'
                                                }`}>
                                                {p.status || 'Draft'}
                                            </span>
                                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${p.alias === 'KURAO' ? 'bg-indigo-500/20 text-indigo-400' : p.alias === 'AELOW' ? 'bg-green-500/20 text-green-400' : 'bg-foreground/10 text-foreground/60'}`}>
                                                {p.alias}
                                            </span>
                                            <span className="text-[8px] px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400/70 font-black uppercase tracking-widest">
                                                {trackCount}T · {lyricCount}L
                                            </span>
                                        </div>
                                    </button>

                                    {/* Reorder Controls */}
                                    <div className="absolute right-2 top-2 flex flex-col gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); reorderProject(p.id, 'up'); }}
                                            disabled={pIndex === 0}
                                            className="p-1 rounded bg-black/40 border border-white/10 hover:bg-cyan-400 hover:text-black disabled:opacity-30 disabled:hover:bg-black/40 disabled:hover:text-white transition-colors"
                                        >
                                            <ChevronUp className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); reorderProject(p.id, 'down'); }}
                                            disabled={pIndex === projects.length - 1}
                                            className="p-1 rounded bg-black/40 border border-white/10 hover:bg-cyan-400 hover:text-black disabled:opacity-30 disabled:hover:bg-black/40 disabled:hover:text-white transition-colors"
                                        >
                                            <ChevronDown className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: Project Detail Panel */}
                <div className={`xl:col-span-9 border rounded-2xl overflow-y-auto ${snes ? 'bg-surface/60 border-b-4 border-r-4' : 'bg-surface/30 glass border-border/10'}`}>
                    {!activeProject ? (
                        <div className="h-64 flex flex-col items-center justify-center text-center gap-4 opacity-30 p-8">
                            <Save className="w-10 h-10 text-cyan-400" />
                            <h3 className="text-sm font-black uppercase tracking-[0.3em]">Access Restricted</h3>
                            <p className="text-xs font-mono max-w-xs">Select or initialize a project from the directory to access its memory block.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col animate-in fade-in duration-300">

                            {/* --- STICKY PROJECT HEADER --- */}
                            <div className="p-6 flex gap-5 items-center border-b border-white/5">
                                {/* Cover Art */}
                                <div
                                    className="w-20 h-20 rounded-xl shrink-0 bg-black/40 border border-white/10 overflow-hidden relative group cursor-pointer flex items-center justify-center"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {activeProject.coverArt
                                        ? <img src={activeProject.coverArt} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" alt="Cover Art" />
                                        : <div className="flex flex-col items-center gap-1 opacity-30 group-hover:opacity-70 transition-opacity">
                                            <Plus className="w-5 h-5" />
                                            <span className="text-[8px] uppercase tracking-widest font-black">Art</span>
                                        </div>
                                    }
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </div>

                                {/* Title + Meta */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={activeProject.title}
                                            onChange={(e) => updateActiveProject('title', e.target.value)}
                                            className="text-2xl font-black tracking-tighter uppercase italic bg-transparent border-none outline-none w-full text-foreground/90 focus:text-foreground"
                                            placeholder="Project Title"
                                        />

                                        {/* Readiness Row */}
                                        <div className="flex gap-2">
                                            <span className="text-[9px] px-2 py-0.5 rounded flex items-center gap-1 font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-400">
                                                [{formatBadge}]
                                            </span>
                                            {activeProject.status !== 'Released' && missingArt && (
                                                <span className="text-[9px] px-2 py-0.5 rounded flex items-center gap-1 font-black uppercase tracking-widest bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                                    <AlertCircle className="w-3 h-3" /> Missing Art
                                                </span>
                                            )}
                                            {activeProject.status !== 'Released' && activeLyricsCount < expectedLyrics && (
                                                <span className="text-[9px] px-2 py-0.5 rounded flex items-center gap-1 font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                                                    <AlertCircle className="w-3 h-3" /> Lyrics: {activeLyricsCount}/{expectedLyrics}
                                                </span>
                                            )}
                                            {activeProject.status !== 'Released' && !missingArt && activeLyricsCount >= expectedLyrics && expectedLyrics > 0 && (
                                                <span className="text-[9px] px-2 py-0.5 rounded flex items-center gap-1 font-black uppercase tracking-widest bg-green-500/20 text-green-500">
                                                    <CheckCircle2 className="w-3 h-3" /> Ready
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                                        <select
                                            value={activeProject.status || 'Draft'}
                                            onChange={(e) => updateActiveProject('status', e.target.value)}
                                            className={`p-1.5 px-3 font-black text-[9px] uppercase tracking-widest border rounded-full focus:outline-none appearance-none cursor-pointer ${activeProject.status === 'Released' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                activeProject.status === 'WIP' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                    'bg-black/10 text-foreground border-transparent'
                                                }`}
                                        >
                                            <option value="Draft">Draft</option>
                                            <option value="WIP">WIP</option>
                                            <option value="Released">Released</option>
                                        </select>
                                        <select
                                            value={activeProject.alias}
                                            onChange={(e) => updateActiveProject('alias', e.target.value)}
                                            className="p-1.5 px-3 font-black text-[9px] uppercase tracking-widest border rounded-full focus:outline-none appearance-none cursor-pointer bg-black/10 text-foreground border-transparent"
                                        >
                                            <option value="Kirbai">Kirbai</option>
                                            <option value="AELOW">AELOW</option>
                                            <option value="KURAO">KURAO</option>
                                        </select>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Target Tracks:</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={activeProject.targetTrackCount || ''}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    updateActiveProject('targetTrackCount', isNaN(val) ? undefined : val);
                                                }}
                                                className={`w-12 p-1 px-2 text-center font-mono text-[9px] uppercase tracking-widest border rounded-lg focus:outline-none focus:border-cyan-400 ${inputBase}`}
                                                placeholder={activeTrackCount.toString()}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={activeProject.visualVibe}
                                            onChange={(e) => updateActiveProject('visualVibe', e.target.value)}
                                            placeholder="Visual Vibe..."
                                            className={`p-1.5 px-3 font-mono text-[9px] uppercase tracking-widest border rounded-full focus:outline-none focus:border-cyan-400 w-32 ${inputBase}`}
                                        />
                                        {/* Sync Master Sheet pill */}
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0 border border-foreground/10 rounded-full bg-foreground/5 pl-3 pr-1 focus-within:border-cyan-400 focus-within:bg-cyan-400/5 transition-all">
                                            <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                                            <input
                                                type="url"
                                                value={sheetUrl}
                                                onChange={(e) => setSheetUrl(e.target.value)}
                                                placeholder="Paste Google Sheet URL to auto-fill..."
                                                className="w-full bg-transparent p-1.5 text-[9px] font-mono tracking-widest placeholder:text-foreground/30 focus:outline-none min-w-0"
                                            />
                                            <button
                                                onClick={handleSheetSync}
                                                disabled={isSyncingSheet || !sheetUrl.trim()}
                                                className={`p-1.5 px-3 text-[9px] font-black uppercase tracking-widest rounded-full transition-all shrink-0 ${isSyncingSheet ? 'bg-cyan-400/20 text-cyan-400 animate-pulse' : sheetUrl.trim() ? 'bg-cyan-400 text-black hover:scale-105' : 'bg-foreground/10 text-foreground/30'}`}
                                            >
                                                {isSyncingSheet ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sync'}
                                            </button>
                                        </div>

                                        {/* Delete / Confirm */}
                                        {confirmingDeleteId === activeProject.id ? (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Purge project?</span>
                                                <button
                                                    onClick={() => deleteProject(activeProject.id)}
                                                    className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-red-600 transition-colors"
                                                >
                                                    Yes, Delete
                                                </button>
                                                <button
                                                    onClick={() => setConfirmingDeleteId(null)}
                                                    className="px-3 py-1.5 bg-foreground/10 text-foreground/60 text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-foreground/20 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmingDeleteId(activeProject.id)}
                                                className="p-1.5 px-3 border border-red-500/20 text-red-400/70 hover:bg-red-500 hover:text-white rounded-full transition-colors text-[9px] tracking-widest uppercase font-black shrink-0"
                                            >
                                                Purge
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* --- ACCORDION SECTIONS --- */}
                            <div className="p-4 flex flex-col gap-3">

                                {/* SECTION 1: TRACKLIST + LYRICS */}
                                <Section title={`Tracklist & Lyrics — ${(activeProject.tracklist || []).length} Tracks`} icon={<Mic2 className="w-3 h-3 text-cyan-400" />} defaultOpen={true}>
                                    <div className="flex flex-col gap-1 mt-2">
                                        {(activeProject.tracklist || []).map((track, i) => {
                                            const lyric = getLyricForTrack(track);
                                            const isExpanded = expandedTrack === track;
                                            return (
                                                <div key={i} className="rounded-xl border border-white/5 overflow-hidden">
                                                    {/* Track Row */}
                                                    <div className="flex items-center gap-3 px-4 py-3 group hover:bg-white/5 transition-colors">
                                                        <span className="text-[9px] font-mono text-foreground/30 w-5 text-right shrink-0">{i + 1}.</span>
                                                        <input
                                                            type="text"
                                                            value={track}
                                                            onChange={(e) => updateTrackName(i, e.target.value)}
                                                            className={`flex-1 bg-transparent text-sm font-black tracking-tight focus:outline-none min-w-0 ${theme === 'snes' ? 'text-black' : 'text-foreground'}`}
                                                        />
                                                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {lyric
                                                                ? <span className="text-[8px] px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400/70 font-black uppercase tracking-widest">Lyrics ✓</span>
                                                                : <span className="text-[8px] px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/30 font-black uppercase tracking-widest">No Lyrics</span>
                                                            }
                                                            <button
                                                                onClick={() => setExpandedTrack(isExpanded ? null : track)}
                                                                className="text-[8px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 px-3 py-1 rounded-full border border-cyan-400/20 hover:border-cyan-400/40 transition-all"
                                                            >
                                                                {isExpanded ? 'Collapse' : lyric ? 'View / Edit' : '+ Add Lyrics'}
                                                            </button>
                                                            <button
                                                                onClick={() => removeTrack(i)}
                                                                className="text-foreground/20 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Inline Lyric Editor */}
                                                    {isExpanded && (
                                                        <div className="border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            {/* Lyric Action Bar */}
                                                            <div className="px-4 py-2 border-b flex items-center gap-3 bg-black/10 border-white/5">
                                                                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/50 hover:text-cyan-400 cursor-pointer flex items-center gap-1.5 transition-colors">
                                                                    <FileText className="w-3 h-3" /> Upload .rtf / .txt
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept=".rtf,.txt"
                                                                        onChange={(e) => handleTrackFileUpload(e, track)}
                                                                    />
                                                                </label>
                                                                <div className="w-px h-3 bg-foreground/10"></div>
                                                                <button
                                                                    onClick={() => handleFormatLyric(track, lyric?.content || '')}
                                                                    disabled={!lyric?.content || isFormattingTrack === track}
                                                                    className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all
                                                                        ${isFormattingTrack === track ? 'text-cyan-400 animate-pulse' :
                                                                            !lyric?.content ? 'text-foreground/20 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-300'}`}
                                                                >
                                                                    {isFormattingTrack === track ? (
                                                                        <><Loader2 className="w-3 h-3 animate-spin" /> Formatting...</>
                                                                    ) : (
                                                                        <><Wand2 className="w-3 h-3" /> AI Format & Clean</>
                                                                    )}
                                                                </button>
                                                            </div>

                                                            <textarea
                                                                value={lyric?.content || ''}
                                                                onChange={(e) => updateOrCreateLyric(track, e.target.value)}
                                                                placeholder={`Type or paste lyrics for "${track}" here...`}
                                                                className="w-full p-4 font-mono text-sm min-h-[250px] resize-y focus:outline-none leading-relaxed bg-black/10 text-foreground placeholder:-text-foreground/40"
                                                            />

                                                            <div className="px-4 pb-3 flex justify-between items-center">
                                                                <button
                                                                    onClick={() => clearLyric(track)}
                                                                    className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-white hover:bg-red-500 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                                                                >
                                                                    <Trash2 className="w-3 h-3" /> Clear
                                                                </button>
                                                                <span className="text-[8px] uppercase tracking-widest text-foreground/30 font-mono">Saves automatically</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        <button
                                            onClick={addTrack}
                                            className="mt-2 py-2.5 border border-dashed border-foreground/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-foreground/30 hover:text-cyan-400 hover:border-cyan-400/30 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-3 h-3" /> Add Track
                                        </button>
                                    </div>
                                </Section>

                                {/* SECTION 2: LORE & NARRATIVE */}
                                <Section title="Lore & Narrative" icon={<BookOpen className="w-3 h-3 text-purple-400" />} defaultOpen={!!activeProject.lore}>
                                    <textarea
                                        value={activeProject.lore || ''}
                                        onChange={(e) => updateActiveProject('lore', e.target.value)}
                                        placeholder="Define the overarching narrative. Character motives, hidden truths, thematic arcs — all goes here. AI will reference this when helping you with this project."
                                        className={`w-full mt-2 p-4 font-mono text-sm border rounded-xl focus:outline-none focus:border-cyan-400 resize-y min-h-[140px] leading-relaxed border-white/5 ${inputBase}`}
                                    />
                                </Section>

                                {/* SECTION 3: EXTERNAL RESOURCES */}
                                <Section title="External Resources" icon={<LinkIcon className="w-3 h-3 text-green-400" />} defaultOpen={(activeProject.externalLinks || []).length > 0}>
                                    <div className="flex flex-col gap-2 mt-2">
                                        {(activeProject.externalLinks || []).map((link, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input
                                                    type="text" value={link.name} onChange={(e) => updateLink(i, 'name', e.target.value)}
                                                    className={`w-28 shrink-0 p-2 px-3 font-mono text-xs border rounded-lg focus:outline-none focus:border-cyan-400 ${inputBase}`}
                                                    placeholder="Name"
                                                />
                                                <input
                                                    type="url" value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)}
                                                    className={`flex-1 p-2 px-3 font-mono text-xs border rounded-lg focus:outline-none focus:border-cyan-400 min-w-0 ${inputBase}`}
                                                    placeholder="https://..."
                                                />
                                                {link.url && (
                                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 p-1">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button onClick={() => removeLink(i)} className="text-foreground/20 hover:text-red-400 shrink-0 p-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {(activeProject.externalLinks || []).length === 0 && (
                                            <span className="text-[9px] uppercase tracking-widest font-mono text-foreground/30 italic pb-1">No resources linked yet.</span>
                                        )}
                                        <button
                                            onClick={addLink}
                                            className="mt-1 py-2 border border-dashed border-foreground/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-foreground/30 hover:text-green-400 hover:border-green-400/30 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-3 h-3" /> Add Link
                                        </button>
                                    </div>
                                </Section>

                                {/* SECTION 3.5: DISTROKID IMPORT */}
                                <Section title="DistroKid Tracklist Import" icon={<ClipboardList className="w-3 h-3 text-yellow-400" />} defaultOpen={false}>
                                    <div className="flex flex-col gap-3 mt-2">
                                        <p className="text-[9px] font-mono uppercase tracking-widest text-foreground/40">
                                            Copy the full track list from your DistroKid album page and paste it below. The parser will extract all track titles automatically.
                                        </p>
                                        <textarea
                                            value={distrokidText}
                                            onChange={(e) => setDistrokidText(e.target.value)}
                                            placeholder={`Paste DistroKid tracklist here...\n\n1\nHeart Scales Project (Intro)\n Plain lyrics\n ...`}
                                            className="w-full h-40 p-4 font-mono text-xs border rounded-xl focus:outline-none focus:border-yellow-400/50 resize-y bg-black/10 border-white/5 text-foreground placeholder:text-foreground/40"
                                        />
                                        <button
                                            onClick={parseDistrokid}
                                            disabled={!distrokidText.trim()}
                                            className={`self-end px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${distrokidText.trim()
                                                ? 'bg-yellow-400 text-black hover:scale-105 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                                                : 'bg-foreground/10 text-foreground/30'
                                                }`}
                                        >
                                            <ClipboardList className="w-3 h-3" /> Parse Tracklist
                                        </button>
                                    </div>
                                </Section>

                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
