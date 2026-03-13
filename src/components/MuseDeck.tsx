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
    const [selectedDetail, setSelectedDetail] = useState<MuseCard | null>(null);
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
        <div className="w-full max-w-7xl mx-auto px-6 py-12 min-h-screen relative flex flex-col items-center">
            
            {/* Sanctuary Animations (Isolated Refinement V2 - Seamless) */}
            <style jsx>{`
                @keyframes sanctuary-cycle {
                    0% { background-color: #deb8c2; }
                    33% { background-color: #b8cde0; }
                    66% { background-color: #cdc0e0; }
                    100% { background-color: #deb8c2; }
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
            <div className="w-full flex justify-between items-center mb-12">
                <div className="flex flex-col gap-1">
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-accent/90 leading-none">Muse</h2>
                    <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-accent/30 pl-1">Advisory Suite</span>
                </div>
            </div>

            {/* Main 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start w-full relative z-10">
                
                {/* LEFT COLUMN: Deck & Decisions (8 Units) */}
                <div className={`lg:col-span-8 flex flex-col gap-12 ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'animate-bob' : ''}`}>
                    
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

                                <div className={`relative z-10 p-10 md:p-12 rounded-[64px] border flex flex-col gap-8 animate-in slide-in-from-bottom-10 duration-[1000ms] ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'bg-white border-white shadow-xl' : 'animate-sanctuary-cycle border-white shadow-[0_50px_120px_rgba(0,0,0,0.15)]'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-2">
                                            <span className={`text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2 drop-shadow-sm ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'text-accent' : 'text-[#3b2b1d]/60'}`}>
                                                {currentCard.type === 'content' && <Eye className="w-4 h-4" />}
                                                {currentCard.type === 'workflow' && <Brain className="w-4 h-4" />}
                                                {currentCard.type === 'competitor' && <TrendingUp className="w-4 h-4" />}
                                                {currentCard.type === 'monetization' && <DollarSign className="w-4 h-4" />}
                                                {currentCard.type === 'mental_health' && <Heart className="w-4 h-4" />}
                                                {currentCard.type}
                                            </span>
                                            <h3 className={`text-4xl font-black uppercase tracking-tighter leading-none drop-shadow-sm ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'text-accent' : 'text-[#121212]'}`}>{currentCard.title}</h3>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border whitespace-nowrap ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'bg-accent/20 text-accent border-accent/10' : 'bg-black/5 text-black/40 border-black/5'}`}>{activeIdx + 1} / {cards.length}</span>
                                    </div>

                                    <p className={`text-xl leading-relaxed font-semibold max-w-prose ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'text-accent/75' : 'text-[#3b2b1d]/85'}`}>
                                        {currentCard.description}
                                    </p>

                                    <div className={`p-8 md:p-10 rounded-[40px] border shadow-inner overflow-visible min-h-[120px] ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'bg-white/60 border-white/85' : 'bg-black/5 border-black/5'}`}>
                                        <p className={`text-sm leading-relaxed italic font-bold ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'text-accent/55' : 'text-[#3b2b1d]/75'}`}>
                                            <strong className={typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'text-accent/85 opacity-70' : 'text-[#121212] opacity-90'}>The Symposium Debated:</strong> {currentCard.debateLog}
                                        </p>
                                    </div>

                                    {/* Action Matrix */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.entries(currentCard.actionMatrix).map(([key, val]) => (
                                            <div key={key} className={`p-4 border rounded-[32px] flex flex-col items-center gap-1.5 shadow-sm transition-transform hover:scale-[1.02] ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'bg-white/50 border-white/90' : 'bg-white/40 border-white/40'}`}>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'text-accent/40' : 'text-[#3b2b1d]/40'}`}>{key}</span>
                                                <span className={`text-[11px] font-black uppercase ${val === 'high' ? (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "pokopia" ? "text-accent" : "text-[#121212]") : val === 'med' ? 'text-orange-600' : 'text-green-700'}`}>{val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Decision Buttons */}                                    <div className="grid grid-cols-3 gap-6 mt-4 p-2 bg-black/5 rounded-[48px]">
                                        <button 
                                            onClick={() => handleAction('no')}
                                            title="Archive this idea"
                                            className={`h-20 flex items-center justify-center border-2 rounded-[36px] transition-all shadow-xl group ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'bg-white border-red-200 text-red-500 hover:bg-red-50' : 'bg-white border-white/20 text-red-500 hover:bg-red-50 shadow-[0_10px_30px_rgba(239,68,68,0.2)]'}`}
                                        >
                                            <X className="w-10 h-10 group-hover:scale-110 transition-transform" />
                                        </button>
                                        <button 
                                            onClick={() => handleAction('maybe')}
                                            title="Keep in Session Log for later"
                                            className={`h-20 flex items-center justify-center border-2 rounded-[36px] transition-all font-black text-[12px] uppercase tracking-[0.3em] shadow-xl active:scale-95 ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'bg-white border-blue-200 text-blue-500 hover:bg-blue-50' : 'bg-white border-white/20 text-blue-500 hover:bg-blue-50 shadow-[0_10px_30px_rgba(59,130,246,0.2)]'}`}
                                        >
                                            Maybe
                                        </button>
                                        <button 
                                            onClick={() => handleAction('yes')}
                                            title="Add to Roadmap & Action Plan"
                                            className={`h-20 flex items-center justify-center rounded-[36px] shadow-[0_20px_60px_rgba(255,51,102,0.4)] hover:scale-[1.05] active:scale-[0.95] transition-all border-2 border-white/20 ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'bg-accent text-white' : 'bg-accent text-white'}`}
                                        >
                                            <Check className="w-10 h-10" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`flex flex-col items-center gap-8 p-20 rounded-[48px] text-center ${typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'pokopia' ? 'bg-white border-white' : 'bg-white/20 border-white/40 backdrop-blur-sm'}`}>
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

                    {/* 2. PERSISTENT DECISION LIST */}
                    {history.length > 0 && (
                        <div className="flex flex-col gap-8 p-12 bg-white/40 border border-white/60 rounded-[64px] backdrop-blur-2xl animate-in fade-in duration-1000 shadow-[0_30px_80px_rgba(255,51,102,0.08)]">
                            <div className="flex items-center justify-between pb-6 border-b border-accent/10">
                                <div className="flex items-center gap-3">
                                    <Bookmark className="w-5 h-5 text-accent" />
                                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-accent/60">Session Log: Evolution</h4>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-accent/30 bg-accent/5 px-3 py-1 rounded-full border border-accent/10">Archive: Roadmap + Session</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {history.map(card => (
                                    <button 
                                        key={card.id} 
                                        onClick={() => setSelectedDetail(card)}
                                        className="flex items-center gap-4 p-6 bg-white/60 rounded-[40px] border border-white/80 hover:bg-white transition-all text-left shadow-sm group hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${card.status === 'yes' ? 'bg-green-100/50' : 'bg-blue-100/50'}`}>
                                            {card.status === 'yes' ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Bookmark className="w-4 h-4 text-blue-500" />
                                            )}
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-accent/80 group-hover:text-accent transition-colors truncate">{card.title}</span>
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-accent/30">{card.status === 'yes' ? 'Live in Roadmap' : 'Session Intent'}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-accent/20 group-hover:text-accent/60 group-hover:translate-x-1 transition-all" />
                                    </button>
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

            {/* DETAIL VIEW MODAL */}
            {selectedDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-accent/20 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-3xl rounded-[48px] border border-white p-12 shadow-[0_50px_100px_rgba(255,51,102,0.2)] animate-in zoom-in-95 duration-300">
                        <button 
                            onClick={() => setSelectedDetail(null)}
                            className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-accent/10 rounded-full text-accent hover:bg-accent hover:text-white transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex flex-col gap-8 text-accent">
                            <div className="flex flex-col gap-2">
                                <span className="text-[12px] font-black uppercase tracking-[0.3em] text-accent/40">{selectedDetail.type}</span>
                                <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">{selectedDetail.title}</h3>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="p-8 bg-accent/5 rounded-[32px] border border-accent/10">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-accent/40 mb-3">Proposal Detail</h4>
                                    <p className="text-lg font-semibold leading-relaxed text-accent/80">{selectedDetail.description}</p>
                                </div>

                                <div className="p-8 bg-white border border-accent/10 rounded-[32px] shadow-inner">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-accent/40 mb-3">The Symposium Debate</h4>
                                    <p className="text-sm font-bold leading-relaxed text-accent/60 italic">{selectedDetail.debateLog}</p>
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
