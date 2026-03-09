export default function IntelInbox() {
    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                    Intel Inbox
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                </h2>
            </div>

            <div className="flex flex-col gap-6">
                {/* Item 1 */}
                <div className="flex gap-4">
                    <div className="w-0.5 bg-accent/30 mt-1"></div>
                    <div>
                        <div className="flex justify-between text-xs text-neutral-500 mb-1 font-mono items-center">
                            <span className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-accent border border-accent/30 px-1 py-0.5 bg-accent/10">[KIRBAI]</span>
                                SYS_AGENT_01
                            </span>
                            <span>10m ago</span>
                        </div>
                        <h4 className="font-medium text-sm text-foreground mb-1 hover:text-accent transition-colors cursor-pointer">Pokémon VGC Meta Shift</h4>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                            Ogerpon usage rate dropping by 12% in recent regionals. Strong pivot to Incineroar + Raging Bolt core. Recommend content addressing this shift immediately.
                        </p>
                    </div>
                </div>

                {/* Item 2 */}
                <div className="flex gap-4">
                    <div className="w-0.5 bg-border mt-1"></div>
                    <div>
                        <div className="flex justify-between text-xs text-neutral-500 mb-1 font-mono items-center">
                            <span className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-neutral-400 border border-neutral-600 px-1 py-0.5">[FACTORY]</span>
                                GUERRILLA_AI
                            </span>
                            <span>2h ago</span>
                        </div>
                        <h4 className="font-medium text-sm text-foreground mb-1 hover:text-accent transition-colors cursor-pointer">Competitor Vid Analysis</h4>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                            "Why Gen 5 is actually terrible" reaching 150k views in 4 hours. Hook structure relies heavily on emotional contradiction. Focus AELOW keyword farming around Gen 5 nostalgia.
                        </p>
                    </div>
                </div>

                {/* Item 3 */}
                <div className="flex gap-4">
                    <div className="w-0.5 bg-border mt-1"></div>
                    <div>
                        <div className="flex justify-between text-xs text-neutral-500 mb-1 font-mono items-center">
                            <span className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-neutral-400 border border-neutral-600 px-1 py-0.5">[FACTORY]</span>
                                ALBUM_SYNC
                            </span>
                            <span>12h ago</span>
                        </div>
                        <h4 className="font-medium text-sm text-foreground mb-1 hover:text-accent transition-colors cursor-pointer">Platform Playlist Added</h4>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                            New KURAO release caught by algorithmic curated playlist "Midnight Drives". Impressions up 45%.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
