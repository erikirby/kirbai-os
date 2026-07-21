"use client";

import React, { useState, useEffect } from 'react';
import type { MuseCard } from '@/lib/db';

// Server-backed persistence (browser must not hit Supabase directly — RLS)
const getMuseCardsAsync = async (): Promise<MuseCard[]> => {
    const res = await fetch('/api/muse/cards');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load cards');
    return data.cards || [];
};
const saveMuseCardsAsync = async (cards: MuseCard[]) => {
    const res = await fetch('/api/muse/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'saveCards', cards }) });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to save cards');
};
const addRoadmapTaskAsync = async (mode: string, title: string, description: string) => {
    const res = await fetch('/api/muse/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addRoadmapTask', mode, title, description }) });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to add task');
};
import MuseClefairy from './MuseClefairy';
import { Sparkles, X, Check, Eye, Brain, TrendingUp, DollarSign, Heart, ChevronRight, Loader2, Bookmark, CheckCircle2 } from 'lucide-react';

const MuseDeck = ({ mode }: { mode: string }) => {
    const [cards, setCards] = useState<MuseCard[]>([]);
    const [history, setHistory] = useState<MuseCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<MuseCard | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [clefairyEmotion, setClefairyEmotion] = useState<'idle' | 'thinking' | 'happy' | 'starry-eyed' | 'worried' | 'surprised' | 'excited' | 'singing' | 'annoyed' | 'proud' | 'cheerful'>('idle');
    const [clefairyMessage, setClefairyMessage] = useState<string | undefined>("Hi Erik! Ready to see what the Muse has for you today?");
    const [journalPage, setJournalPage] = useState(0);
    const LOGS_PER_PAGE = 3;

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        const stored = await getMuseCardsAsync();
        const pending = stored.filter(c => c.status === 'pending');
        const accepted = stored.filter(c => c.status !== 'pending'); // includes yes, no, maybe
        setCards(pending);
        setHistory(accepted);
    };

    const runSymposium = async () => {
        setLoading(true);
        setClefairyEmotion('singing');
        setClefairyMessage("The Symposium is debating... one second...");
        
        try {
            // Gather all existing titles (pending, history) to prevent repetition
            const existingTitles = [...cards, ...history].map(c => c.title);

            const res = await fetch('/api/muse/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, existingTitles })
            });
            const data = await res.json();
            if (data.error) {
                throw new Error(data.error);
            }
            if (data.cards) {
                const combined = [...cards, ...data.cards];
                setCards(combined);
                await saveMuseCardsAsync(combined);

                // Soulful Synthesis
                setClefairyEmotion(data.clefairyEmotion || 'happy');
                setClefairyMessage(data.clefairyComment || "Done! We've found some interesting directions for Kirbai.");
            }
        } catch (e: any) {
            console.error(e);
            let errorMsg = "Something went wrong with the brain-sync...";
            try {
                const inner = JSON.parse(e.message);
                const code = inner?.error?.code;
                const status = inner?.error?.status;
                if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
                    errorMsg = "AI quota limit reached. The neural net needs a few minutes to recover — try again shortly.";
                } else if (code === 503 || status === 'UNAVAILABLE') {
                    errorMsg = "AI is overloaded right now. Give it a moment and try again.";
                } else if (inner?.error?.message) {
                    errorMsg = inner.error.message.slice(0, 120);
                }
            } catch {}
            setClefairyEmotion('worried');
            setClefairyMessage(errorMsg);
        } finally {
            setLoading(false);
            setTimeout(() => {
                if (!['worried', 'starry-eyed', 'excited', 'annoyed', 'proud', 'cheerful'].includes(clefairyEmotion)) {
                    setClefairyEmotion('idle');
                }
            }, 5000);
        }
    };

    const handleAction = async (status: 'yes' | 'no' | 'maybe') => {
        if (!cards[activeIdx]) return;
        
        const currentCard = cards[activeIdx];
        const updatedPending = cards.filter((_, i) => i !== activeIdx);
        
        let updatedHistory = history;
        
        try {
            if (status === 'yes') {
                setClefairyEmotion('starry-eyed');
                setClefairyMessage(`I knew you'd like that! "${currentCard.title}" has so much soul.`);
                await addRoadmapTaskAsync(mode, currentCard.title, currentCard.description);
                updatedHistory = [{ ...currentCard, status: 'yes' }, ...history];
            } else if (status === 'no') {
                setClefairyEmotion('annoyed');
                setClefairyMessage(currentCard.actionMatrix.revenue === 'high' ? "Oh? Are you sure? That one seemed really promising..." : "Understood. I'll make sure we don't suggest that again.");
                updatedHistory = [{ ...currentCard, status: 'no' }, ...history];
            } else {
                setClefairyEmotion('cheerful');
                setClefairyMessage("Saving it for later in the Idea Vault.");
                updatedHistory = [{ ...currentCard, status: 'maybe' }, ...history];
            }

            setCards(updatedPending);
            setHistory(updatedHistory);
            await saveMuseCardsAsync([...updatedPending, ...updatedHistory]);
        } catch (error: any) {
            console.error("Muse Action Error:", error);
            setClefairyEmotion('worried');
            setClefairyMessage("Something went wrong when trying to save that idea... Check the console.");
        }

        setTimeout(() => setClefairyEmotion('idle'), 3000);
    };

    const currentCard = cards[activeIdx];


    const journalItems = history
        .filter(c => c.status !== 'no')
        .sort((a, b) => {
            if (a.status === 'yes' && b.status !== 'yes') return -1;
            if (a.status !== 'yes' && b.status === 'yes') return 1;
            return 0;
        });

    return (
        <div className="w-full max-w-7xl mx-auto px-6 py-12 min-h-screen relative flex flex-col items-center">
            
            {/* Sanctuary Animations (Isolated Refinement V2 - Seamless) */}
            <style>{`
                @keyframes sanctuary-cycle {
                    0% { background-color: var(--surface-color); }
                    33% { background-color: var(--surface-elevated); }
                    66% { background-color: var(--surface-color); }
                    100% { background-color: var(--surface-color); }
                }
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    50% { transform: translateY(-30px) translateX(15px); }
                }
                .animate-sanctuary-cycle {
                    animation: sanctuary-cycle 20s ease-in-out infinite;
                }
                .animate-float-slow {
                    animation: float-slow 15s ease-in-out infinite;
                }
            `}</style>

            {/* Header / Title */}
            <div className="w-full flex justify-between items-center mb-6">
                <div className="flex flex-col gap-1">
                    <h2 className="section-title text-accent">Muse</h2>
                    <span className="section-eyebrow pl-1">Advisory Suite</span>
                </div>
            </div>

            {/* Main 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start w-full relative z-10">
                
                {/* LEFT COLUMN: Deck & Decisions (8 Units) */}
                <div className={`lg:col-span-8 flex flex-col gap-12 ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'animate-bob' : ''}`}>
                    


                    {/* 1. The Sanctuary Deck */}
                    <div className="relative w-full">
                        {loading ? (
                            <div className="flex flex-col items-center gap-6 p-20 card animate-pulse">
                                <Loader2 className="w-16 h-16 text-accent animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Inhaling the Muse...</p>
                            </div>
                        ) : cards.length > 0 && currentCard ? (
                            <div className="relative">
                                {/* Back Cards (Stack Effect) */}
                                {cards.length > 1 && (
                                    <div className="absolute top-4 left-4 right-4 h-full bg-surface/50 border border-border rounded-[var(--card-radius)] -z-10 translate-y-2 scale-[0.98] opacity-50" />
                                )}
                                {cards.length > 2 && (
                                    <div className="absolute top-8 left-8 right-8 h-full bg-surface/30 border border-border rounded-[var(--card-radius)] -z-20 translate-y-4 scale-[0.96] opacity-30" />
                                )}

                                <div className={`relative z-10 p-10 md:p-12 card p-10 md:p-12 flex flex-col gap-8 animate-in slide-in-from-bottom-10 duration-[1000ms] animate-sanctuary-cycle`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-2">
                                            <span className={`section-subtitle flex items-center gap-2`}>
                                                {currentCard.type === 'content' && <Eye className="w-4 h-4" />}
                                                {currentCard.type === 'workflow' && <Brain className="w-4 h-4" />}
                                                {currentCard.type === 'competitor' && <TrendingUp className="w-4 h-4" />}
                                                {currentCard.type === 'monetization' && <DollarSign className="w-4 h-4" />}
                                                {currentCard.type === 'mental_health' && <Heart className="w-4 h-4" />}
                                                {currentCard.type}
                                            </span>
                                            <h3 className={`section-title`}>{currentCard.title}</h3>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border whitespace-nowrap badge`}>{activeIdx + 1} / {cards.length}</span>
                                    </div>

                                    <p className={`text-lg font-medium leading-relaxed max-w-prose text-foreground/80`}>
                                        {currentCard.description}
                                    </p>

                                    {currentCard.hook && (currentCard.hook.frame1 || currentCard.hook.second5) && (
                                        <div className={`p-5 card p-5 flex flex-col gap-1.5 bg-surface border-border`}>
                                            {currentCard.lens && <span className={`text-[9px] font-black uppercase tracking-widest text-foreground/50`}>Lens: {currentCard.lens}</span>}
                                            {currentCard.hook.frame1 && <p className={`text-sm font-bold text-foreground/80`}><span className="uppercase text-[9px] font-black tracking-widest opacity-60">Frame 1: </span>{currentCard.hook.frame1}</p>}
                                            {currentCard.hook.second5 && <p className={`text-sm font-bold text-foreground/80`}><span className="uppercase text-[9px] font-black tracking-widest opacity-60">Second 5: </span>{currentCard.hook.second5}</p>}
                                        </div>
                                    )}

                                    <div className={`p-8 md:p-10 card p-8 md:p-10 min-h-[120px] bg-surface border-border`}>
                                        <p className={`text-sm leading-relaxed italic font-bold text-foreground/75`}>
                                            <strong className="text-foreground opacity-90">The Symposium Debated:</strong> {currentCard.debateLog}
                                        </p>
                                    </div>

                                    {/* Action Matrix */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.entries(currentCard.actionMatrix).map(([key, val]) => (
                                            <div key={key} className={`card p-4 flex flex-col items-center gap-1.5 transition-transform hover:scale-[1.02]`}>
                                                <span className={`text-[9px] font-black uppercase tracking-widest text-foreground/40`}>{key}</span>
                                                <span className={`text-[11px] font-black uppercase ${val === 'high' ? 'text-foreground' : val === 'med' ? 'text-orange-600' : 'text-green-700'}`}>{val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Decision Buttons */}                                    <div className="grid grid-cols-3 gap-4 mt-4">
                                        <button 
                                            onClick={() => handleAction('no')}
                                            title="Archive this idea"
                                            className={`btn-secondary text-red-400 group h-16`}
                                        >
                                            <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        </button>
                                        <button 
                                            onClick={() => handleAction('maybe')}
                                            title="Keep in Session Log for later"
                                            className={`btn-secondary text-blue-400 h-16`}
                                        >
                                            Maybe
                                        </button>
                                        <button 
                                            onClick={() => handleAction('yes')}
                                            title="Add to Roadmap & Action Plan"
                                            className={`btn-primary h-16`}
                                        >
                                            <Check className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`card flex flex-col items-center gap-8 p-12 text-center`}>
                                <div className="w-24 h-24 bg-accent/5 rounded-full flex items-center justify-center animate-pulse">
                                    <Sparkles className="w-12 h-12 text-accent" />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-foreground">Sanctuary Empty</h3>
                                    <p className="text-[11px] text-accent uppercase tracking-widest leading-relaxed">The Symposium is awaiting your signal to begin the session.</p>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <button 
                                        onClick={runSymposium}
                                        className="btn-primary px-8 py-4 flex items-center gap-2"
                                    >
                                        <Brain className="w-5 h-5" /> Start Symposium
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: The Muse & Clefairy's Log (4 Units) */}
                <div className="lg:col-span-4 sticky top-12 flex flex-col items-center pt-10 lg:pt-20 relative z-30 gap-8">
                    <MuseClefairy emotion={clefairyEmotion} message={clefairyMessage} />

                    {/* Clefairy's Log (Stylized Journal) */}
                    {journalItems.length > 0 && (
                        <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-700">
                            <div className="relative card p-6 flex flex-col gap-4">
                                {/* Binder Holes Removed */}
                                

                                <div className="pl-0">
                                    <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                                        <h4 className="section-title">Clefairy's Log</h4>
                                        <span className="text-sm text-foreground/40">Page {journalPage + 1}</span>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        {journalItems.slice(journalPage * LOGS_PER_PAGE, (journalPage + 1) * LOGS_PER_PAGE).map(card => (
                                            <button 
                                                key={card.id} 
                                                onClick={() => setSelectedDetail(card)}
                                                className="group relative card p-3 border-l-4 border-l-accent text-left hover:bg-black/5 transition-all rounded-r-lg"
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`w-2 h-2 rounded-full ${card.status === 'yes' ? 'bg-green-400' : 'bg-blue-400'}`} />
                                                    <span className="font-semibold text-foreground">{card.title}</span>
                                                </div>
                                                <p className="text-sm text-foreground/60 line-clamp-2 mt-1">
                                                    {card.status === 'yes' ? 'Erik approved the symposium\'s debate on this. Pushing to roadmap.' : 
                                                     'Stored for future synthesis in the vault.'}
                                                </p>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Turning the Page */}
                                    {journalItems.length > LOGS_PER_PAGE && (
                                        <div className="mt-8 flex justify-center gap-8">
                                            <button 
                                                disabled={journalPage === 0}
                                                onClick={() => setJournalPage(p => p - 1)}
                                                className="btn-ghost text-xs"
                                            >
                                                Previous
                                            </button>
                                            <button 
                                                disabled={(journalPage + 1) * LOGS_PER_PAGE >= journalItems.length}
                                                onClick={() => setJournalPage(p => p + 1)}
                                                className="btn-ghost text-xs"
                                            >
                                                Next Page
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* DETAIL VIEW MODAL */}
            {selectedDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-accent/20 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-2xl card p-8 md:p-12 bg-surface/95 backdrop-blur-3xl shadow-2xl animate-in zoom-in-95 duration-300">
                        <button 
                            onClick={() => setSelectedDetail(null)}
                            className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-accent/10 rounded-full text-accent hover:bg-accent hover:text-foreground transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex flex-col gap-8 text-accent">
                            <div className="flex flex-col gap-2">
                                <span className="text-[12px] font-black uppercase tracking-[0.3em] text-accent">{selectedDetail.type}</span>
                                <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">{selectedDetail.title}</h3>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="p-8 card p-6 bg-surface-elevated">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-3">Proposal Detail</h4>
                                    <p className="text-lg font-semibold leading-relaxed text-foreground">{selectedDetail.description}</p>
                                </div>

                                <div className="p-8 card p-6 bg-surface-elevated">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-3">The Symposium Debate</h4>
                                    <p className="text-sm font-bold leading-relaxed text-foreground/70 italic">{selectedDetail.debateLog}</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-accent/30 italic">
                                <span>Status: {selectedDetail.status}</span>
                                <span>ID: {selectedDetail.id.slice(0, 8)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MuseDeck;
