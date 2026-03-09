"use client";

import { useState } from "react";
import ProjectBoard from "@/components/ProjectBoard";
import IntelInbox from "@/components/IntelInbox";
import FinanceView from "@/components/FinanceView";

type Tab = "kirbai" | "factory";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("kirbai");

  return (
    <main className="min-h-screen p-8 flex flex-col gap-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-6 border-b border-border pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter">Kirbai OS</h1>
            <p className="text-sm text-neutral-400 mt-1 uppercase tracking-widest">Command Center</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
            <span className="text-xs text-accent font-mono">SYSTEM ONLINE</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("kirbai")}
            className={`px-4 py-2 text-sm font-medium tracking-tight border-b-2 transition-colors ${activeTab === "kirbai" ? "border-accent text-accent" : "border-transparent text-neutral-500 hover:text-foreground"}`}
          >
            Brand: Kirbai
          </button>
          <button
            onClick={() => setActiveTab("factory")}
            className={`px-4 py-2 text-sm font-medium tracking-tight border-b-2 transition-colors ${activeTab === "factory" ? "border-accent text-accent" : "border-transparent text-neutral-500 hover:text-foreground"}`}
          >
            Factory: SEO (AELOW/KURAO)
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <ProjectBoard activeTab={activeTab} />
          <FinanceView activeTab={activeTab} />
        </div>
        <div className="lg:col-span-1 border-l border-border pl-8">
          <IntelInbox />
        </div>
      </div>
    </main>
  );
}
