"use client";

import { useState } from "react";

export default function Roadmap() {
    return (
        <div className="flex flex-col gap-12">
            <div className="flex justify-between items-center ml-1">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">Master Roadmap</h2>
                    <p className="text-[10px] text-foreground/60 uppercase tracking-[0.4em] font-black">Strategic Trajectory</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-surface/40 px-5 py-2.5 border border-border/10 squircle text-neutral-500 specular-reflect shadow-xl">
                    Multi-Phase Execution
                </span>
            </div>

            <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-10">
                    <div className="flex flex-col gap-10 relative pl-12 border-l-2 border-border/5">
                        {/* Phase 1 */}
                        <div className="relative group p-10 bg-surface/20 border border-border/10 squircle specular-reflect hover:bg-surface/30 transition-all duration-1000 shadow-2xl overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 blur-[60px] rounded-full -mr-24 -mt-24" />
                            <div className="absolute -left-[63px] top-12 w-6 h-6 rounded-full bg-accent border-[5px] border-background shadow-[0_0_20px_rgba(255,51,102,0.4)] group-hover:scale-125 transition-transform duration-500" />
                            <div className="flex flex-col gap-3 relative z-10">
                                <span className="text-[10px] uppercase font-black tracking-[0.4em] text-accent">Current Objective</span>
                                <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Kirbai OS: Command Center</h3>
                                <p className="text-xs text-foreground/60 leading-relaxed font-bold tracking-tight max-w-lg">Finalizing the aesthetic evolution and social pulse integration for high-fidelity project management.</p>
                            </div>
                        </div>

                        {/* Phase 2 */}
                        <div className="relative group p-10 bg-black/10 border border-border/5 squircle opacity-50 hover:opacity-100 transition-all duration-1000 overflow-hidden">
                            <div className="absolute -left-[63px] top-12 w-6 h-6 rounded-full bg-neutral-900 border-[5px] border-background group-hover:bg-accent/30 transition-all duration-500" />
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] uppercase font-black tracking-[0.4em] text-neutral-600">Pending Trajectory</span>
                                <h3 className="text-xl font-black text-neutral-400 tracking-tight uppercase">Poképia Narrative Pivot</h3>
                                <p className="text-xs text-neutral-600 leading-relaxed font-bold max-w-lg tracking-tight">Integrating real-time viral signals into content hooks for the Kirbai brand universe.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8 mt-6 relative z-10">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-neutral-500 ml-1">Strategic Command Log</h3>
                        <div className="grid grid-cols-1 gap-5">
                            {[
                                "Deploy Phase 11 'Aesthetic Evolution' Suite",
                                "Calibrate Social Media Viral Scraper (Google Trends)",
                                "Sync Master Asset Vault with Skool Resources",
                                "Initialize AELOW Global SEO Sprint #4",
                            ].map((task, idx) => (
                                <div key={idx} className="flex items-center gap-6 p-6 bg-surface/20 border border-border/10 squircle group hover:border-accent/20 transition-all duration-700 specular-reflect shadow-xl">
                                    <div className="w-7 h-7 rounded-2xl border-2 border-border/20 group-hover:border-accent/50 group-hover:bg-accent/10 transition-all flex items-center justify-center shadow-inner overflow-hidden">
                                        <div className="w-3 h-3 bg-accent/0 group-hover:bg-accent/40 rounded-lg transition-all scale-0 group-hover:scale-100" />
                                    </div>
                                    <span className="text-sm font-black text-foreground/60 group-hover:text-foreground transition-colors tracking-tight">{task}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
