"use client";

import React from 'react';
import { MuseCard } from '@/lib/db';
import { CheckCircle2, History, ArrowLeft } from 'lucide-react';

interface MuseHistoryProps {
    cards: MuseCard[];
    onBack: () => void;
}

const MuseHistory: React.FC<MuseHistoryProps> = ({ cards, onBack }) => {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-10 duration-500">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-accent" />
                    <h3 className="text-xl font-black uppercase tracking-widest">History Vault</h3>
                </div>
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                    <ArrowLeft className="w-3 h-3" /> Back
                </button>
            </div>

            {cards.length === 0 ? (
                <div className="p-12 text-center glass rounded-3xl border-white/5 opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-widest">No accepted proposals yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cards.map((card) => (
                        <div key={card.id} className="p-6 glass rounded-3xl border-white/10 hover:border-accent/40 transition-all group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[8px] font-black uppercase tracking-widest text-accent/60">{card.type}</span>
                                <CheckCircle2 className="w-4 h-4 text-green-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-widest mb-2">{card.title}</h4>
                            <p className="text-[11px] text-foreground/50 leading-relaxed line-clamp-2 mb-4">{card.description}</p>
                            <div className="flex gap-2">
                                {Object.entries(card.actionMatrix).map(([k, v]) => (
                                    <span key={k} className="text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 bg-black/40 rounded-md border border-white/5 text-foreground/30">
                                        {k.charAt(0)}: {v.charAt(0)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MuseHistory;
