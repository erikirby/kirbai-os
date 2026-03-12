"use client"

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, Undo2, ImagePlus, Link as LinkIcon, Trash2, Edit2, Check, X } from 'lucide-react';

interface LoreNode {
    id: string;
    type: 'character' | 'location' | 'event' | 'artifact' | 'organization';
    position?: { x: number; y: number };
    data: {
        label: string;
        description: string;
        traits?: string;
        imagePath?: string;
    };
}

interface LoreEdge {
    source: string;
    target: string;
    label: string;
}

interface LoreState {
    nodes: LoreNode[];
    edges: LoreEdge[];
    history: { nodes: LoreNode[]; edges: LoreEdge[] }[];
}

export default function LoreMatrix({ theme, mode = 'kirbai' }: { theme?: string; mode?: 'kirbai' | 'factory' }) {
    const [state, setState] = useState<LoreState>({ nodes: [], edges: [], history: [] });
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ label: '', description: '', traits: '' });
    const [aiStatus, setAiStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const fetchLore = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/lore?mode=${mode}`);
            if (res.ok) {
                const data = await res.json();
                setState(prev => ({ ...prev, nodes: data.nodes || [], edges: data.edges || [] }));
            }
        } catch (e) {
            console.error("Failed to load lore", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLore();
    }, [mode]);

    const saveState = async (newState: LoreState) => {
        setState(newState);
        try {
            const res = await fetch(`/api/lore?mode=${mode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodes: newState.nodes, edges: newState.edges })
            });
        } catch (e) {
            console.error("Failed to save lore", e);
        }
    };

    const handlePromptSubmit = async () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);
        setAiStatus(null);
        const currentPrompt = prompt;
        setPrompt("");

        try {
            const res = await fetch('/api/generate-lore-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: currentPrompt,
                    currentState: { nodes: state.nodes, edges: state.edges }
                })
            });
            const actionPlan = await res.json();

            if (actionPlan.error) {
                setAiStatus({ type: 'error', message: `AI error: ${actionPlan.error}` });
                return;
            }

            const actions: any[] = actionPlan.actions || [];
            if (actions.length === 0) {
                setAiStatus({ type: 'error', message: 'AI returned no actions. Try rephrasing.' });
                return;
            }

            // Save history for undo
            const newHistory = [...state.history, { nodes: [...state.nodes], edges: [...state.edges] }];
            
            let newNodes = [...state.nodes];
            let newEdges = [...state.edges];
            let nodeOffset = 0;

            actions.forEach((action: any) => {
                if (action.action === 'ADD_NODE' && action.node) {
                    const n = action.node;
                    if (!newNodes.find(en => en.id === n.id)) {
                        const baseX = n.position?.x ?? (300 + (nodeOffset % 4) * 200);
                        const baseY = n.position?.y ?? (200 + Math.floor(nodeOffset / 4) * 180);
                        nodeOffset++;
                        newNodes.push({
                            id: n.id,
                            type: n.type || 'character',
                            position: { x: baseX, y: baseY },
                            data: { label: n.data?.label || n.id, description: n.data?.description || '', traits: n.data?.traits }
                        });
                    }
                } else if (action.action === 'UPDATE_NODE' && action.nodeId) {
                    newNodes = newNodes.map(n =>
                        n.id === action.nodeId
                            ? { ...n, data: { ...n.data, ...action.updates } }
                            : n
                    );
                } else if (action.action === 'DELETE_NODE' && action.nodeId) {
                    newNodes = newNodes.filter(n => n.id !== action.nodeId);
                    newEdges = newEdges.filter(e => e.source !== action.nodeId && e.target !== action.nodeId);
                } else if (action.action === 'ADD_EDGE' && action.edge) {
                    const e = action.edge;
                    // Avoid duplicate edges
                    const exists = newEdges.find(ex => ex.source === e.source && ex.target === e.target && ex.label === e.label);
                    if (!exists) newEdges.push({ source: e.source, target: e.target, label: e.label || '' });
                }
            });

            saveState({ nodes: newNodes, edges: newEdges, history: newHistory });
            setAiStatus({ type: 'success', message: `✓ ${actions.length} action${actions.length !== 1 ? 's' : ''} applied` });
            setTimeout(() => setAiStatus(null), 3000);

        } catch (e: any) {
            setAiStatus({ type: 'error', message: e.message || 'Request failed' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUndo = () => {
        if (state.history.length === 0) return;
        const previousState = state.history[state.history.length - 1];
        const newHistory = state.history.slice(0, -1);
        saveState({ nodes: previousState.nodes, edges: previousState.edges, history: newHistory });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, nodeId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload-lore-img', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.url) {
                const newHistory = [...state.history, { nodes: [...state.nodes], edges: [...state.edges] }];
                const newNodes = state.nodes.map(n => 
                    n.id === nodeId ? { ...n, data: { ...n.data, imagePath: data.url } } : n
                );
                saveState({ nodes: newNodes, edges: state.edges, history: newHistory });
            }
        } catch (err) {
            console.error("Upload error", err);
        }
    };

    const handleDeleteNode = (nodeId: string) => {
        const newHistory = [...state.history, { nodes: [...state.nodes], edges: [...state.edges] }];
        const newNodes = state.nodes.filter(n => n.id !== nodeId);
        const newEdges = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        saveState({ nodes: newNodes, edges: newEdges, history: newHistory });
    };

    const startEditNode = (node: LoreNode) => {
        setEditingNodeId(node.id);
        setEditForm({ label: node.data.label, description: node.data.description, traits: node.data.traits || '' });
    };

    const saveEditNode = () => {
        if (!editingNodeId) return;
        const newHistory = [...state.history, { nodes: [...state.nodes], edges: [...state.edges] }];
        const newNodes = state.nodes.map(n =>
            n.id === editingNodeId ? { ...n, data: { ...n.data, ...editForm } } : n
        );
        saveState({ nodes: newNodes, edges: state.edges, history: newHistory });
        setEditingNodeId(null);
    };

    // Helper to find connections for a specific node
    const getConnectionsForNode = (nodeId: string) => {
        const connections: { id: string, label: string, direction: 'out' | 'in', linkedNodeLabel: string }[] = [];
        
        state.edges.forEach(edge => {
            if (edge.source === nodeId) {
                const targetNode = state.nodes.find(n => n.id === edge.target);
                if (targetNode) {
                    connections.push({ id: edge.target, label: edge.label, direction: 'out', linkedNodeLabel: targetNode.data.label });
                }
            } else if (edge.target === nodeId) {
                const sourceNode = state.nodes.find(n => n.id === edge.source);
                if (sourceNode) {
                    connections.push({ id: edge.source, label: edge.label, direction: 'in', linkedNodeLabel: sourceNode.data.label });
                }
            }
        });
        return connections;
    };

    const typeColors: Record<string, string> = {
        character: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
        location: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        event: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        artifact: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
        organization: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    };

    return (
        <div className="w-full h-full min-h-[800px] flex flex-col mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-surface border border-border/10 rounded-3xl overflow-hidden shadow-2xl relative">
            
            {/* Top Toolbar */}
            <div className="absolute top-6 right-6 z-50 flex gap-3">
                <button 
                    onClick={handleUndo}
                    disabled={state.history.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 hover:bg-white/10 text-white rounded-xl shadow-lg backdrop-blur-md transition-all disabled:opacity-50"
                >
                    <Undo2 className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-wider">Undo</span>
                    {state.history.length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{state.history.length}</span>}
                </button>
            </div>

            {/* Title Area */}
            <div className="pt-10 px-10 pb-6 border-b border-white/5">
                <h1 className="text-3xl font-black tracking-tighter">Lore Database</h1>
                <p className="text-foreground/50 text-sm mt-2">A conceptual grid matrix tracking characters, artifacts, and their relationships.</p>
            </div>

            {/* Main Grid View */}
            <div className="flex-1 overflow-y-auto p-10 bg-black/20">
                {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center text-accent">
                        <Loader2 className="w-10 h-10 animate-spin opacity-50" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-40">
                        {state.nodes.map(node => {
                            const connections = getConnectionsForNode(node.id);
                            const styleClass = typeColors[node.type] || typeColors.character;

                            return (
                                <div key={node.id} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col group hover:bg-white/10 transition-colors shadow-xl">

                                    {/* Action buttons — absolutely positioned, zero layout impact */}
                                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button
                                            onClick={() => startEditNode(node)}
                                            className="text-white/30 hover:text-white transition-colors p-1"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteNode(node.id)}
                                            className="text-red-500/50 hover:text-red-400 transition-colors p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Header: Avatar top-left, type badge + full name — no truncation */}
                                    <div className="flex gap-4 items-start mb-4 pr-12">
                                        {/* Avatar */}
                                        <div className="relative w-12 h-12 shrink-0 rounded-full border border-white/20 overflow-hidden bg-black/40 flex items-center justify-center group/icon">
                                            {node.data.imagePath ? (
                                                <img src={node.data.imagePath} alt={node.data.label} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white/20 text-xs font-bold font-serif">{node.data.label.charAt(0)}</span>
                                            )}
                                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                                <ImagePlus className="w-4 h-4 text-white" />
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, node.id)} />
                                            </label>
                                        </div>

                                        <div>
                                            <div className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full inline-block border mb-1 ${styleClass}`}>
                                                {node.type}
                                            </div>
                                            <h3 className="text-xl font-bold text-white leading-tight">{node.data.label}</h3>
                                        </div>
                                    </div>


                                    {/* Inline Edit Form */}
                                    {editingNodeId === node.id ? (
                                        <div className="flex flex-col gap-2 mb-4">
                                            <input
                                                value={editForm.label}
                                                onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                                                className="px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-sm font-bold text-white focus:outline-none"
                                                placeholder="Name"
                                            />
                                            <textarea
                                                value={editForm.description}
                                                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                                rows={3}
                                                className="px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-sm text-white/80 focus:outline-none resize-none font-mono"
                                                placeholder="Description..."
                                            />
                                            <textarea
                                                value={editForm.traits}
                                                onChange={e => setEditForm(f => ({ ...f, traits: e.target.value }))}
                                                rows={2}
                                                className="px-3 py-2 bg-purple-400/5 border border-purple-400/20 rounded-lg text-sm text-purple-200/80 focus:outline-none resize-none font-mono"
                                                placeholder="Traits / psychological profile..."
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={saveEditNode} className="flex items-center gap-1 px-3 py-1.5 bg-accent/20 border border-accent/30 rounded-lg text-accent text-xs font-black hover:bg-accent/40 transition-colors">
                                                    <Check className="w-3 h-3" /> Save
                                                </button>
                                                <button onClick={() => setEditingNodeId(null)} className="flex items-center gap-1 px-3 py-1.5 text-white/30 text-xs font-black hover:text-white transition-colors">
                                                    <X className="w-3 h-3" /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Description */}
                                            <p className="text-sm text-foreground/70 leading-relaxed mb-3 flex-1">
                                                {node.data.description}
                                            </p>
                                            {/* Traits */}
                                            {node.data.traits && (
                                                <div className="mb-4 p-3 bg-purple-400/5 border border-purple-400/10 rounded-xl">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-purple-400/60 mb-1">Profile</p>
                                                    <p className="text-xs text-purple-200/70 leading-relaxed font-mono">{node.data.traits}</p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Connection Pills */}
                                    {connections.length > 0 && (
                                        <div className="space-y-2 mt-auto pt-4 border-t border-white/5">
                                            <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                                                <LinkIcon className="w-3 h-3" /> Linked Data
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {connections.map((conn, idx) => (
                                                    <div key={idx} className="bg-black/40 border border-white/5 rounded-full px-3 py-1.5 text-xs flex items-center gap-2">
                                                        <span className="text-foreground/40 italic">{conn.direction === 'out' ? '→' : '←'} {conn.label}</span>
                                                        <span className="font-bold text-white/80">{conn.linkedNodeLabel}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        {state.nodes.length === 0 && (
                            <div className="col-span-full h-[400px] flex flex-col items-center justify-center opacity-30">
                                <Sparkles className="w-12 h-12 mb-4" />
                                <p className="text-xl font-bold text-white">The Database is Empty</p>
                                <p>Use the generative command bar below to seed the universe.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Generative Command Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-50">
                {/* AI Status Feedback */}
                {aiStatus && (
                    <div className={`mb-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-center border ${
                        aiStatus.type === 'success'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                        {aiStatus.message}
                    </div>
                )}
                <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-2 flex gap-2 shadow-2xl items-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>
                    
                    <Sparkles className="w-5 h-5 text-accent ml-3 shrink-0" />
                    
                    <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handlePromptSubmit(); }}
                        placeholder="Add Ditto. Delete Sailor Venus. Update Pheromosa's description to say she is the lead dancer."
                        className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 px-2 placeholder:text-foreground/30 font-sans text-sm"
                        disabled={isGenerating}
                    />

                    <button 
                        onClick={handlePromptSubmit}
                        disabled={isGenerating || !prompt.trim()}
                        className="w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-accent/80 transition-colors disabled:opacity-50 shrink-0 shadow-lg shadow-accent/20 cursor-pointer relative z-10"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

