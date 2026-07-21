"use client"

import { useState, useEffect } from 'react';
import { Settings, Send, Bot, Loader2, Sparkles, Check, Copy, Trash2, Download } from 'lucide-react';
import StatusButton from './StatusButton';

// Basic zero-dependency markdown parser for AI Responses
const MarkdownRenderer = ({ content }: { content: string }) => {
    if (!content || typeof content !== 'string') return null;
    // Split by lines to handle block elements (headers, lists)
    const lines = content.split('\n');
    let inList = false;

    return (
        <div className="space-y-3">
            {lines.map((line, i) => {
                // Headers (e.g., #### Tracklist)
                const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
                if (headerMatch) {
                    const level = headerMatch[1].length;
                    const text = headerMatch[2];
                    inList = false;
                    const HeaderTag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
                    const sizes: Record<number, string> = {
                        1: 'text-[22px] font-extrabold tracking-tight text-foreground mt-8 mb-4',
                        2: 'text-lg font-bold text-foreground/90 mt-6 mb-3',
                        3: 'text-base font-bold text-foreground/80 mt-5 mb-2',
                        4: 'text-sm font-semibold uppercase tracking-wider text-accent mt-4 mb-2',
                        5: 'text-sm font-semibold text-foreground/70 mt-3 mb-1',
                        6: 'section-subtitle mt-2 mb-1'
                    };
                    return <HeaderTag key={i} className={sizes[level]}>{parseInlineLinks(text)}</HeaderTag>;
                }

                // Bullet Points (e.g., * Item or - Item)
                const listMatch = line.match(/^(\s*[-*])\s+(.*)$/);
                if (listMatch) {
                    const text = listMatch[2];
                    const element = (
                        <li key={i} className="flex items-start gap-3 ml-2 mb-2">
                           <span className="text-accent mt-1 text-lg leading-none">•</span>
                           <span>{parseInlineLinks(text)}</span>
                        </li>
                    );
                    
                    if (!inList) {
                        inList = true;
                        return <ul key={`ul-${i}`} className="my-2">{element}</ul>;
                    }
                    return element;
                }

                // Close list if we are no longer matching bullets
                if (line.trim() !== '') {
                    inList = false;
                }

                // Horizontal Rules (e.g., ---)
                if (line.match(/^_{3,}$|^-{3,}$|^\*{3,}$/)) {
                    inList = false;
                    return <hr key={i} className="my-6 border-border" />;
                }

                // Normal Paragraphs
                if (line.trim() === '') return <div key={i} className="h-2"></div>;
                return <p key={i} className="leading-relaxed">{parseInlineLinks(line)}</p>;
            })}
        </div>
    );
};

// Helper: Parse inline bold (**text**) and italics (*text* or _text_)
const parseInlineLinks = (text: string) => {
    if (!text || typeof text !== 'string') return text;
    // 1. Bold: **text**
    let parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
        }
        
        // 2. Italics inside the non-bold parts: *text* or _text_
        let subParts = part.split(/(\*[^*]+\*|_[^_]+_)/g);
        return <span key={index}>
            {subParts.map((sub, j) => {
                if ((sub.startsWith('*') && sub.endsWith('*')) || (sub.startsWith('_') && sub.endsWith('_'))) {
                   return <em key={j} className="italic text-foreground/80">{sub.slice(1, -1)}</em>;
                }
                return sub;
            })}
        </span>;
    });
};

export default function AIHub({ theme }: { theme?: string }) {
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Load Chat Memory on mount
    useEffect(() => {
        setIsMounted(true);
        const stored = localStorage.getItem('kirbai_chat_v1');
        const lastActive = localStorage.getItem('kirbai_chat_last_active');
        
        if (stored && lastActive) {
            const now = Date.now();
            const then = parseInt(lastActive, 10);
            const hoursSince = (now - then) / (1000 * 60 * 60);
            
            // Expiration: 24 hours
            if (hoursSince > 24) {
                localStorage.removeItem('kirbai_chat_v1');
                localStorage.removeItem('kirbai_chat_last_active');
            } else {
                try {
                    setMessages(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse chat memory");
                }
            }
        }
    }, []);

    // Save Chat Memory on change
    useEffect(() => {
        if (!isMounted) return;
        if (messages.length > 0) {
            localStorage.setItem('kirbai_chat_v1', JSON.stringify(messages));
            localStorage.setItem('kirbai_chat_last_active', Date.now().toString());
        }
    }, [messages, isMounted]);

    const handleClearMemory = () => {
        setMessages([]);
        localStorage.removeItem('kirbai_chat_v1');
        localStorage.removeItem('kirbai_chat_last_active');
        setPrompt("");
    };

    // Initialize Speech Recognition
    let recognition: any = null;
    if (typeof window !== 'undefined') {
        const anyWindow = window as any;
        if (anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition) {
            const SpeechRecognition = anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setPrompt(prev => prev + (prev.length > 0 ? ' ' : '') + transcript);
            // Optionally auto-submit when dictation finishes
            setIsListening(false);
        };

        recognition.onerror = () => {
             setIsListening(false);
        };

        recognition.onend = () => {
             setIsListening(false);
        };
        }
    }

    const toggleListen = () => {
        if (!recognition) return alert("Your browser does not support Speech Recognition.");
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
        }
    };

    const handleGenerate = async (forcedPrompt?: string) => {
        const textToSubmit = forcedPrompt || prompt;
        if (!textToSubmit.trim()) return;
        
        setIsGenerating(true);
        const newMessages = [...messages, { role: 'user' as const, text: textToSubmit }];
        setMessages(newMessages); // Immediately show user's message
        setPrompt("");
        
        try {
            // We now send the ENTIRE array of conversation history so the AI remembers the context
            const res = await fetch('/api/generate-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages })
            });
            const data = await res.json();
            
            if (data.result) {
                setMessages([...newMessages, { role: 'ai', text: data.result }]);
            } else {
                 setMessages([...newMessages, { role: 'ai', text: "Error: " + (data.error || "Failed to generate") }]);
            }
        } catch (error) {
             setMessages([...newMessages, { role: 'ai', text: "Connection error." }]);
        } finally {
            setIsGenerating(false);
            // Auto scroll to bottom would go here
        }
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="w-full h-full min-h-[800px] flex gap-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* The Chat Interface */}
            <div className="card w-full p-8 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] -z-10 group-hover:bg-accent/10 transition-colors duration-1000 translate-x-1/4 -translate-y-1/4"></div>
                
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[var(--btn-radius)] bg-accent/20 flex items-center justify-center border border-accent/20 shadow-inner">
                            <Bot className="w-7 h-7 text-accent" />
                        </div>
                        <div>
                            <h2 className="section-title">Kirbai Intelligence Matrix</h2>
                            <p className="section-subtitle mt-1 flex items-center gap-2">
                                <span className={isListening ? "w-2 h-2 rounded-full bg-red-500 animate-pulse" : "w-2 h-2 rounded-full bg-accent/50 pulse-dot"}></span>
                                {isListening ? "Audio Input Active..." : "Progressive Memory Active"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={async () => {
                                const res = await fetch('/api/export-context');
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `kirbai_context_${new Date().toISOString().slice(0,10)}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="btn-ghost text-xs px-4 py-2 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-2 h-fit rounded-full"
                        >
                            <Download className="w-3 h-3" /> Export .txt
                        </button>
                        {messages.length > 0 && (
                            <button 
                                onClick={handleClearMemory}
                                className="btn-ghost text-xs px-4 py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 flex items-center gap-2 h-fit rounded-full"
                            >
                                <Trash2 className="w-3 h-3" /> Clear Memory
                            </button>
                        )}
                    </div>
                </div>

                {/* Output Area - Now a list of messages */}
                <div className="flex-1 bg-surface/60 border border-border rounded-[var(--card-radius)] p-8 mb-6 overflow-y-auto relative shadow-inner flex flex-col gap-6">
                    {messages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-foreground/20 space-y-4">
                            <Sparkles className="w-16 h-16 mb-4 opacity-30 group-hover:opacity-60 transition-opacity" />
                            <p className="text-center max-w-md text-lg font-medium opacity-60">
                                This is a progressive chat. I remember the context of our conversation. Ask me anything, or click the mic to speak.
                            </p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-[var(--card-radius)] p-6 relative group/msg ${
                                    msg.role === 'user' 
                                        ? 'bg-accent/10 border border-accent/20 text-foreground rounded-br-none' 
                                        : 'bg-surface border border-border text-foreground font-sans text-[15px] leading-relaxed rounded-tl-none'
                                }`}>
                                    {msg.role === 'user' ? (
                                        <p className="text-lg">{msg.text || ""}</p>
                                    ) : (
                                        <div className="pr-8">
                                            <MarkdownRenderer content={msg.text || ""} />
                                            <button 
                                                onClick={() => handleCopy(msg.text, idx)}
                                                className="absolute top-4 right-4 p-2 bg-surface/80 border border-border rounded-lg opacity-0 group-hover/msg:opacity-100 hover:text-accent transition-all text-foreground/40"
                                            >
                                                {copiedIndex === idx ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                     {isGenerating && (
                         <div className="flex justify-start">
                             <div className="bg-surface border border-border rounded-[var(--card-radius)] rounded-tl-none p-6 flex items-center gap-3 w-fit text-accent">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="section-subtitle !mt-0 font-bold">Synthesizing...</span>
                             </div>
                         </div>
                     )}
                </div>

                {/* Input Area */}
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
                        placeholder="Type a command or use vocal dictation..."
                        className="input-field w-full text-lg py-6 pl-6 pr-32 resize-none h-32"
                    />
                    
                    {/* Controls */}
                    <div className="absolute bottom-6 right-6 flex items-center gap-3">
                        {/* Mic Button */}
                        <button 
                            onClick={toggleListen}
                            type="button"
                            className={`w-12 h-12 rounded-[var(--btn-radius)] flex items-center justify-center transition-all border ${
                                isListening 
                                    ? 'bg-red-500 text-white border-red-400 animate-pulse ring-4 ring-red-500/20' 
                                    : 'btn-secondary border-border/50 text-foreground/50 hover:text-foreground'
                            }`}
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                        </button>

                        {/* Send Button */}
                        <StatusButton 
                            onClick={() => handleGenerate()}
                            loading={isGenerating}
                            disabled={!prompt.trim()}
                            loadingText=""
                            className="btn-primary w-12 h-12 flex items-center justify-center !p-0"
                            icon={<Send className="w-5 h-5" />}
                        />
                    </div>
                </div>
            </div>
            
        </div>
    );
}
