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
import StoryRoom from "@/components/StoryRoom";
import PromptBank from "@/components/PromptBank";
import CreativeHub from "@/components/CreativeHub";
import DirectorSuite from "@/components/DirectorSuite";
import MuseDeck from "@/components/MuseDeck";
import Boardroom from "@/components/Boardroom";
import DistroOptimizer from "@/components/DistroOptimizer";
import CompetitorTracker from "@/components/CompetitorTracker";
import RevenueEngine from "@/components/RevenueEngine";
import HookEngine from "@/components/HookEngine";
import CampaignBoard from "@/components/CampaignBoard";
import HomeView from "@/components/Home";
import CastSheet from "@/components/CastSheet";
import { MessageSquare, Settings2, ChevronDown, Sparkles, Home as HomeIcon, Menu, X } from 'lucide-react';

type Tab = "kirbai" | "factory";
type Module = "home" | "cast" | "roadmap" | "vault" | "intel" | "pulse" | "finance" | "api-health" | "chat" | "core" | "lore" | "storyroom" | "prompts" | "creative" | "director" | "muse" | "boardroom" | "distro" | "competitors" | "revenue" | "hooks" | "studio";
type Theme = "dark" | "snes" | "calm";

const NAV_GROUPS = [
  { id: "plan", label: "Story & Plan", items: [{ id: "cast", label: "Cast Sheet" }, { id: "storyroom", label: "Story Room" }, { id: "lore", label: "Lore" }, { id: "vault", label: "Vault" }, { id: "roadmap", label: "Roadmap" }] },
  { id: "create", label: "Create", items: [{ id: "hooks", label: "Hook Engine" }, { id: "distro", label: "Description Gen" }, { id: "prompts", label: "Prompts" }, { id: "creative", label: "Brainstorm" }] },
  { id: "numbers", label: "Numbers", items: [{ id: "pulse", label: "Pulse" }, { id: "finance", label: "Money" }, { id: "revenue", label: "Revenue Engine" }] },
  { id: "labs", label: "Labs", items: [{ id: "intel", label: "Intel" }, { id: "competitors", label: "Competitors" }, { id: "muse", label: "Muse" }, { id: "director", label: "Director's Suite" }, { id: "boardroom", label: "Boardroom" }, { id: "core", label: "Core" }, { id: "api-health", label: "API" }] },
] as const;

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("kirbai");
  const [activeModule, setActiveModule] = useState<Module>("home");
  const [theme, setTheme] = useState<Theme>("dark");
  const [showLauncher, setShowLauncher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Remember the theme across reloads.
  useEffect(() => {
    try {
      const t = localStorage.getItem("kos_theme") as Theme | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage isn't readable during SSR
      if (t) setTheme(t);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("kos_theme", theme); } catch {}
  }, [theme]);

  // Find which group the active module belongs to
  const activeGroup = NAV_GROUPS.find(g => g.items.some(i => i.id === activeModule));

  return (
    <main className="min-h-screen flex flex-col max-w-[1440px] mx-auto relative overflow-x-hidden">
      {/* ─── HEADER ─── */}
      <header className="w-full px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/50">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-border shadow-lg">
            <Image src="/assets/icon.jpg" alt="Kirbai Icon" width={36} height={36} className="object-cover" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-extrabold tracking-tight text-gradient leading-none">KIRBAI OS</h1>
            <span className="text-[9px] text-foreground/30 font-mono tracking-widest uppercase mt-0.5">V3.2.1_EVO</span>
          </div>
        </div>

        {/* Center: Ecosystem Toggle */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex p-0.5 bg-surface/60 rounded-xl border border-border/50">
            <button
              onClick={() => setActiveTab("kirbai")}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${
                activeTab === "kirbai"
                  ? "bg-accent text-white shadow-md"
                  : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              Kirbai
            </button>
            <button
              onClick={() => setActiveTab("factory")}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${
                activeTab === "factory"
                  ? "bg-accent text-white shadow-md"
                  : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              Factory
            </button>
          </div>
        </div>

        {/* Right: Theme Toggle + Status */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Theme Toggle */}
          <div className="flex p-0.5 bg-surface/60 rounded-xl border border-border/50">
            <button
              onClick={() => setTheme("dark")}
              className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${
                theme === "dark" ? "bg-accent text-white shadow-md" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme("snes")}
              className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${
                theme === "snes" ? "snes-btn-red text-white" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              SNES
            </button>
            <button
              onClick={() => setTheme("calm")}
              className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${
                theme === "calm" ? "bg-accent text-white shadow-md" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              Calm
            </button>
          </div>

          {/* System Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/50 bg-surface/30">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-foreground/30">Online</span>
          </div>
        </div>

        {/* Mobile Settings Trigger */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="lg:hidden p-2.5 bg-surface/60 border border-border/50 rounded-xl text-accent relative"
        >
          <Settings2 className="w-5 h-5" />
        </button>

        {/* Mobile Settings Panel — brand + theme toggle */}
        {showSettings && (
          <div className="show-on-mobile-only fixed top-[68px] right-4 z-[200] card p-4 flex flex-col gap-4 w-60">
            <div className="flex flex-col gap-2">
              <span className="section-eyebrow">Ecosystem</span>
              <div className="flex p-0.5 bg-surface/60 rounded-xl border border-border/50">
                <button
                  onClick={() => setActiveTab("kirbai")}
                  className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${
                    activeTab === "kirbai" ? "bg-accent text-white shadow-md" : "text-foreground/40"
                  }`}
                >
                  Kirbai
                </button>
                <button
                  onClick={() => setActiveTab("factory")}
                  className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${
                    activeTab === "factory" ? "bg-accent text-white shadow-md" : "text-foreground/40"
                  }`}
                >
                  Factory
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="section-eyebrow">Theme</span>
              <div className="flex p-0.5 bg-surface/60 rounded-xl border border-border/50">
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${
                    theme === "dark" ? "bg-accent text-white shadow-md" : "text-foreground/40"
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme("snes")}
                  className={`flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${
                    theme === "snes" ? "snes-btn-red text-white" : "text-foreground/40"
                  }`}
                >
                  SNES
                </button>
                <button
                  onClick={() => setTheme("calm")}
                  className={`flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-[10px] transition-all ${
                    theme === "calm" ? "bg-accent text-white shadow-md" : "text-foreground/40"
                  }`}
                >
                  Calm
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ─── NAVIGATION ─── */}
      <nav className="hide-on-mobile w-full px-6 flex items-center gap-1.5 mt-4 relative z-40">
        {/* Home */}
        <button
          onClick={() => setActiveModule("home")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${
            activeModule === "home"
              ? "bg-accent border-accent/40 text-white shadow-lg shadow-accent/10"
              : "bg-surface/40 border-border/50 text-foreground/50 hover:text-foreground hover:border-foreground/20"
          }`}
        >
          <HomeIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>

        {/* Studio — Pretty Rare Candies campaign board */}
        <button
          onClick={() => { setActiveModule("studio"); setTheme("calm"); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${
            activeModule === "studio"
              ? "bg-accent border-accent/40 text-white shadow-lg shadow-accent/10"
              : "bg-surface/40 border-border/50 text-foreground/50 hover:text-foreground hover:border-foreground/20"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Studio</span>
        </button>

        {/* Chat Button */}
        <button
          onClick={() => setActiveModule("chat")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${
            activeModule === "chat"
              ? "bg-accent border-accent/40 text-white shadow-lg shadow-accent/10"
              : "bg-surface/40 border-border/50 text-foreground/50 hover:text-foreground hover:border-foreground/20"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Chat</span>
        </button>

        {/* Module Group Dropdowns */}
        <div className="flex items-center gap-0.5 p-0.5 bg-surface/30 rounded-xl border border-border/50 relative z-50">
          {NAV_GROUPS.map((group) => {
            const isGroupActive = group.items.some(i => i.id === activeModule);
            return (
              <div
                key={group.id}
                className="relative"
                onMouseEnter={() => setOpenDropdown(group.id)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] transition-all ${
                  isGroupActive
                    ? "bg-surface/80 text-foreground"
                    : "text-foreground/40 hover:text-foreground/70"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{group.label}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === group.id ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === group.id && (
                  <div className="absolute top-full left-0 z-[100] pt-1 min-w-[200px]">
                    {/* Hover bridge */}
                    <div className="absolute inset-x-0 -top-4 h-5 pointer-events-auto" />
                    <div className="card p-1.5">
                      <div className="flex flex-col">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setActiveModule(item.id as Module); setOpenDropdown(null); }}
                            className={`w-full text-left px-3.5 py-2 transition-all rounded-xl text-[11px] font-semibold ${
                              activeModule === item.id
                                ? "bg-accent/10 text-accent"
                                : "text-foreground/50 hover:text-foreground hover:bg-surface/60"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ─── MAIN CONTENT ─── */}
      <section className="flex-1 w-full">
        <div className="mx-auto w-full px-6 py-6 pb-28 lg:pb-6 flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-8">
              <div key={`${activeTab}-${activeModule}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeModule === "home" && <HomeView go={m => { setActiveModule(m); if (m === "studio") setTheme("calm"); }} />}
                {activeModule === "cast" && <CastSheet />}
                {activeModule === "roadmap" && <Roadmap mode={activeTab} />}
                {activeModule === "vault" && <VaultManager theme={theme} mode={activeTab} />}
                {activeModule === "intel" && <IntelInbox mode="full" theme={theme} activeTab={activeTab} />}
                {activeModule === "pulse" && <AnalyticsMatrix theme={theme} mode={activeTab} />}
                {activeModule === "director" && <DirectorSuite mode={activeTab} />}
                {activeModule === "finance" && <FinanceView mode={activeTab} />}
                {activeModule === "revenue" && <RevenueEngine mode={activeTab} />}
                {activeModule === "hooks" && <HookEngine mode={activeTab} />}
                {activeModule === "api-health" && <APIHealth theme={theme} />}
                {activeModule === "chat" && <AIHub theme={theme} />}
                {activeModule === "core" && <ConsultantSettings theme={theme} />}
                {activeModule === "lore" && <LoreMatrix theme={theme} mode={activeTab} />}
                {activeModule === "storyroom" && <StoryRoom theme={theme} mode={activeTab} />}
                {activeModule === "creative" && <CreativeHub theme={theme} mode={activeTab} />}
                {activeModule === "prompts" && <PromptBank mode={activeTab} />}
                {activeModule === "muse" && <MuseDeck mode={activeTab} />}
                {activeModule === "boardroom" && <Boardroom mode={activeTab} />}
                {activeModule === "distro" && <DistroOptimizer theme={theme} mode={activeTab} />}
                {activeModule === "competitors" && <CompetitorTracker theme={theme} mode={activeTab} />}
                {activeModule === "studio" && <CampaignBoard />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MOBILE BOTTOM DOCK ─── */}
      <div className="mobile-bottom-dock show-on-mobile-only">
        <button onClick={() => setActiveModule("home")} className={`mobile-dock-item ${activeModule === "home" ? "active" : ""}`}>
          <HomeIcon className="w-5 h-5" />
          <span>Home</span>
        </button>
        <button onClick={() => setActiveModule("chat")} className={`mobile-dock-item ${activeModule === "chat" ? "active" : ""}`}>
          <MessageSquare className="w-5 h-5" />
          <span>Chat</span>
        </button>
        <button onClick={() => { setActiveModule("studio"); setTheme("calm"); }} className={`mobile-dock-item ${activeModule === "studio" ? "active" : ""}`}>
          <Sparkles className="w-5 h-5" />
          <span>Studio</span>
        </button>
        <button onClick={() => setShowLauncher(true)} className={`mobile-dock-item ${showLauncher ? "active" : ""}`}>
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>
      </div>

      {/* ─── MOBILE LAUNCHER OVERLAY ─── */}
      {showLauncher && (
        <div className="mobile-launcher-overlay show-on-mobile-only">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-foreground">Menu</h2>
            <button onClick={() => setShowLauncher(false)} className="p-2 text-foreground/50">
              <X className="w-5 h-5" />
            </button>
          </div>

          {NAV_GROUPS.map(group => (
            <div key={group.id} className="flex flex-col gap-2">
              <span className="section-eyebrow">{group.label}</span>
              <div className="launcher-grid">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveModule(item.id as Module); setShowLauncher(false); }}
                    className={`mobile-launcher-btn ${activeModule === item.id ? "active" : ""}`}
                  >
                    <span className="text-xs font-bold uppercase text-center">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
