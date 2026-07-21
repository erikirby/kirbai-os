"use client"

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Terminal,
  Play,
  Brain,
  Dna,
  ShieldCheck,
  Zap,
  MessageSquare,
  History,
  RotateCcw,
  Scale,
  Bot
} from 'lucide-react';
import StatusButton from './StatusButton';
import { AGENTS, AgentConfig } from '@/config/agents';

export default function Boardroom({ mode }: { mode: string }) {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feed, setFeed] = useState<{ agent: string, text: string, type: 'thought' | 'action' | 'brief' | 'conflict' | 'referee' | 'risk', agentId?: string }[]>([]);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [consensus, setConsensus] = useState(100);
  const [stressLevels, setStressLevels] = useState<Record<string, number>>({});
  const [showRefereePanel, setShowRefereePanel] = useState(false);
  const [refereeInput, setRefereeInput] = useState("");
  const [latestBrief, setLatestBrief] = useState<string | null>(null);
  const [ledger, setLedger] = useState<{ id: string, timestamp: string, decision: string, type: 'fact' | 'decision' }[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feed]);

  useEffect(() => {
    const fetchLedger = async () => {
      const res = await fetch('/api/boardroom/ledger');
      if (res.ok) {
        const data = await res.json();
        setLedger(data);
      }
    };
    fetchLedger();
  }, []);

  const handleLaunchBoardroom = async (overridePrompt?: string, forceRuling?: boolean) => {
    const activePrompt = overridePrompt || prompt;
    if (!activePrompt.trim() && !forceRuling) return;
    
    setIsProcessing(true);
    const userMsg = forceRuling 
        ? { agent: 'You', text: "Requesting final ruling.", type: 'action' as const }
        : { agent: 'You', text: activePrompt, type: 'action' as const };
    setFeed(prev => [...prev, userMsg]);
    if (!overridePrompt) setPrompt(""); 
    setActiveAgents(['md']);
    setConsensus(100);
    setStressLevels({});
    setLatestBrief(null);
    
    try {
        const res = await fetch('/api/boardroom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: activePrompt || "Final ruling.", 
                mode,
                forceRuling,
                history: feed.map(f => ({ role: f.agent === 'Managing Director' ? 'assistant' : 'user', content: f.text }))
            })
        });

        if (!res.ok) throw new Error("Failed to sync with the Boardroom.");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = "";

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Buffer carry-over: a JSON line can be split across network chunks.
                streamBuffer += decoder.decode(value, { stream: true });
                const rawLines = streamBuffer.split('\n');
                streamBuffer = rawLines.pop() || ""; // keep incomplete tail for next chunk
                const lines = rawLines.filter(l => l.trim() !== '');

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.agent) {
                            setFeed(prev => [...prev, data]);
                            if (data.agentId) {
                                setActiveAgents(prev => [...new Set([...prev, data.agentId])]);
                                if (data.type === 'conflict') {
                                    setConsensus(prev => Math.max(10, prev - 15));
                                    setStressLevels(prev => ({ ...prev, [data.agentId]: (prev[data.agentId] || 0) + 30 }));
                                }
                                if (data.type === 'referee') {
                                    setShowRefereePanel(true);
                                }
                                if (data.type === 'brief') {
                                    setLatestBrief(data.text || "");
                                }
                                if (data.type === 'brief') setLatestBrief(data.text || "");
                                if (data.agent === 'System' && data.text.startsWith('PHASE 4')) {
                                    // Refresh ledger after lore logging
                                    const res = await fetch('/api/boardroom/ledger');
                                    if (res.ok) {
                                        const data = await res.json();
                                        setLedger(data);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Chunk parse error:", e);
                    }
                }
            }
        }
    } catch (error: any) {
        setFeed(prev => [...prev, { agent: 'System', text: `ERROR: ${error.message}`, type: 'action' }]);
        setPrompt("");
    } finally {
        setIsProcessing(false);
        setActiveAgents([]);
    }
  };

  const handleReviewLastMeeting = async () => {
    try {
        const res = await fetch('/api/boardroom/history');
        if (res.ok) {
            const data = await res.json();
            if (data.length > 0) {
                const last = data[0];
                setLatestBrief(last.brief);
                setFeed([{ agent: 'System', text: `Archived Meeting: ${last.prompt}`, type: 'action' }]);
            }
        }
    } catch (e) {
        console.error("Failed to fetch history:", e);
    }
  };

  const handleClearSession = () => {
    setFeed([]);
    setActiveAgents([]);
    setConsensus(100);
    setStressLevels({});
    setLatestBrief(null);
    setPrompt("");
  };

  const getDivisionColor = (division: string) => {
    switch(division) {
        case 'High-Command': return 'bg-accent';
        case 'Growth': return 'bg-green-500';
        case 'Lab': return 'bg-purple-500';
        case 'Operations': return 'bg-blue-500';
        default: return 'bg-white/10';
    }
  };

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* 0. Consensus Meter */}
      <div className="card w-full p-6 flex items-center gap-8 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          <div className="flex flex-col gap-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-accent" />
                  <span className="section-eyebrow">Boardroom Consensus</span>
              </div>
              <span className="section-subtitle">Alignment of the 4 Divisions</span>
          </div>
          <div className="flex-1 h-3 bg-surface/60 rounded-full border border-border overflow-hidden p-0.5">
              <div 
                  className={`h-full rounded-full transition-all duration-1000 shadow-lg ${
                      consensus > 70 ? 'bg-green-500' : consensus > 40 ? 'bg-orange-500' : 'bg-accent animate-pulse'
                  }`}
                  style={{ width: `${consensus}%` }}
              />
          </div>
          <div className="flex flex-col items-end min-w-[100px]">
              <span className={`stat-value transition-colors ${
                  consensus > 70 ? 'text-green-500' : consensus > 40 ? 'text-orange-500' : 'text-accent'
              }`}>
                  {consensus}%
              </span>
              <span className="stat-label">Weighted Sync</span>
          </div>
      </div>

      {/* 1. The War Room (3-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ALPHA: Specialist Roster (2 Columns) */}
        <div className="lg:col-span-2 flex flex-col gap-6 sticky top-8">
            <div className="flex flex-col gap-4">
                <h4 className="section-subtitle flex items-center gap-2 mb-2">
                    <Users className="w-3 h-3" /> Specialist Array
                </h4>
                <div className="grid grid-cols-1 gap-2">
                    {AGENTS.map(agent => {
                        const isActive = activeAgents.includes(agent.id);
                        const stress = stressLevels[agent.id] || 0;
                        const Icon = agent.icon;
                        return (
                            <div 
                                key={agent.id}
                                className={`card p-2 flex items-center gap-3 relative ${
                                    isActive 
                                        ? 'border-accent/40 shadow-[0_0_15px_rgba(255,51,102,0.1)]' 
                                        : 'border-border'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-[var(--btn-radius)] flex items-center justify-center relative ${isActive ? 'bg-accent text-white' : 'bg-surface/60 text-foreground/40'}`}>
                                    <Icon className="w-4 h-4" />
                                    <div className={`absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-surface ${getDivisionColor(agent.division)}`} title={agent.division} />
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className={`text-xs font-bold uppercase tracking-widest ${isActive ? 'text-accent' : 'text-foreground/60'}`}>
                                        {agent.name.split(' ')[0]}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-accent animate-pulse' : 'bg-foreground/10'}`} />
                                        <span className="text-[9px] font-semibold uppercase opacity-50">{isActive ? 'Active' : 'Idle'}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleLaunchBoardroom(`@[${agent.id}] Give me your specific take on this.`)}
                                    disabled={isProcessing}
                                    className="btn-ghost w-6 h-6 !p-0 flex items-center justify-center disabled:opacity-0"
                                    title="Ask Opinion"
                                >
                                    <MessageSquare className="w-3 h-3" />
                                </button>
                                {stress > 30 && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="card p-4 flex flex-col gap-3">
                <button 
                    onClick={handleClearSession}
                    className="btn-secondary w-full flex items-center justify-center gap-2 group"
                >
                    <RotateCcw className="w-3 h-3 group-hover:rotate-180 transition-all duration-500" />
                    <span>New Meeting</span>
                </button>
                <button 
                    onClick={handleReviewLastMeeting}
                    className="btn-secondary w-full flex items-center justify-center gap-2 group"
                >
                    <History className="w-3 h-3" />
                    <span>Review Last</span>
                </button>
            </div>
        </div>

        {/* BRAVO: Live Audit Feed (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-h-[850px]">
            <div className="card p-8 flex flex-col relative overflow-hidden h-[750px]">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-accent" />
                        <h3 className="section-eyebrow !text-foreground/80">Strategy Audit Log</h3>
                    </div>
                </div>

                <div ref={feedRef} className="flex-1 overflow-y-auto pr-4 flex flex-col gap-4 custom-scrollbar">
                    {feed.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-foreground/20">
                            <Bot className="w-16 h-16 mb-4 animate-pulse opacity-50" />
                            <p className="section-subtitle">Ready for Directive</p>
                        </div>
                    ) : (
                        feed.filter(f => f.type !== 'brief').map((line, idx) => {
                            const isUser = line.agent === 'You';
                            const isSystem = line.agent === 'System';
                            const agent = AGENTS.find(a => a.name === line.agent || a.id === line.agentId);
                            const Icon = agent?.icon || Bot;

                            if (isSystem) {
                                return (
                                    <div key={idx} className="flex justify-center my-2">
                                        <span className="badge">
                                            {line.text}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] ${isUser ? 'ml-auto' : 'mr-auto'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    {!isUser && (
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <div className="w-4 h-4 rounded-[var(--btn-radius)] bg-accent/20 flex items-center justify-center border border-accent/20">
                                                <Icon className="w-2.5 h-2.5 text-accent" />
                                            </div>
                                            <span className="section-eyebrow !text-foreground/40">{line.agent}</span>
                                        </div>
                                    )}
                                    <div className={`p-4 rounded-[var(--card-radius)] text-[13px] leading-relaxed font-medium shadow-sm border transition-all ${
                                        isUser 
                                            ? 'bg-accent text-white border-accent/20 rounded-tr-none' 
                                            : line.type === 'risk' 
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                                : line.type === 'referee'
                                                    ? 'bg-accent/10 text-accent italic border-accent/20'
                                                    : 'bg-surface border-border rounded-tl-none'
                                    }`}>
                                        {line.text || ""}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Input Module (Anchored to Feed) */}
            <div className="card p-6 flex flex-col gap-4">
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleLaunchBoardroom();
                        }
                    }}
                    placeholder={feed.length > 0 ? "Comment back..." : "Launch a project audit..."}
                    className="input-field w-full h-24 p-4 text-sm resize-none"
                />
                <div className="flex gap-3">
                    <StatusButton 
                        onClick={() => handleLaunchBoardroom()}
                        loading={isProcessing}
                        disabled={!prompt.trim()}
                        className="btn-primary flex-1 h-14 uppercase tracking-widest text-xs font-bold"
                    >
                        {feed.length > 0 ? 'Update Strategy' : 'Begin Audit'}
                    </StatusButton>
                    {feed.length > 0 && !latestBrief && (
                        <button 
                            onClick={() => handleLaunchBoardroom(undefined, true)}
                            disabled={isProcessing}
                            className="btn-secondary px-6 uppercase tracking-widest text-xs font-bold"
                        >
                            Force Ruling
                        </button>
                    )}
                </div>
            </div>
            
            {showRefereePanel && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-[var(--card-radius)] p-6 text-foreground animate-in zoom-in duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <Scale className="w-4 h-4 text-red-500" />
                        <span className="section-eyebrow !text-red-500">Conflict Detected</span>
                    </div>
                    {(() => {
                        const lastReferee = feed.filter(f => f.type === 'referee').slice(-1)[0];
                        if (!lastReferee) return null;
                        
                        let question = lastReferee.text;
                        let isBinary = true;
                        try {
                            const conflict = JSON.parse(lastReferee.text);
                            if (conflict.clash) question = conflict.clash;
                            if (conflict.binary !== undefined) isBinary = conflict.binary;
                        } catch (e) {
                            // Already set to lastReferee.text
                        }
 
                        return (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="section-subtitle">Strategic Fork</span>
                                    <p className="text-sm font-bold text-foreground leading-tight">{question}</p>
                                </div>
                                {isBinary ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => { 
                                                setShowRefereePanel(false); 
                                                setConsensus(100); 
                                                handleLaunchBoardroom(`The answer is YES. Now give me the final ruling.`);
                                            }} 
                                            className="btn-primary !bg-red-500 uppercase tracking-widest text-xs font-bold"
                                        >
                                            YES
                                        </button>
                                        <button 
                                            onClick={() => { 
                                                setShowRefereePanel(false); 
                                                setConsensus(80); 
                                                handleLaunchBoardroom(`The answer is NO. Now give me the final ruling.`);
                                            }} 
                                            className="btn-secondary uppercase tracking-widest text-xs font-bold"
                                        >
                                            NO
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={refereeInput}
                                            onChange={(e) => setRefereeInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && refereeInput.trim()) {
                                                    setShowRefereePanel(false);
                                                    handleLaunchBoardroom(`The fact is: ${refereeInput}. Now give me the final ruling.`);
                                                    setRefereeInput("");
                                                }
                                            }}
                                            placeholder="Provide the missing fact..."
                                            className="input-field flex-1 px-4 py-2 text-xs"
                                        />
                                        <button 
                                            onClick={() => {
                                                if (refereeInput.trim()) {
                                                    setShowRefereePanel(false);
                                                    handleLaunchBoardroom(`The fact is: ${refereeInput}. Now give me the final ruling.`);
                                                    setRefereeInput("");
                                                }
                                            }}
                                            className="btn-primary px-4 py-2 uppercase tracking-widest text-xs font-bold"
                                        >
                                            SEND
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>

        {/* CHARLIE: Strategic Briefing (3 Columns) */}
        <div className="lg:col-span-3 h-full">
            <div className="card p-8 h-[850px] overflow-y-auto custom-scrollbar sticky top-8">
                <div className="flex items-center justify-between mb-6 opacity-60">
                    <h3 className="section-eyebrow">Strategic Briefing</h3>
                    {feed.length > 0 && (
                        <button onClick={handleClearSession} className="text-[10px] font-bold uppercase tracking-widest text-accent hover:underline">
                            Reset
                        </button>
                    )}
                </div>
                
                {latestBrief ? (
                    <div className="flex flex-col gap-6 brief-content animate-in fade-in duration-1000">
                        {(latestBrief || "").split('\n').map((para, pIdx) => {
                            if (para.startsWith('# ')) return <h1 key={pIdx} className="section-title text-accent mb-4 border-b border-border pb-4">{para.replace('# ', '')}</h1>;
                            if (para.startsWith('## ')) return <h2 key={pIdx} className="section-subtitle mt-6 mb-2">{para.replace('## ', '')}</h2>;
                            if (para.startsWith('- ')) return <div key={pIdx} className="flex gap-2 items-start pl-2"><div className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0"></div><p className="text-sm text-foreground/70 font-medium leading-relaxed">{para.replace('- ', '')}</p></div>;
                            if (para.trim() === '') return null;
                            return <p key={pIdx} className="text-sm leading-relaxed text-foreground/80 font-medium">{para}</p>;
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <Dna className="w-12 h-12 mb-4" />
                        <p className="section-subtitle text-center">Awaiting Strategic Synthesis</p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
