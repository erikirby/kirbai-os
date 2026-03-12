"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, Eye, Brain, TrendingUp, DollarSign, Heart, ChevronRight, Loader2 } from 'lucide-react';
import { MuseCard, getMuseCardsAsync, saveMuseCardsAsync } from '@/lib/db';
import MuseClefairy from './MuseClefairy';

const MuseDeck = ({ mode }: { mode: string }) => {
    const [cards, setCards] = useState<MuseCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const [clefairyEmotion, setClefairyEmotion] = useState<'idle' | 'thinking' | 'happy'>('idle');
    const [clefairyMessage, setClefairyMessage] = useState<string | undefined>("Hi Erik! Ready to see what the Muse has for you today?");

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        const stored = await getMuseCardsAsync();
        const pending = stored.filter(c => c.status === 'pending');
        setCards(pending);
    };

    const runSymposium = async () => {
        setLoading(true);
        setClefairyEmotion('thinking');
        setClefairyMessage("The Symposium is debating... one second...");
        
        try {
            const res = await fetch('/api/muse/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode })
            });
            const data = await res.json();
            if (data.cards) {
                setCards(data.cards);
                await saveMuseCardsAsync(data.cards);
                setClefairyEmotion('happy');
                setClefairyMessage("Done! We've found some interesting directions for Kirbai.");
            }
        } catch (e) {
            console.error(e);
            setClefairyMessage("Something went wrong with the brain-sync...");
        } finally {
            setLoading(false);
            setTimeout(() => setClefairyEmotion('idle'), 3000);
        }
    };

    const handleAction = async (status: 'yes' | 'no' | 'maybe') => {
        if (!cards[activeIdx]) return;
        
        const currentCard = cards[activeIdx];
        const updatedCards = cards.filter((_, i) => i !== activeIdx);
        
        setCards(updatedCards);
        
        if (status === 'yes') {
            setClefairyEmotion('happy');
            setClefairyMessage("Great choice! I'll add that to the Roadmap.");
            // Trigger celebration effect
            const burst = document.createElement('div');
            burst.className = 'fixed inset-0 pointer-events-none z-50 flex items-center justify-center';
            burst.innerHTML = `
                <div class="animate-ping absolute w-32 h-32 bg-accent/20 rounded-full"></div>
                <div class="animate-bounce text-6xl text-accent">💖</div>
            `;
            document.body.appendChild(burst);
            setTimeout(() => burst.remove(), 1000);
        } else if (status === 'no') {
            setClefairyMessage("Understood. I'll make sure we don't suggest that again.");
        } else {
            setClefairyMessage("Saving it for later in the Idea Vault.");
        }

        setTimeout(() => {
            setClefairyEmotion('idle');
        }, 2000);
    };

    const currentCard = cards[activeIdx];

    return (
        <div className="flex flex-col items-center gap-12 py-12 min-h-[700px] animate-in fade-in duration-1000">
            {/* 1. The Helper Area */}
            <MuseClefairy emotion={clefairyEmotion} message={clefairyMessage} />

            {/* 2. The Sanctuary Deck */}
            <div className="relative w-full max-w-lg">
                {loading ? (
                    <div className="flex flex-col items-center gap-4 p-12 glass squircle bg-white/5 border-white/10 animate-pulse">
                        <Loader2 className="w-12 h-12 text-accent animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/40">Inhaling the Muse...</p>
                    </div>
                ) : cards.length > 0 && currentCard ? (
                    <div className="relative z-10 p-10 glass squircle bg-white/5 border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col gap-6 animate-in slide-in-from-bottom-10 duration-700">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                                    {currentCard.type === 'content' && <Eye className="w-3 h-3" />}
                                    {currentCard.type === 'workflow' && <Brain className="w-3 h-3" />}
                                    {currentCard.type === 'competitor' && <TrendingUp className="w-3 h-3" />}
                                    {currentCard.type === 'monetization' && <DollarSign className="w-3 h-3" />}
                                    {currentCard.type === 'mental_health' && <Heart className="w-3 h-3" />}
                                    {currentCard.type}
                                </span>
                                <h3 className="text-xl font-black uppercase tracking-widest">{currentCard.title}</h3>
                            </div>
                            <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black text-foreground/40">{activeIdx + 1} / {cards.length}</span>
                        </div>

                        <p className="text-sm text-foreground/70 leading-relaxed font-medium">
                            {currentCard.description}
                        </p>

                        <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                            <p className="text-[10px] text-foreground/40 leading-relaxed italic">
                                <strong>Debate Recap:</strong> {currentCard.debateLog}
                            </p>
                        </div>

                        {/* Action Matrix */}
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(currentCard.actionMatrix).map(([key, val]) => (
                                <div key={key} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center gap-1">
                                    <span className="text-[8px] font-black uppercase tracking-tighter text-foreground/30">{key}</span>
                                    <span className={`text-[9px] font-black uppercase ${val === 'high' ? 'text-accent' : val === 'med' ? 'text-yellow-400' : 'text-green-400'}`}>{val}</span>
                                </div>
                            ))}
                        </div>

                        {/* Decision Buttons */}
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <button 
                                onClick={() => handleAction('no')}
                                className="h-16 flex items-center justify-center bg-white/5 border border-white/10 rounded-3xl text-foreground/40 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <button 
                                onClick={() => handleAction('maybe')}
                                className="h-16 flex items-center justify-center bg-white/5 border border-white/10 rounded-3xl text-foreground/40 hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-blue-400 transition-all font-black text-[10px] uppercase tracking-widest"
                            >
                                Maybe
                            </button>
                            <button 
                                onClick={() => handleAction('yes')}
                                className="h-16 flex items-center justify-center bg-accent text-white rounded-3xl shadow-xl shadow-accent/20 hover:scale-[1.05] active:scale-[0.95] transition-all"
                            >
                                <Check className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-8 p-12 glass squircle bg-white/5 border-white/10 text-center">
                        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center animate-pulse">
                            <Sparkles className="w-10 h-10 text-accent" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-lg font-black uppercase tracking-widest">Nothing in the Deck</h3>
                            <p className="text-[10px] text-foreground/40 uppercase leading-relaxed">The Symposium is awaiting your signal to begin today's briefing.</p>
                        </div>
                        <button 
                            onClick={runSymposium}
                            className="px-8 py-4 bg-accent text-white rounded-full font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:bg-accent/80 transition-all flex items-center gap-3"
                        >
                            <Brain className="w-4 h-4" /> Start Symposium
                        </button>
                    </div>
                )}
            </div>

            {/* Background Aesthetic */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 blur-[120px] rounded-full animate-pulse-slow" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 blur-[100px] rounded-full" />
            </div>
        </div>
    );
};

export default MuseDeck;
