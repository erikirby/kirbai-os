"use client";

import { useState } from "react";
import { Copy, Check, Loader2, Sparkles } from "@/components/Icons";

type GeneratedMetadata = {
    title: string;
    description: string;
};

export default function MetadataGenerator() {
    const [keyword, setKeyword] = useState("");
    const [alias, setAlias] = useState<"AELOW" | "KURAO">("AELOW");
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<GeneratedMetadata[]>([]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleGenerate = async () => {
        if (!keyword.trim()) return;

        setIsGenerating(true);
        setResults([]);

        try {
            const res = await fetch("/api/generate-metadata", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword, alias })
            });

            if (res.ok) {
                const data = await res.json();
                setResults(data.metadata || []);
            } else {
                console.error("Failed to generate metadata");
            }
        } catch (error) {
            console.error("Generation error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async (text: string, index: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    return (
        <div className="w-full h-full flex flex-col pt-12">
            <div className="flex flex-col gap-2 mb-8">
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    Automated SEO Metadata
                </h2>
                <p className="text-sm text-neutral-400">
                    Generate optimized titles and descriptions for Music Factory mass releases.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end mb-8">
                <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-xs font-semibold tracking-wider uppercase text-neutral-500">Core Target Keyword</label>
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="e.g. 'J-Pop Workout' or 'Dark Synthwave'"
                        className="bg-surface border border-border rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-neutral-600"
                        onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold tracking-wider uppercase text-neutral-500">Alias Target</label>
                    <div className="flex bg-surface border border-border rounded-sm overflow-hidden p-[2px]">
                        <button
                            onClick={() => setAlias("AELOW")}
                            className={`flex-1 text-xs font-semibold uppercase py-3 transition-colors rounded-sm ${alias === "AELOW" ? "bg-accent text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                        >
                            Aelow (Global)
                        </button>
                        <button
                            onClick={() => setAlias("KURAO")}
                            className={`flex-1 text-xs font-semibold uppercase py-3 transition-colors rounded-sm ${alias === "KURAO" ? "bg-accent text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                        >
                            Kurao (Japan)
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleGenerate}
                        disabled={!keyword.trim() || isGenerating}
                        className="w-full bg-accent hover:bg-[#ff1a53] disabled:bg-surface disabled:text-neutral-500 disabled:border disabled:border-border text-white px-6 py-3 rounded-sm text-sm font-semibold transition-colors flex items-center justify-center gap-2 h-[46px]"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            "Generate Pack"
                        )}
                    </button>
                </div>
            </div>

            {results.length > 0 && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                        <h3 className="text-sm font-semibold tracking-tight uppercase text-neutral-400">Generated Assets</h3>
                        <span className="text-xs text-neutral-500 font-mono">{results.length} variants created</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-20">
                        {results.map((item, index) => (
                            <div key={index} className="bg-surface border border-border rounded-sm p-5 flex flex-col gap-4 group hover:border-accent/40 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex flex-col gap-1 flex-1">
                                        <h4 className="font-bold text-white text-base leading-tight">{item.title}</h4>
                                        <p className="text-sm text-neutral-400 leading-relaxed mt-2">{item.description}</p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(`${item.title}\n\n${item.description}`, index)}
                                        className="text-neutral-500 hover:text-accent p-2 rounded-sm border border-transparent hover:border-accent/20 transition-all flex-shrink-0"
                                        title="Copy full metadata"
                                    >
                                        {copiedIndex === index ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
