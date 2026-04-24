"use client"

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Loader2, Sparkles, Check, Copy, LayoutGrid, Smartphone, Laptop, Users, ShieldAlert } from 'lucide-react';
import StatusButton from './StatusButton';

// Basic markdown parser
const MarkdownRenderer = ({ content }: { content: string }) => {
    if (!content || typeof content !== 'string') return <p className="text-sm italic opacity-40">Empty content</p>;
    
    const lines = content.split('\n');
    return (
        <div className="space-y-3">
            {lines.map((line, i) => {
                const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
                if (headerMatch) {
                    const level = headerMatch[1].length;
                    const text = headerMatch[2];
                    const Tag = `h${level}` as any;
                    return <Tag key={i} className={`font-bold text-white/90 ${level === 1 ? 'text-xl' : 'text-lg'}`}>{text}</Tag>;
                }
                const listMatch = line.match(/^(\s*[-*])\s+(.*)$/);
                if (listMatch) {
                    return <div key={i} className="flex items-start gap-2 ml-2"><span className="text-accent">•</span><span>{listMatch[2]}</span></div>;
                }
                if (line.trim() === '') return <div key={i} className="h-1"></div>;
                return <p key={i} className="leading-relaxed text-sm">{line}</p>;
            })}
        </div>
    );
};

export default function DistroOptimizer({ theme, mode = 'kirbai' }: { theme?: string; mode?: string }) {
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [platforms, setPlatforms] = useState<{tiktok: string, youtube: string, instagram: string, facebook: string} | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // 1. Load Session on Mount
    useEffect(() => {
        const loadSession = async () => {
            try {
                const res = await fetch(`/api/distro/chat?mode=${mode}`);
                const data = await res.json();
                if (data.messages) setMessages(data.messages);
                if (data.platforms) setPlatforms(data.platforms);
            } catch (e) {
                console.error("Failed to load distro session");
            } finally {
                setIsLoadingSession(false);
            }
        };
        loadSession();
    }, [mode]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        
        setIsGenerating(true);
        const newMessages = [...messages, { role: 'user' as const, text: prompt }];
        setMessages(newMessages);
        setPrompt("");
        
        try {
            const res = await fetch('/api/distro/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, mode })
            });
            const data = await res.json();
            
            if (data.success) {
                setMessages([...newMessages, { role: 'ai', text: data.reply }]);
                if (data.platforms) setPlatforms(data.platforms);
            } else {
                 setMessages([...newMessages, { role: 'ai', text: "Error: " + (data.error || "Failed to generate") }]);
            }
        } catch (error) {
             setMessages([...newMessages, { role: 'ai', text: "Connection error." }]);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isGenerating]);

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const PlatformCard = ({ title, content, id, platform }: { title: string, content: string, id: string, platform: string }) => {
        return (
            <div className={`bg-surface border border-border/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl group transition-all hover:border-accent/30 ${!content && 'opacity-30 p-8 border-dashed'}`}>
                {!content ? (
                    <div className="flex flex-col items-center justify-center text-center gap-2 py-8">
                         <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                            {platform === 'tiktok' ? <Smartphone className="w-5 h-5 opacity-20" /> : 
                             platform === 'youtube' ? <Laptop className="w-5 h-5 opacity-20" /> :
                             platform === 'instagram' ? <Users className="w-5 h-5 opacity-20" /> :
                             <LayoutGrid className="w-5 h-5 opacity-20" />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-20">{title} STANDBY</span>
                    </div>
                ) : (
                    <>
                        <div className="bg-black/40 px-6 py-4 border-b border-border/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent ring-1 ring-accent/20">
                                     {platform === 'tiktok' ? 't' : platform === 'instagram' ? 'i' : platform === 'youtube' ? 'y' : 'f'}
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-white/90">{title} Profile</span>
                            </div>
                            <button 
                                onClick={() => handleCopy(content, id)}
                                className="text-foreground/40 hover:text-white transition-colors p-2 bg-white/5 rounded-xl hover:bg-accent/20"
                            >
                                {copiedKey === id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="p-6 flex-1 bg-gradient-to-b from-black/20 to-transparent">
                            <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner min-h-[220px]">
                                <p className="text-[13px] font-sans leading-relaxed text-foreground/80 whitespace-pre-wrap select-text">
                                    {content}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="w-full min-h-[850px] flex flex-col lg:flex-row gap-8 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            
            {/* Left Pane: The Strategist Chat */}
            <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col gap-4 sticky top-24 self-start">
                <div className="bg-surface border border-border/10 rounded-[40px] p-8 flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] h-[800px] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-40 bg-accent/10 blur-[60px] -z-10 animate-pulse duration-[5000ms]" />
                    
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
                         <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(255,51,102,0.3)]">
                            <Bot className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-white leading-none">Description Generator</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Context: Radar Online</span>
                            </div>
                        </div>
                    </div>

                    {/* Chat Log */}
                    <div className="flex-1 overflow-y-auto pr-3 flex flex-col gap-6 mb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                         {isLoadingSession ? (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                                <Loader2 className="w-10 h-10 animate-spin" />
                            </div>
                         ) : messages.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                                <Sparkles className="w-16 h-16 animate-gentle-bounce text-accent" />
                                <div className="space-y-2">
                                    <p className="text-xl font-bold text-white uppercase tracking-tighter">Strategizing Distribution</p>
                                    <p className="text-sm max-w-[280px] mx-auto leading-relaxed">
                                        Drop your concept or script. I'll search current trends and match your Radar's rivals automatically.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                    <div className={`max-w-[90%] rounded-3xl p-5 ${
                                        msg.role === 'user' 
                                            ? 'bg-accent/10 border border-accent/20 text-foreground/90 rounded-br-none shadow-lg' 
                                            : 'bg-white/5 border border-white/10 text-foreground/90 rounded-tl-none font-sans leading-relaxed'
                                    }`}>
                                        {msg.role === 'user' ? (
                                            <p className="text-base font-medium">{msg.text || ""}</p>
                                        ) : (
                                            <div className="space-y-1">
                                                <MarkdownRenderer content={msg.text || ""} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {isGenerating && (
                             <div className="flex justify-start animate-in fade-in">
                                 <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-none p-5 flex items-center gap-3 w-fit text-accent shadow-xl ring-1 ring-accent/20">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-[11px] uppercase tracking-widest font-black">Cycling AI Providers...</span>
                                 </div>
                             </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Block */}
                    <div className="relative mt-auto pt-6 border-t border-white/5">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                            placeholder="Improve the TikTok hook..."
                            className="w-full text-[15px] bg-black/60 border border-border/20 rounded-[24px] py-5 pl-6 pr-16 resize-none h-28 focus:outline-none focus:border-accent/50 text-white placeholder:text-foreground/30 font-sans shadow-2xl transition-all"
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={!prompt.trim() || isGenerating}
                            className="absolute bottom-10 right-10 w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center hover:bg-accent/80 disabled:opacity-50 shadow-2xl transition-all scale-100 active:scale-95"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Pane: Matrix Matrix */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <LayoutGrid className="w-6 h-6 text-accent" />
                        <h3 className="text-[13px] font-black uppercase tracking-[0.4em] text-foreground/60">Distribution Matrix</h3>
                    </div>
                    {platforms && (
                        <div className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full">
                            <ShieldAlert className="w-3 h-3" /> Rivals Analyzed
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    <PlatformCard title="TikTok" content={platforms?.tiktok || ""} id="tt" platform="tiktok" />
                    <PlatformCard title="Instagram Reels" content={platforms?.instagram || ""} id="ig" platform="instagram" />
                    <PlatformCard title="YouTube Shorts" content={platforms?.youtube || ""} id="yt" platform="youtube" />
                    <PlatformCard title="Facebook Feed" content={platforms?.facebook || ""} id="fb" platform="facebook" />
                </div>
            </div>

        </div>
    );
}
