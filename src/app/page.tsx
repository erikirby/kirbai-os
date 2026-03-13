"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import IntelInbox from "@/components/IntelInbox";
import FinanceView from "@/components/FinanceView";
import Roadmap from "@/components/Roadmap";
import VaultManager from "@/components/VaultManager";
import AnalyticsMatrix from "@/components/AnalyticsMatrix";
import APIHealth from "@/components/APIHealth";
import AIHub from "@/components/AIHub";
import ConsultantSettings from "@/components/ConsultantSettings";
import LoreMatrix from "@/components/LoreMatrix";
import PromptBank from "@/components/PromptBank";
import CreativeHub from "@/components/CreativeHub";
import DirectorSuite from "@/components/DirectorSuite";
import MuseDeck from "@/components/MuseDeck";
import { Database, LineChart, Network, MessageSquare, Plus, Check, Settings2, Share2, Menu, X, Home as HomeIcon, Clapperboard, Layers, Sparkles, Wallet, Brain } from 'lucide-react';

type Tab = "kirbai" | "factory";
type Module = "roadmap" | "vault" | "intel" | "pulse" | "finance" | "api-health" | "chat" | "core" | "lore" | "prompts" | "creative" | "director" | "muse";
type Theme = "dark" | "light" | "pink" | "snes" | "gbc" | "pokopia";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("kirbai");
  const [activeModule, setActiveModule] = useState<Module>("roadmap");
  const [theme, setTheme] = useState<Theme>("dark");
  const [showLauncher, setShowLauncher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const themes: { id: Theme; label: string; class?: string }[] = [
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
    { id: "pink", label: "Pink" },
    { id: "snes", label: "SNES", class: "snes-btn-purple text-white" },
    { id: "gbc", label: "GBC" },
    { id: "pokopia", label: "Pokopia" },
  ];

  return (
    <main className="min-h-screen p-4 lg:p-8 flex flex-col gap-8 max-w-[1500px] mx-auto relative overflow-x-hidden">
      {/* 1. Header Navigation (Global) */}
      <header className="w-full max-w-screen-2xl px-6 py-4 flex justify-between items-center border-b border-border/10 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-accent/20 shadow-[0_0_15px_rgba(255,51,102,0.15)] specular-reflect">
            <Image src="/assets/icon.jpg" alt="Kirbai Icon" width={40} height={40} className="object-cover" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tighter text-gradient leading-none">KIRBAI OS</h1>
            <span className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase mt-0.5">V3.2.1_EVO</span>
          </div>
        </div>

        {/* Theme Switcher - Desktop Only */}
        <div className="hidden lg:flex items-center gap-4">
          <div className={`flex p-1 shadow-inner ${theme === 'pokopia' ? 'bg-white rounded-[40px] border-4 border-white' : 'bg-surface/40 rounded-full border border-border/10'}`}>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full transition-all ${theme === t.id
                  ? (theme === "snes" ? "snes-btn-red text-white scale-105" : theme === "gbc" ? "bg-accent/20 border-2 border-accent text-accent scale-105 rounded-none shadow-[2px_2px_0_rgba(0,0,0,0.5)]" : theme === "pokopia" ? "bg-[#A6D9F7] text-white scale-105 shadow-lg" : "bg-accent text-white shadow-md scale-105")
                  : "text-foreground/50 hover:text-foreground/80"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border/20 mx-2" />

          <div className={`flex p-1 ${theme === 'pokopia' ? 'bg-white rounded-full border-4 border-white' : 'bg-surface/50 border border-border/40 rounded-sm'}`}>
            <button
              onClick={() => setActiveTab("kirbai")}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'pokopia' ? 'rounded-full' : 'rounded-sm'} ${activeTab === "kirbai" ? (theme === "snes" ? "snes-btn-blue text-white" : "bg-accent text-white shadow-lg") : "text-neutral-500 hover:text-neutral-300"
                }`}
            >
              Kirbai
            </button>
            <button
              onClick={() => setActiveTab("factory")}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${theme === 'pokopia' ? 'rounded-full' : 'rounded-sm'} ${activeTab === "factory" ? (theme === "snes" ? "snes-btn-green text-white" : "bg-accent text-white shadow-lg") : "text-neutral-500 hover:text-neutral-300"
                }`}
            >
              Factory
            </button>
          </div>
        </div>

        {/* Mobile Settings Trigger */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="lg:hidden p-3 bg-surface/40 border border-border/10 rounded-2xl text-accent shadow-lg"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </header>
      
      {/* Pokopia Top Divider */}
      {theme === 'pokopia' && <div className="divider-cloud -mt-8 animate-drift" />}

      {/* 2. Hero Banner Section */}
      <section className="w-full max-w-screen-2xl px-6 -mt-4">
        <div className="relative w-full h-[240px] squircle overflow-hidden border border-border/20 group specular-reflect shadow-2xl">
          <Image src="/assets/banner.jpg" alt="Kirbai Banner" fill className="object-cover group-hover:scale-[1.05] transition-transform duration-2000" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
          <div className="absolute bottom-10 left-10 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-accent font-bold tracking-[0.4em] uppercase opacity-80">Operational Context</span>
            <h2 className="text-5xl font-bold tracking-tighter text-white uppercase drop-shadow-2xl">
              {activeTab === "kirbai" ? "Brand: Kirbai" : "Factory: SEO Matrix"}
            </h2>
          </div>
        </div>
      </section>

      {/* 3. Sub-Navigation - Desktop Only: Consolidated Single-Line Dropdown */}
      <nav className="hide-on-mobile w-full max-w-screen-2xl px-6 flex items-center justify-between gap-4 border-b border-border/10 pb-4 shadow-[0_4px_10px_-5px_rgba(0,0,0,0.3)]">
        
        <div className="flex items-center gap-8">
          {/* MASTER CONTROL - ALWAYS VISIBLE */}
          <button
            onClick={() => setActiveModule("chat")}
            className={`flex items-center gap-3 px-6 py-2.5 transition-all outline-none border relative overflow-hidden group shadow-xl ${theme === 'pokopia' ? 'nav-btn rounded-full' : 'rounded-2xl'} ${activeModule === "chat" 
              ? (theme === 'pokopia' ? "bg-white border-white scale-105" : "bg-accent border-accent/40 text-white scale-105") 
              : (theme === 'pokopia' ? "bg-section-blue border-white text-[#3b2b1d]" : "bg-surface/40 border-border/20 text-foreground/40 hover:text-white hover:border-accent/40")}`}
          >
            <MessageSquare className={`w-4 h-4 ${activeModule === "chat" ? (theme === 'pokopia' ? "text-accent" : "text-white") : (theme === 'pokopia' ? "text-[#3b2b1d]" : "text-accent")}`} />
            <span className={`uppercase tracking-widest ${theme === 'pokopia' ? 'text-[#3b2b1d]' : ''}`}>Chat</span>
            {activeModule === "chat" && theme !== 'pokopia' && (
              <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none"></div>
            )}
          </button>

          {/* DROPDOWN GROUPS */}
          <div className="flex gap-4 items-center">
            {[
              { id: "command", label: "Command", items: [{ id: "roadmap", label: "Home" }, { id: "intel", label: "Intel" }, { id: "muse", label: "Muse" }] },
              { id: "pipeline", label: "Pipeline", items: [{ id: "creative", label: "Brainstorm" }, { id: "director", label: "Director" }] },
              { id: "archive", label: "Archive", items: [{ id: "lore", label: "Lore" }, { id: "vault", label: "Vault" }, { id: "prompts", label: "Prompts" }, { id: "core", label: "Core" }] },
              { id: "performance", label: "Performance", items: [{ id: "pulse", label: "Pulse" }, { id: "finance", label: "Money" }, { id: "api-health", label: "API" }] },
            ].map((group) => (
              <div 
                key={group.id} 
                className="relative"
                onMouseEnter={() => setOpenDropdown(group.id)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button className={`dropdown-pill h-full ${theme === 'pokopia' ? 'nav-btn' : 'px-4 py-2.5 border rounded-xl border-border/20 text-foreground/60 hover:text-white hover:border-accent'}`}>
                  <span>{group.label}</span>
                </button>

                {openDropdown === group.id && (
                  <div className={`absolute top-full left-0 z-[100] pt-0 min-w-[200px] animate-in fade-in slide-in-from-top-1 duration-200`}>
                    {/* ENLARGED Bridge for hover continuity - spanning the entire button area */}
                    <div className="absolute inset-x-0 -top-12 h-12 pointer-events-auto" />
                    <div className={`${theme === 'pokopia' ? 'dropdown-menu' : 'bg-background border border-border rounded-2xl p-2 shadow-2xl'}`}>
                      <div className="flex flex-col gap-1">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setActiveModule(item.id as Module); setOpenDropdown(null); }}
                            className={`w-full text-left px-4 py-2 transition-all rounded-lg ${activeModule === item.id 
                              ? "bg-accent/20 text-accent" 
                              : "text-neutral-500 hover:text-foreground hover:bg-white/5"}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ECOSYSTEM INDICATOR (Right Side) */}
        <div className={`hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/10 ${theme === 'pokopia' ? 'bg-[#A6D9F7] border-white text-brown' : 'bg-surface/20'}`}>
          <div className="w-2 h-2 rounded-full animate-pulse bg-green-500" />
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">System Online:</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-accent">{activeTab} Ecosystem</span>
        </div>
      </nav>

      {/* 4. Main Body Color Blocking (Sectional based on group) */}
      <section className={`flex-1 w-full transition-colors duration-700 ${theme === 'pokopia' ? (
        activeModule === 'roadmap' || activeModule === 'intel' || activeModule === 'muse' ? 'bg-section-green' :
        activeModule === 'creative' || activeModule === 'director' ? 'bg-section-blue' :
        activeModule === 'lore' || activeModule === 'vault' || activeModule === 'core' ? 'bg-section-purple' :
        'bg-section-wood'
      ) : ''}`}>
        <div className="mx-auto w-full max-w-screen-2xl px-6 py-6 flex flex-col gap-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className={activeModule === "roadmap" ? "lg:col-span-3 flex flex-col gap-12" : "lg:col-span-4 flex flex-col gap-12"}>
              <div key={`${activeTab}-${activeModule}`} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {activeModule === "roadmap" && <Roadmap mode={activeTab} />}
                {activeModule === "vault" && <VaultManager theme={theme} mode={activeTab} />}
                {activeModule === "intel" && <IntelInbox mode="full" theme={theme} activeTab={activeTab} />}
                {activeModule === "pulse" && <AnalyticsMatrix theme={theme} mode={activeTab} />}
                {activeModule === "director" && <DirectorSuite mode={activeTab} />}
                {activeModule === "finance" && <FinanceView mode={activeTab} />}
                {activeModule === "api-health" && <APIHealth theme={theme} />}
                {activeModule === "chat" && <AIHub theme={theme} />}
                {activeModule === "core" && <ConsultantSettings theme={theme} />}
                {activeModule === "lore" && <LoreMatrix theme={theme} mode={activeTab} />}
                {activeModule === "creative" && <CreativeHub theme={theme} mode={activeTab} />}
                {activeModule === "prompts" && <PromptBank mode={activeTab} />}
                {activeModule === "muse" && <MuseDeck mode={activeTab} />}
              </div>
            </div>

            {/* 5. Sidebar Command Center (Contextual Intel) - Only on HOME */}
            {activeModule === "roadmap" && (
              <div className="lg:col-span-1 flex flex-col gap-8 sticky top-28 self-start">
                <div className="glass squircle p-6 specular-reflect shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] rounded-full -mr-16 -mt-16" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-foreground mb-8 border-b border-border/10 pb-4">Command Center</h3>
                  <IntelInbox mode="compact" theme={theme} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
