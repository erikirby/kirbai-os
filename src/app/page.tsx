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
import StatsHub from "@/components/StatsHub";
import { MessageSquare, Settings2, ChevronDown, Sparkles, Home as HomeIcon, Menu, X, Users, BookOpen, Archive, BarChart3 } from 'lucide-react';

type Tab = "kirbai" | "factory";
type Module = "home" | "cast" | "stats" | "roadmap" | "vault" | "intel" | "pulse" | "finance" | "api-health" | "chat" | "core" | "lore" | "storyroom" | "prompts" | "creative" | "director" | "muse" | "boardroom" | "distro" | "competitors" | "revenue" | "hooks" | "studio";
type Theme = "dark" | "snes" | "calm";

const NAV_GROUPS = [
  { id: "plan", label: "Plan", items: [{ id: "lore", label: "Lore" }, { id: "roadmap", label: "Roadmap" }] },
  { id: "create", label: "Create", items: [{ id: "hooks", label: "Hook Engine" }, { id: "distro", label: "Description Gen" }, { id: "prompts", label: "Prompts" }, { id: "creative", label: "Brainstorm" }] },
  { id: "labs", label: "Labs", items: [{ id: "intel", label: "Intel" }, { id: "competitors", label: "Competitors" }, { id: "muse", label: "Muse" }, { id: "director", label: "Director's Suite" }, { id: "boardroom", label: "Boardroom" }, { id: "core", label: "Core" }, { id: "api-health", label: "API" }] },
] as const;

const PRIMARY: { id: Module; label: string; icon: typeof HomeIcon }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "studio", label: "Studio", icon: Sparkles },
  { id: "cast", label: "Cast", icon: Users },
  { id: "storyroom", label: "Story Room", icon: BookOpen },
  { id: "vault", label: "Vault", icon: Archive },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

const THEMES: { id: Theme; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "calm", label: "Light" },
  { id: "snes", label: "SNES" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("kirbai");
  const [activeModule, setActiveModule] = useState<Module>("home");
  const [studioView, setStudioView] = useState<"board" | "calendar">("board");
  const [theme, setTheme] = useState<Theme>("dark");
  const [showLauncher, setShowLauncher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMore, setShowMore] = useState(false);

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

  const go = (m: Module, view: "board" | "calendar" = "board") => {
    setActiveModule(m);
    setShowMore(false);
    setShowLauncher(false);
    if (m === "studio") setStudioView(view);
  };

  const inMore = NAV_GROUPS.some(g => g.items.some(i => i.id === activeModule)) && !PRIMARY.some(p => p.id === activeModule);
  const moreLabel = inMore ? NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeModule)?.label : "More";

  return (
    <main className="min-h-screen flex flex-col max-w-[1320px] mx-auto relative overflow-x-hidden">
      {/* ─── TOP BAR ─── */}
      <header className="w-full px-4 sm:px-6 h-16 flex items-center gap-4 sticky top-0 z-50 backdrop-blur-xl bg-background/75 border-b border-border">
        <button onClick={() => go("home")} className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-[10px] overflow-hidden border border-border">
            <Image src="/assets/icon.jpg" alt="Kirbai" width={32} height={32} className="object-cover" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-foreground">Kirbai OS</span>
          {activeTab === "factory" && <span className="badge badge-accent">Factory</span>}
        </button>

        <nav className="hide-on-mobile flex items-center gap-0.5 ml-4">
          {PRIMARY.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => go(id)} className={`nav-pill ${activeModule === id ? "active" : ""}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <div className="relative">
            <button onClick={() => setShowMore(v => !v)} className={`nav-pill ${inMore || showMore ? "active" : ""}`}>
              {moreLabel} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} />
            </button>
            {showMore && <>
              <div className="fixed inset-0 z-[90]" onClick={() => setShowMore(false)} />
              <div className="absolute top-full left-0 mt-2 z-[100] rounded-2xl border border-border bg-surface shadow-2xl shadow-black/20 p-3 grid grid-cols-3 gap-3 w-[520px]">
                {NAV_GROUPS.map(group => (
                  <div key={group.id} className="flex flex-col gap-0.5">
                    <span className="px-2.5 pb-1 text-xs font-medium text-foreground/40">{group.label}</span>
                    {group.items.map(item => (
                      <button key={item.id} onClick={() => go(item.id as Module)} className={`menu-item ${activeModule === item.id ? "active" : ""}`}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeSlider dark={theme !== "calm"} onToggle={() => setTheme(theme === "calm" ? "dark" : "calm")} />
        </div>
        <div className="relative">
          <button onClick={() => setShowSettings(v => !v)} className="p-2 rounded-full text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors" title="Settings">
            <Settings2 className="w-5 h-5" />
          </button>
          {showSettings && <>
            <div className="fixed inset-0 z-[190]" onClick={() => setShowSettings(false)} />
            <div className="absolute right-0 top-full mt-2 z-[200] rounded-2xl border border-border bg-surface shadow-2xl shadow-black/20 p-4 flex flex-col gap-4 w-64">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground/50">Theme</span>
                <div className="flex p-0.5 bg-foreground/5 rounded-full">
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => setTheme(t.id)} className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all ${theme === t.id ? "bg-surface text-foreground shadow" : "text-foreground/50"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground/50">Workspace</span>
                <div className="flex p-0.5 bg-foreground/5 rounded-full">
                  {(["kirbai", "factory"] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all ${activeTab === t ? "bg-surface text-foreground shadow" : "text-foreground/50"}`}>
                      {t === "kirbai" ? "Kirbai" : "Factory"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>}
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <section className="flex-1 w-full">
        <div className="mx-auto w-full px-4 sm:px-6 py-8 pb-28 lg:pb-10">
          <div key={`${activeTab}-${activeModule}`} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeModule === "home" && <HomeView go={(m, view) => go(m, view)} />}
            {activeModule === "cast" && <CastSheet />}
            {activeModule === "stats" && <StatsHub theme={theme} mode={activeTab} />}
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
            {activeModule === "studio" && <CampaignBoard initialView={studioView} />}
          </div>
        </div>
      </section>

      {/* ─── MOBILE BOTTOM DOCK ─── */}
      <div className="mobile-bottom-dock show-on-mobile-only">
        {PRIMARY.filter(p => ["home", "studio", "cast", "stats"].includes(p.id)).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => go(id)} className={`mobile-dock-item ${activeModule === id ? "active" : ""}`}>
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </button>
        ))}
        <button onClick={() => setShowLauncher(true)} className={`mobile-dock-item ${showLauncher || inMore ? "active" : ""}`}>
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>
      </div>

      {/* ─── MOBILE LAUNCHER OVERLAY ─── */}
      {showLauncher && (
        <div className="mobile-launcher-overlay show-on-mobile-only">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Everything else</h2>
            <button onClick={() => setShowLauncher(false)} className="p-2 text-foreground/50">
              <X className="w-5 h-5" />
            </button>
          </div>
          {[{ id: "main", label: "Main", items: [{ id: "storyroom", label: "Story Room" }, { id: "vault", label: "Vault" }, { id: "chat", label: "Chat" }] }, ...NAV_GROUPS].map(group => (
            <div key={group.id} className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground/40">{group.label}</span>
              <div className="launcher-grid">
                {group.items.map(item => (
                  <button key={item.id} onClick={() => go(item.id as Module)} className={`mobile-launcher-btn ${activeModule === item.id ? "active" : ""}`}>
                    <span className="text-sm font-medium text-center">{item.label}</span>
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

/** Light/dark slider: Solrock on the left in light mode, Lunatone on the right in dark mode. */
function ThemeSlider({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative w-[76px] h-10 shrink-0 group"
    >
      <span className={`absolute left-3 right-3 top-1/2 -translate-y-1/2 h-3 rounded-full transition-colors duration-300 ${dark ? "bg-indigo-400/30" : "bg-amber-300/50"}`} />
      <span
        className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 group-active:scale-95 ${dark ? "rotate-0" : "-rotate-12"}`}
        style={{ left: dark ? "calc(100% - 34px)" : "2px" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dark ? "/sprites/lunatone-icon.png" : "/sprites/solrock-icon.png"} alt="" className="h-8 w-auto" style={{ imageRendering: "pixelated" }} />
      </span>
    </button>
  );
}
