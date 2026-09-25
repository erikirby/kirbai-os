"use client";

import { useState } from "react";
import AnalyticsMatrix from "@/components/AnalyticsMatrix";
import FinanceView from "@/components/FinanceView";
import RevenueEngine from "@/components/RevenueEngine";

type View = "overview" | "royalties" | "songs";

const VIEWS: { id: View; label: string; hint: string }[] = [
    { id: "overview", label: "Overview", hint: "Followers, views and reach across IG, FB, TikTok and YouTube" },
    { id: "royalties", label: "Royalties", hint: "DistroKid earnings by store and track" },
    { id: "songs", label: "Song economics", hint: "Which videos drove which songs' streams and money" },
];

/** One home for the numbers: Pulse, Money and Revenue Engine behind a single switcher. */
export default function StatsHub({ theme, mode }: { theme: "dark" | "snes" | "calm"; mode: "kirbai" | "factory" }) {
    const [view, setView] = useState<View>("overview");
    const current = VIEWS.find(v => v.id === view)!;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="section-title">Stats</h2>
                    <p className="text-sm text-foreground/50 mt-0.5">{current.hint}</p>
                </div>
                <div className="flex p-0.5 bg-foreground/5 rounded-full">
                    {VIEWS.map(v => (
                        <button
                            key={v.id}
                            onClick={() => setView(v.id)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${view === v.id ? "bg-surface text-foreground shadow" : "text-foreground/50 hover:text-foreground/80"}`}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>

            {view === "overview" && <AnalyticsMatrix theme={theme} mode={mode} />}
            {view === "royalties" && <FinanceView mode={mode} />}
            {view === "songs" && <RevenueEngine mode={mode} />}
        </div>
    );
}
