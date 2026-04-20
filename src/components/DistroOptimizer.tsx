"use client"

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Loader2, Sparkles, Check, Copy, RefreshCw, LayoutGrid } from 'lucide-react';
import StatusButton from './StatusButton';

// Basic markdown parser
const MarkdownRenderer = ({ content }: { content: string }) => {
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
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

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

    const PlatformCard = ({ title, content, id }: { title: string, content: string, id: string }) => {
        if (!content) return null;
        return (
            <div className="bg-surface border border-border/10 rounded-2xl flex flex-col overflow-hidden shadow-xl group">
                <div className="bg-black/20 px-4 py-3 border-b border-border/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent">{title}</span>
                    <button 
                        onClick={() => handleCopy(content, id)}
                        className="text-foreground/40 hover:text-white transition-colors p-1"
                    >
                        {copiedKey === id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
                <div className="p-4 flex-1">
                    <textarea 
                        readOnly
                        value={content}
                        className="w-full h-full min-h-[150px] bg-transparent resize-none text-[13px] font-mono leading-relaxed text-foreground/80 focus:outline-none"
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="w-full min-h-[800px] flex flex-col lg:flex-row gap-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Left Pane: The Chatbot (Google Grounded) */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
                <div className="bg-surface border border-border/10 rounded-3xl p-6 flex flex-col shadow-2xl h-[800px] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-32 bg-accent/5 blur-[50px] -z-10" />
                    
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                         <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/20">
                            <Bot className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">Description Generator</h2>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/50 mt-0.5 text-green-400">
                                Live Search Active
                            </p>
                        </div>
                    </div>

                    {/* Chat Log */}
                    <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 mb-4">
                         {messages.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-foreground/20 space-y-3 opacity-60">
                                <SearchIcon className="w-10 h-10 mb-2 opacity-50" />
                                <p className="text-center text-sm px-4">
                                    Describe your video, paste a script, or drop an IG caption. I'll search current trends and generate optimized versions.
                                </p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] rounded-2xl p-4 ${
                                        msg.role === 'user' 
                                            ? 'bg-accent/10 border border-accent/20 text-foreground/90 rounded-br-none' 
                                            : 'bg-white/5 border border-white/10 text-foreground/90 rounded-tl-none'
                                    }`}>
                                        {msg.role === 'user' ? (
                                            <p className="text-sm">{msg.text}</p>
                                        ) : (
                                            <MarkdownRenderer content={msg.text} />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {isGenerating && (
                             <div className="flex justify-start">
                                 <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 w-fit text-accent">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-[10px] uppercase tracking-widest font-bold">Researching & Optimizing...</span>
                                 </div>
                             </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Block */}
                    <div className="relative mt-auto">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                            placeholder="e.g. Turn this script into an aggressive TikTok and search for drift phonk hashtags..."
                            className="w-full text-sm bg-black/40 border border-border/20 rounded-xl py-4 pl-4 pr-16 resize-none h-24 focus:outline-none focus:border-accent/40 text-foreground placeholder:text-foreground/30 font-sans shadow-inner"
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={!prompt.trim() || isGenerating}
                            className="absolute bottom-4 right-4 w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent/80 disabled:opacity-50 shadow-lg"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Pane: Output Matrix */}
            <div className="w-full lg:w-2/3">
                {!platforms ? (
                     <div className="w-full h-full min-h-[400px] border border-dashed border-border/20 rounded-3xl flex flex-col items-center justify-center text-foreground/30">
                         <LayoutGrid className="w-12 h-12 mb-4 opacity-20" />
                         <span className="text-xs uppercase tracking-widest font-black opacity-50">Output Matrix Standing By</span>
                     </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                        <PlatformCard title="TikTok" content={platforms.tiktok} id="tt" />
                        <PlatformCard title="Instagram Reels" content={platforms.instagram} id="ig" />
                        <PlatformCard title="YouTube Shorts" content={platforms.youtube} id="yt" />
                        <PlatformCard title="Facebook" content={platforms.facebook} id="fb" />
                    </div>
                )}
            </div>

        </div>
    );
}

function SearchIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    )
}
