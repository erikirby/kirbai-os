"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "@/components/Icons";

export default function IntelInbox() {
    const [intel, setIntel] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchIntel = async () => {
            try {
                const res = await fetch("/api/youtube-intel");
                const data = await res.json();
                setIntel(data.intel || []);
            } catch (err) {
                console.error("Failed to fetch intel", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchIntel();
    }, []);

    return (
        <div className="flex flex-col h-full pl-0">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center justify-between border-b border-border pb-4 mb-6">
                Intel Aggregator
                <span className="text-xs font-mono text-neutral-500 bg-surface px-2 py-1 rounded-sm border border-border">Live Feed</span>
            </h2>

            {/* Quick Access Utility Bar */}
            <div className="flex flex-col gap-2 mb-8 bg-surface/50 border border-border/50 p-3 rounded-sm">
                <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">Quick Access Command</h3>
                <div className="grid grid-cols-2 gap-2">
                    <a href="https://skool.com" target="_blank" rel="noopener noreferrer" className="bg-black/40 hover:bg-black border border-border/40 hover:border-accent/30 text-xs text-neutral-300 py-2 text-center rounded-sm transition-all focus:outline-none">
                        Skool Community
                    </a>
                    <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="bg-black/40 hover:bg-black border border-border/40 hover:border-accent/30 text-xs text-neutral-300 py-2 text-center rounded-sm transition-all focus:outline-none">
                        YouTube Channels
                    </a>
                    <button className="col-span-2 bg-black/40 hover:bg-black border border-border/40 hover:border-neutral-500 text-[10px] text-neutral-500 py-1.5 text-center transition-all focus:outline-none uppercase tracking-widest">
                        Configure Gmail Webhook (V2)
                    </button>
                </div>
            </div>

            {/* Dynamic Intel Feed */}
            <div className="flex flex-col gap-6 overflow-y-auto pb-20 pr-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10 text-neutral-500 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs uppercase tracking-wider font-semibold">Syncing Feeds...</span>
                    </div>
                ) : intel.length === 0 ? (
                    <p className="text-sm text-neutral-500 italic">Inbox is empty. All intel processed.</p>
                ) : (
                    intel.map((item) => (
                        <div key={item.id} className="flex flex-col gap-3 group">
                            <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-sm uppercase ${item.tag === "KIRBAI" ? "bg-accent/10 border border-accent/20 text-accent" : "bg-neutral-800 border border-neutral-700 text-neutral-300"}`}>
                                    [{item.tag}]
                                </span>
                                <span className="text-[10px] font-mono text-neutral-600">{item.date}</span>
                            </div>

                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white group-hover:text-accent transition-colors leading-tight">
                                {item.title}
                            </a>

                            <p className="text-xs text-neutral-400 leading-relaxed">
                                {item.summary}
                            </p>

                            <div className="bg-black/50 border border-accent/20 border-l-2 border-l-accent p-3 mt-1 flex flex-col gap-2">
                                <span className="text-[10px] uppercase font-bold text-accent tracking-widest">Action Items:</span>
                                <ul className="list-disc pl-4 flex flex-col gap-1">
                                    {item.actionItems.map((action: string, idx: number) => (
                                        <li key={idx} className="text-xs text-neutral-300 font-medium">{action}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="w-full h-px bg-border/50 mt-2 line-last-hidden"></div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
