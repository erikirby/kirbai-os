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
import DirectorSuite from "@/components/DirectorSuite"; // Added import
import { Database, LineChart, Network, MessageSquare, Plus, Check, Settings2, Share2, Menu, X, Home as HomeIcon, Clapperboard, Layers, Sparkles, Wallet } from 'lucide-react';

type Tab = "kirbai" | "factory";
type Module = "roadmap" | "vault" | "intel" | "pulse" | "finance" | "api-health" | "chat" | "core" | "lore" | "prompts" | "creative" | "director"; // Added 'director'
type Theme = "dark" | "light" | "pink" | "snes" | "gbc";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("kirbai");
  const [activeModule, setActiveModule] = useState<Module>("roadmap");
  const [theme, setTheme] = useState<Theme>("dark");
  const [showLauncher, setShowLauncher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const themes: { id: Theme; label: string; class?: string }[] = [
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
    { id: "pink", label: "Pink" },
    { id: "snes", label: "SNES", class: "snes-btn-purple text-white" },
    { id: "gbc", label: "GBC" },
  ];

  return (
    <main className="min-h-screen p-4 lg:p-20 pb-40 flex flex-col gap-12 max-w-[1400px] mx-auto overflow-x-hidden">
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
          <div className="flex bg-surface/40 p-1 rounded-full border border-border/10 shadow-inner">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full transition-all ${theme === t.id
                  ? (theme === "snes" ? "snes-btn-red text-white scale-105" : theme === "gbc" ? "bg-accent/20 border-2 border-accent text-accent scale-105 rounded-none shadow-[2px_2px_0_rgba(0,0,0,0.5)]" : "bg-accent text-white shadow-md scale-105")
                  : "text-foreground/50 hover:text-foreground/80"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border/20 mx-2" />

          <div className="flex bg-surface/50 border border-border/40 p-1 rounded-sm">
            <button
              onClick={() => setActiveTab("kirbai")}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm ${activeTab === "kirbai" ? (theme === "snes" ? "snes-btn-blue text-white" : "bg-accent text-white shadow-lg") : "text-neutral-500 hover:text-neutral-300"
                }`}
            >
              Kirbai
            </button>
            <button
              onClick={() => setActiveTab("factory")}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm ${activeTab === "factory" ? (theme === "snes" ? "snes-btn-green text-white" : "bg-accent text-white shadow-lg") : "text-neutral-500 hover:text-neutral-300"
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

      {/* 2. Hero Banner Section */}
      <section className="w-full max-w-screen-2xl px-6 mt-8">
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

      {/* 3. Sub-Navigation - Desktop Only */}
      <nav className="hide-on-mobile w-full max-w-screen-2xl px-6 mt-6 flex flex-wrap items-end gap-1 border-b border-border/10 pb-0 shadow-[0_4px_10px_-5px_rgba(0,0,0,0.3)]">
        
        {/* MASTER CONTROL */}
        <div className="flex flex-col gap-2 pb-4 mr-10">
          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-accent/60 ml-px">Master</span>
          <button
            onClick={() => setActiveModule("chat")}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all border relative overflow-hidden group shadow-2xl ${activeModule === "chat" 
              ? "bg-accent border-accent/40 text-white scale-105" 
              : "bg-surface/40 border-border/20 text-foreground/40 hover:text-white hover:border-accent/40"}`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <MessageSquare className={`w-5 h-5 ${activeModule === "chat" ? "text-white" : "text-accent"}`} />
            <span className="text-xs font-black uppercase tracking-widest">Chat</span>
            {activeModule === "chat" && (
              <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none"></div>
            )}
          </button>
        </div>

        {/* GROUPS */}
        <div className="flex gap-12 items-end">
          {/* GROUP: COMMAND */}
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-foreground/20 ml-1">Command</span>
            <div className="flex gap-2 pb-4">
              {[
                { id: "roadmap", label: "Home" },
                { id: "intel", label: "Intel" },
              ].map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id as Module)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl border ${activeModule === mod.id ? "bg-white/10 text-accent border-accent/20 font-bold" : "text-neutral-500 border-transparent hover:text-foreground hover:bg-white/5"}`}
                >
                  {mod.label}
                </button>
              ))}
            </div>
          </div>

          {/* GROUP: PIPELINE */}
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-foreground/20 ml-1">Pipeline</span>
            <div className="flex gap-2 pb-4">
              {[
                { id: "creative", label: "Brainstorm" },
                { id: "director", label: "Director" },
              ].map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id as Module)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl border ${activeModule === mod.id ? "bg-white/10 text-accent border-accent/20 font-bold" : "text-neutral-500 border-transparent hover:text-foreground hover:bg-white/5"}`}
                >
                  {mod.label}
                </button>
              ))}
            </div>
          </div>

          {/* GROUP: ARCHIVE */}
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-foreground/20 ml-1">Archive</span>
            <div className="flex gap-2 pb-4">
              {[
                { id: "lore", label: "Lore" },
                { id: "vault", label: "Vault" },
                { id: "prompts", label: "Prompts" },
                { id: "core", label: "Core" },
              ].map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id as Module)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl border ${activeModule === mod.id ? "bg-white/10 text-accent border-accent/20 font-bold" : "text-neutral-500 border-transparent hover:text-foreground hover:bg-white/5"}`}
                >
                  {mod.label}
                </button>
              ))}
            </div>
          </div>

          {/* GROUP: PERFORMANCE */}
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-foreground/20 ml-1">Performance</span>
            <div className="flex gap-2 pb-4">
              {[
                { id: "pulse", label: "Pulse" },
                { id: "finance", label: "Money" },
                { id: "api-health", label: "API" },
              ].map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id as Module)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl border ${activeModule === mod.id ? "bg-white/10 text-accent border-accent/20 font-bold" : "text-neutral-500 border-transparent hover:text-foreground hover:bg-white/5"}`}
                >
                  {mod.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE BOTTOM DOCK */}
      <div className="show-on-mobile-only mobile-bottom-dock">
        <button 
          onClick={() => setActiveModule("chat")}
          className={`mobile-dock-item ${activeModule === 'chat' ? 'active' : ''}`}
        >
          <MessageSquare className="w-6 h-6" />
          <span>Chat</span>
        </button>
        <button 
          onClick={() => setActiveModule("roadmap")}
          className={`mobile-dock-item ${activeModule === 'roadmap' ? 'active' : ''}`}
        >
          <HomeIcon className="w-6 h-6" />
          <span>Home</span>
        </button>
        <button 
          onClick={() => setActiveModule("director")}
          className={`mobile-dock-item ${activeModule === 'director' ? 'active' : ''}`}
        >
          <Clapperboard className="w-6 h-6" />
          <span>Director</span>
        </button>
        <button 
          onClick={() => setShowLauncher(true)}
          className={`mobile-dock-item ${showLauncher ? 'active' : ''}`}
        >
          <Layers className="w-6 h-6" />
          <span>More</span>
        </button>
      </div>

      {/* MOBILE LAUNCHER OVERLAY */}
      {showLauncher && (
        <div className="mobile-launcher-overlay animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-widest text-accent">Strategic Suite</h2>
            <button onClick={() => setShowLauncher(false)} className="p-3 bg-white/10 rounded-full"><X className="w-6 h-6" /></button>
          </div>

          <div className="launcher-grid">
            {[
              { id: "intel", label: "Intel", icon: MessageSquare, group: "Command" },
              { id: "creative", label: "Brainstorm", icon: Sparkles, group: "Pipeline" },
              { id: "lore", label: "Lore Matrix", icon: Network, group: "Archive" },
              { id: "vault", label: "Vault", icon: Database, group: "Archive" },
              { id: "pulse", label: "Pulse", icon: LineChart, group: "Stats" },
              { id: "finance", label: "Money", icon: Wallet, group: "Stats" },
              { id: "prompts", label: "Prompt Bank", icon: MessageSquare, group: "Archive" },
              { id: "core", label: "Core Config", icon: Settings2, group: "Admin" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveModule(item.id as Module); setShowLauncher(false); }}
                className={`mobile-launcher-btn ${activeModule === item.id ? 'active' : ''}`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[7px] font-black uppercase tracking-[0.3em] opacity-40">{item.group}</span>
                  <item.icon className={`w-8 h-8 ${activeModule === item.id ? 'text-accent' : 'text-white/40'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-2">{item.label}</span>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-[9px] font-black uppercase tracking-[0.5em] text-foreground/20 mt-auto pb-10">KIRBAI OS MOBILE SUIT V3.2.1</p>
        </div>
      )}

      {/* MOBILE SETTINGS OVERLAY */}
      {showSettings && (
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-3xl p-10 flex flex-col gap-8 overflow-y-auto animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-widest text-accent">Settings</h2>
            <button onClick={() => setShowSettings(false)} className="p-3 bg-white/10 rounded-full"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Theme</span>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setShowSettings(false); }}
                  className={`px-6 py-6 rounded-3xl text-[10px] font-black uppercase tracking-widest border transition-all ${theme === t.id ? "bg-accent border-accent text-white shadow-xl shadow-accent/20" : "bg-white/5 border-white/10 text-foreground/40"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Brand / Ecosystem</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setActiveTab("kirbai"); setShowSettings(false); }}
                className={`px-6 py-6 rounded-3xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeTab === "kirbai" ? "bg-accent border-accent text-white shadow-xl shadow-accent/20" : "bg-white/5 border-white/10 text-foreground/40"}`}
              >
                Kirbai
              </button>
              <button
                onClick={() => { setActiveTab("factory"); setShowSettings(false); }}
                className={`px-6 py-6 rounded-3xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeTab === "factory" ? "bg-accent border-accent text-white shadow-xl shadow-accent/20" : "bg-white/5 border-white/10 text-foreground/40"}`}
              >
                Factory
              </button>
            </div>
          </div>

      )}

      {/* 4. Modular Content Area */}
      <div className="w-full max-w-screen-2xl px-6 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className={activeModule === "roadmap" ? "lg:col-span-3 flex flex-col gap-6" : "lg:col-span-4 flex flex-col gap-6"}>
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
    </main>
  );
}
