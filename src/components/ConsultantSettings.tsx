"use client"

import { useState, useEffect } from 'react';
import { Loader2, Database, Brain, PenTool, Sparkles, Target, Settings2 } from 'lucide-react';

export default function ConsultantSettings({ theme }: { theme?: string }) {
    const [identity, setIdentity] = useState({
        brandIdentity: "",
        aestheticRules: "",
        narrativeRules: "",
        workflowTools: "",
        ultimateGoal: ""
    });
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState("");

    useEffect(() => {
        fetch('/api/brand-identity')
            .then(res => res.json())
            .then(data => {
                if (!data.error) setIdentity({
                    brandIdentity: data.brandIdentity || "",
                    aestheticRules: data.aestheticRules || "",
                    narrativeRules: data.narrativeRules || "",
                    workflowTools: data.workflowTools || "",
                    ultimateGoal: data.ultimateGoal || ""
                });
            });
    }, []);

    const saveIdentity = async () => {
        setIsSaving(true);
        setStatus("Syncing Core Parameters...");
        try {
            await fetch('/api/brand-identity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(identity)
            });
            setStatus("Pipeline Updated Successfully");
        } catch (e) {
            setStatus("Error Saving Core Payload");
        }
        setTimeout(() => {
            setIsSaving(false);
            setStatus("");
        }, 2000);
    };

    return (
        <div className="w-full max-w-5xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div className="bg-surface border border-border/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                {/* Background Accent glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border/10 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center border border-accent/20 shadow-inner">
                        <Settings2 className="w-7 h-7 text-accent" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-md">The Core: Identity Matrix</h2>
                        <p className="text-xs font-black uppercase tracking-widest text-accent/80 mt-1">Ground Truth Payload for Kirbai OS Intelligence</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                    
                    {/* Brand Identity */}
                    <div className="space-y-3 lg:col-span-2">
                        <label className="text-xs font-black uppercase tracking-widest text-foreground/60 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-purple-500" /> Brand Identity & Vibe
                        </label>
                        <textarea 
                            value={identity.brandIdentity}
                            onChange={(e) => setIdentity({...identity, brandIdentity: e.target.value})}
                            placeholder="e.g., Gaymer millennial aesthetic, psychological profiles, Diva pop... "
                            className="w-full text-sm font-mono bg-black/40 border border-white/10 rounded-2xl p-5 h-32 resize-none focus:border-purple-500/50 outline-none text-foreground/90 transition-colors shadow-inner leading-relaxed"
                        />
                        <p className="text-[10px] text-foreground/40 leading-relaxed uppercase tracking-wider font-bold">
                            Defines the ultimate tone, psychological depth, and musical "drag-pop" anchor for the AI's copywriting and ideation.
                        </p>
                    </div>

                    {/* Aesthetic Rules */}
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-foreground/60 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-pink-500" /> Aesthetic Rules
                        </label>
                        <textarea 
                            value={identity.aestheticRules}
                            onChange={(e) => setIdentity({...identity, aestheticRules: e.target.value})}
                            placeholder="e.g., Pink shinies, realistic textures but faithful silhouettes..."
                            className="w-full text-sm font-mono bg-black/40 border border-white/10 rounded-2xl p-5 h-44 resize-none focus:border-pink-500/50 outline-none text-foreground/90 transition-colors shadow-inner leading-relaxed"
                        />
                         <p className="text-[10px] text-foreground/40 leading-relaxed uppercase tracking-wider font-bold">
                            Strict visual boundaries (Do's and Don'ts) the AI must obey when generating image prompts or describing art design.
                        </p>
                    </div>
                    
                    {/* Narrative Rules */}
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-foreground/60 flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-500" /> Narrative & Lore
                        </label>
                        <textarea 
                            value={identity.narrativeRules}
                            onChange={(e) => setIdentity({...identity, narrativeRules: e.target.value})}
                            placeholder="e.g., Alternate reality metaphors, emotional complexity..."
                            className="w-full text-sm font-mono bg-black/40 border border-white/10 rounded-2xl p-5 h-44 resize-none focus:border-emerald-500/50 outline-none text-foreground/90 transition-colors shadow-inner leading-relaxed"
                        />
                         <p className="text-[10px] text-foreground/40 leading-relaxed uppercase tracking-wider font-bold">
                            Guides the storytelling layers, emphasizing character motivations and fan-fiction style plotlines over generic text.
                        </p>
                    </div>

                    {/* Workflow & Tools */}
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-foreground/60 flex items-center gap-2">
                            <PenTool className="w-4 h-4 text-blue-500" /> Workflows & Tools
                        </label>
                        <textarea 
                            value={identity.workflowTools}
                            onChange={(e) => setIdentity({...identity, workflowTools: e.target.value})}
                            placeholder="e.g., Gemini -> LM Arena. Grok for single characters. Veo 3..."
                            className="w-full text-sm font-mono bg-black/40 border border-white/10 rounded-2xl p-5 h-44 resize-none focus:border-blue-500/50 outline-none text-foreground/90 transition-colors shadow-inner leading-relaxed"
                        />
                        <p className="text-[10px] text-foreground/40 leading-relaxed uppercase tracking-wider font-bold">
                            Tells the AI exactly what software pipelines (LM Arena, Grok, Claude) you use so it gives actionable technical advice instead of guessing.
                        </p>
                    </div>

                    {/* Ultimate Goal */}
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-foreground/60 flex items-center gap-2">
                            <Target className="w-4 h-4 text-amber-500" /> The Ultimate Goal
                        </label>
                        <textarea 
                            value={identity.ultimateGoal}
                            onChange={(e) => setIdentity({...identity, ultimateGoal: e.target.value})}
                            placeholder="e.g., Profitable artistry, viral videos, fulfilling art..."
                            className="w-full text-sm font-mono bg-black/40 border border-white/10 rounded-2xl p-5 h-44 resize-none focus:border-amber-500/50 outline-none text-foreground/90 transition-colors shadow-inner leading-relaxed"
                        />
                        <p className="text-[10px] text-foreground/40 leading-relaxed uppercase tracking-wider font-bold">
                            The primary metric for success. Keeps the AI's strategic advice focused on profitability without sacrificing creative integrity.
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-border/10 pt-6 relative z-10">
                    <span className="text-xs font-bold text-accent">{status}</span>
                    <button 
                        onClick={saveIdentity}
                        disabled={isSaving}
                        className="px-8 py-4 rounded-xl bg-accent text-white text-xs font-black uppercase tracking-widest hover:bg-accent/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20 cursor-pointer"
                    >
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin"/> Syncing Matrix</> : 'Update Identity Pipeline'}
                    </button>
                </div>
            </div>
        </div>
    );
}
