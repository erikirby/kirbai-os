"use client";

import React, { useState, useEffect } from 'react';
import { MuseCard, getMuseCardsAsync, saveMuseCardsAsync, saveUserPsycheAsync, getUserPsycheAsync, addRoadmapTaskAsync } from '@/lib/db';
import MuseClefairy from './MuseClefairy';
import MuseHistory from './MuseHistory';
import { Sparkles, X, Check, Eye, Brain, TrendingUp, DollarSign, Heart, ChevronRight, Loader2, Bookmark, CheckCircle2 } from 'lucide-react';

const MuseDeck = ({ mode }: { mode: string }) => {
    const [cards, setCards] = useState<MuseCard[]>([]);
    const [history, setHistory] = useState<MuseCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [motivation, setMotivation] = useState(50);
    const [clefairyEmotion, setClefairyEmotion] = useState<'idle' | 'thinking' | 'happy' | 'starry-eyed' | 'worried' | 'surprised'>('idle');
    const [clefairyMessage, setClefairyMessage] = useState<string | undefined>("Hi Erik! Ready to see what the Muse has for you today?");

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        const stored = await getMuseCardsAsync();
        const pending = stored.filter(c => c.status === 'pending');
        const accepted = stored.filter(c => c.status === 'yes');
        setCards(pending);
        setHistory(accepted);

        const psyche = await getUserPsycheAsync();
        if (psyche) setMotivation(psyche.motivationLevel || 50);
    };

    const runSymposium = async () => {
        setLoading(true);
        setClefairyEmotion('thinking');
        setClefairyMessage("The Symposium is debating... one second...");
        
        try {
            // Gather all existing titles to prevent repetition
            const existingTitles = [...cards, ...history].map(c => c.title);

            const res = await fetch('/api/muse/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, existingTitles })
            });
            const data = await res.json();
            if (data.cards) {
                setCards(data.cards);
                await saveMuseCardsAsync(data.cards);
                
                // Soulful Synthesis
                setClefairyEmotion(data.clefairyEmotion || 'happy');
                setClefairyMessage(data.clefairyComment || "Done! We've found some interesting directions for Kirbai.");
            }
        } catch (e) {
            console.error(e);
            setClefairyMessage("Something went wrong with the brain-sync...");
        } finally {
            setLoading(false);
            // Don't reset to idle immediately if she's starry-eyed or worried
            setTimeout(() => {
                if (!['worried', 'starry-eyed'].includes(clefairyEmotion)) {
                    setClefairyEmotion('idle');
                }
            }, 5000);
        }
    };

    const handleAction = async (status: 'yes' | 'no' | 'maybe') => {
        if (!cards[activeIdx]) return;
        
        const currentCard = cards[activeIdx];
        const updatedCards = cards.filter((_, i) => i !== activeIdx);
        
        setCards(updatedCards);
        
        if (status === 'yes') {
            setClefairyEmotion('starry-eyed');
            setClefairyMessage(`I knew you'd like that! "${currentCard.title}" has so much soul.`);
            
            // Autopilot: Add to Roadmap
            await addRoadmapTaskAsync(mode, currentCard.title, currentCard.description);

            // Advance Psyche Memory
            const psyche = await getUserPsycheAsync();
            if (psyche) {
                psyche.wins.push(currentCard.title);
                psyche.motivationLevel = Math.min(100, (psyche.motivationLevel || 50) + 5);
                await saveUserPsycheAsync(psyche);
                setMotivation(psyche.motivationLevel);
            }

            // Update History
            setHistory(prev => [currentCard, ...prev]);

            // Trigger celebration effect
            const burst = document.createElement('div');
            burst.className = 'fixed inset-0 pointer-events-none z-50 flex items-center justify-center';
            burst.innerHTML = `
                <div class="animate-ping absolute w-48 h-48 bg-accent/20 rounded-full"></div>
                <div class="animate-bounce text-7xl text-accent drop-shadow-[0_0_20px_rgba(255,51,102,0.6)]">✨</div>
            `;
            document.body.appendChild(burst);
            setTimeout(() => burst.remove(), 1200);
        } else if (status === 'no') {
            const isHighValue = currentCard.actionMatrix.revenue === 'high' || currentCard.actionMatrix.creativeValue === 'high';
            
            if (isHighValue) {
                setClefairyEmotion('worried');
                setClefairyMessage("Oh? Are you sure? That one seemed really promising for the brand...");
            } else {
                setClefairyEmotion('idle');
                setClefairyMessage("Understood. I'll make sure we don't suggest that again.");
            }
            
            const psyche = await getUserPsycheAsync();
            if (psyche) {
                psyche.motivationLevel = Math.max(0, (psyche.motivationLevel || 50) - 2);
                await saveUserPsycheAsync(psyche);
                setMotivation(psyche.motivationLevel);
            }
        } else {
            setClefairyEmotion('idle');
            setClefairyMessage("Saving it for later in the Idea Vault.");
            
            // Track Maybes in session history too
            const maybeCard = { ...currentCard, status: 'maybe' as const };
            setHistory(prev => [maybeCard, ...prev]);
        }

        setTimeout(() => {
            setClefairyEmotion('idle');
        }, 3000);
    };

    const currentCard = cards[activeIdx];

    if (showHistory) {
        return (
            <div className="w-full max-w-4xl px-6 py-12">
                <MuseHistory cards={history} onBack={() => setShowHistory(false)} />
            </div>
        );
    }

    const acceptedAndMaybe = history.concat(cards.filter(c => c.status === 'maybe'));

    return (
        <div className="w-full max-w-7xl mx-auto px-6 py-12 min-h-screen animate-in fade-in duration-1000">
            {/* Main 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                {/* LEFT COLUMN: Deck & Decisions (8 Units) */}
                <div className="lg:col-span-8 flex flex-col gap-12">
                    
                    {/* 0. Motivation Meter (Pastel Style) */}
                    <div className="w-full max-w-md flex flex-col gap-3">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em] text-accent/40">
                            <span>Motivation Synergy</span>
                            <span className="text-accent">{motivation}%</span>
                        </div>
                        <div className="h-2 w-full bg-accent/5 rounded-full overflow-hidden border border-accent/10 p-0.5">
                            <div 
                                className="h-full bg-gradient-to-r from-accent/20 to-accent rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,51,102,0.3)]"
                                style={{ width: `${motivation}%` }}
                            />
                        </div>
                    </div>

                    {/* 1. The Sanctuary Deck */}
                    <div className="relative w-full">
                        {loading ? (
                            <div className="flex flex-col items-center gap-6 p-20 glass squircle bg-white/40 border-white/20 animate-pulse">
                                <Loader2 className="w-16 h-16 text-accent animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent/40">Inhaling the Muse...</p>
                            </div>
                        ) : cards.length > 0 && currentCard ? (
                            <div className="relative">
                                {/* Back Cards (Stack Effect) */}
                                {cards.length > 1 && (
                                    <div className="absolute top-4 left-4 right-4 h-full bg-white/10 border border-white/20 rounded-[40px] -z-10 translate-y-2 scale-[0.98] opacity-50" />
                                )}
                                {cards.length > 2 && (
                                    <div className="absolute top-8 left-8 right-8 h-full bg-white/5 border border-white/10 rounded-[40px] -z-20 translate-y-4 scale-[0.96] opacity-30" />
                                )}

                                <div className="relative z-10 p-12 bg-white/60 backdrop-blur-2xl rounded-[48px] border border-white p-12 shadow-[0_40px_100px_rgba(255,51,102,0.05)] flex flex-col gap-8 animate-in slide-in-from-bottom-10 duration-700">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-accent flex items-center gap-2">
                                                {currentCard.type === 'content' && <Eye className="w-4 h-4" />}
                                                {currentCard.type === 'workflow' && <Brain className="w-4 h-4" />}
                                                {currentCard.type === 'competitor' && <TrendingUp className="w-4 h-4" />}
                                                {currentCard.type === 'monetization' && <DollarSign className="w-4 h-4" />}
                                                {currentCard.type === 'mental_health' && <Heart className="w-4 h-4" />}
                                                {currentCard.type}
                                            </span>
                                            <h3 className="text-3xl font-black uppercase tracking-tighter text-accent/80 leading-none">{currentCard.title}</h3>
                                        </div>
                                        <span className="px-4 py-1.5 bg-accent/10 rounded-full text-[10px] font-black text-accent">{activeIdx + 1} / {cards.length}</span>
                                    </div>

                                    <p className="text-base text-accent/60 leading-relaxed font-medium max-w-prose">
                                        {currentCard.description}
                                    </p>

                                    <div className="p-6 bg-white/40 rounded-3xl border border-white/60 shadow-inner">
                                        <p className="text-[11px] text-accent/40 leading-relaxed italic font-medium">
                                            <strong className="text-accent/60">The Symposium Debated:</strong> {currentCard.debateLog}
                                        </p>
                                    </div>

                                    {/* Action Matrix */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.entries(currentCard.actionMatrix).map(([key, val]) => (
                                            <div key={key} className="p-4 bg-white/40 border border-white rounded-3xl flex flex-col items-center gap-1.5 shadow-sm">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-accent/30">{key}</span>
                                                <span className={`text-[11px] font-black uppercase ${val === 'high' ? 'text-accent' : val === 'med' ? 'text-orange-400' : 'text-green-500'}`}>{val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Decision Buttons */}
                                    <div className="grid grid-cols-3 gap-6 mt-4">
                                        <button 
                                            onClick={() => handleAction('no')}
                                            className="h-20 flex items-center justify-center bg-white/40 border border-white/60 rounded-[32px] text-accent/20 hover:bg-red-50 hover:text-red-400 transition-all shadow-sm"
                                        >
                                            <X className="w-8 h-8" />
                                        </button>
                                        <button 
                                            onClick={() => handleAction('maybe')}
                                            className="h-20 flex items-center justify-center bg-white/40 border border-white/60 rounded-[32px] text-accent/40 hover:bg-blue-50 hover:text-blue-400 transition-all font-black text-[11px] uppercase tracking-[0.3em] shadow-sm"
                                        >
                                            Maybe
                                        </button>
                                        <button 
                                            onClick={() => handleAction('yes')}
                                            className="h-20 flex items-center justify-center bg-accent text-white rounded-[32px] shadow-2xl shadow-accent/40 hover:scale-[1.05] active:scale-[0.95] transition-all"
                                        >
                                            <Check className="w-10 h-10" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-8 p-20 bg-white/20 border border-white/40 rounded-[48px] text-center backdrop-blur-sm">
                                <div className="w-24 h-24 bg-accent/5 rounded-full flex items-center justify-center animate-pulse">
                                    <Sparkles className="w-12 h-12 text-accent" />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-accent/80">Sanctuary Empty</h3>
                                    <p className="text-[11px] text-accent/40 uppercase tracking-widest leading-relaxed">The Symposium is awaiting your signal to begin the session.</p>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <button 
                                        onClick={runSymposium}
                                        className="px-12 py-5 bg-accent text-white rounded-full font-black uppercase tracking-[0.2em] shadow-2xl shadow-accent/40 hover:bg-accent/80 transition-all flex items-center gap-4"
                                    >
                                        <Brain className="w-5 h-5" /> Start Symposium
                                    </button>
                                    
                                    <button 
                                        onClick={() => setShowHistory(true)}
                                        className="text-[10px] font-black uppercase tracking-[0.4em] text-accent/30 hover:text-accent transition-all"
                                    >
                                        View Decision Archive
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. PERSISTENT DECISION LIST (Directly below) */}
                    {(history.length > 0 || cards.some(c => c.status === 'maybe')) && (
                        <div className="flex flex-col gap-8 p-10 bg-white/20 border border-white/40 rounded-[48px] backdrop-blur-sm animate-in fade-in duration-1000">
                            <div className="flex items-center gap-3 pb-4 border-b border-accent/10">
                                <Bookmark className="w-5 h-5 text-accent" />
                                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-accent/60">Session Log: Priorities</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {history.slice(0, 4).map(card => (
                                    <div key={card.id} className="flex items-center gap-4 p-5 bg-white/40 rounded-3xl border border-white">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-accent/80">{card.title}</span>
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-accent/30">{card.type}</span>
                                        </div>
                                    </div>
                                ))}
                                {cards.filter(c => c.status === 'maybe').map(card => (
                                    <div key={card.id} className="flex items-center gap-4 p-5 bg-white/40 rounded-3xl border border-white opacity-60">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Bookmark className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-accent/80">{card.title}</span>
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-accent/30">Shelved / Potential</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: The Muse (4 Units) */}
                <div className="lg:col-span-4 sticky top-12 flex flex-col items-center pt-20 lg:pt-40">
                    <MuseClefairy emotion={clefairyEmotion} message={clefairyMessage} />
                </div>

            </div>

            {/* Background Aesthetic (Pastel) */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#fdf2f5]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 blur-[150px] rounded-full animate-pulse-slow" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/20 blur-[120px] rounded-full" />
                <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-mint-200/10 blur-[100px] rounded-full" />
            </div>
        </div>
    );
};

export default MuseDeck;
