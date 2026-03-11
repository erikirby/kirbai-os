"use client"

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, Undo2, ImagePlus, Link as LinkIcon, Trash2 } from 'lucide-react';

interface LoreNode {
    id: string;
    type: 'character' | 'location' | 'event' | 'artifact' | 'organization';
    data: {
        label: string;
        description: string;
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

export default function LoreMatrix() {
    const [state, setState] = useState<LoreState>({ nodes: [], edges: [], history: [] });
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadState = async () => {
        try {
            const res = await fetch('/api/lore');
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
        loadState();
    }, []);

    const saveState = async (newState: LoreState) => {
        setState(newState);
        try {
            await fetch('/api/lore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodes: newState.nodes, edges: newState.edges, history: newState.history })
            });
        } catch (e) {
            console.error("Failed to save lore", e);
        }
    };

    const handlePromptSubmit = async () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);
        const currentPrompt = prompt;
        setPrompt("");

        try {
            const res = await fetch('/api/generate-lore-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: currentPrompt })
            });
            const actionPlan = await res.json();

            // Save history
            const newHistory = [...state.history, { nodes: [...state.nodes], edges: [...state.edges] }];
            
            let newNodes = [...state.nodes];
            let newEdges = [...state.edges];

            // Apply Nodes
            if (actionPlan.addNodes && Array.isArray(actionPlan.addNodes)) {
                actionPlan.addNodes.forEach((n: any) => {
                    if (!newNodes.find(en => en.id === n.id)) {
                        newNodes.push({
                            id: n.id,
                            type: n.type || 'character',
                            data: { label: n.label, description: n.description }
                        });
                    }
                });
            }

            // Apply Edges
            if (actionPlan.addEdges && Array.isArray(actionPlan.addEdges)) {
                actionPlan.addEdges.forEach((e: any) => {
                    newEdges.push({ source: e.source, target: e.target, label: e.label });
                });
            }

            saveState({ nodes: newNodes, edges: newEdges, history: newHistory });

        } catch (e) {
            console.error("Generation error", e);
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
                                <div key={node.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col group hover:bg-white/10 transition-colors shadow-xl">
                                    
                                    {/* Header: Icon, Type, Delete */}
                                    <div className="flex justify-between items-start mb-4">
                                        
                                        <div className="flex gap-4 items-center">
                                            {/* Minimalist 32x32 Icon Upload Area */}
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

                                        <button 
                                            onClick={() => handleDeleteNode(node.id)}
                                            className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-400 transition-opacity p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-foreground/70 leading-relaxed mb-6 flex-1">
                                        {node.data.description}
                                    </p>

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
                <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-2 flex gap-2 shadow-2xl items-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>
                    
                    <Sparkles className="w-5 h-5 text-accent ml-3 shrink-0" />
                    
                    <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handlePromptSubmit(); }}
                        placeholder="Type a command to build the lore (e.g. 'Add a character named Kirbai')"
                        className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 px-2 placeholder:text-foreground/30 font-sans"
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
