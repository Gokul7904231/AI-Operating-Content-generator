"use client";

import React from "react";
import { useLobbyStore } from "@/lib/lobby/mock-state";
import { 
  Bell, Settings, ShieldCheck, AlertTriangle, 
  Terminal, User, Activity, Layers
} from "lucide-react";

export default function FactoryChrome() {
  const { factoryState, activeTab, setActiveTab, setOverseerDrawerOpen, setAttentionDrawerOpen } = useLobbyStore();
  const hasAttention = factoryState.status === "ATTENTION_REQUIRED";
  const activeAttentionCount = factoryState.attention.filter((a) => !a.resolved).length;

  return (
    <header className="sticky top-0 z-30 w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/70 select-none">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        
        {/* Left: Brand + Subtitle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-zinc-900 border border-amber-500/40 flex items-center justify-center shadow-sm shadow-amber-500/10 p-0.5 overflow-hidden">
              <img src="/favicon-black.png" alt="FactoryOS Logo" className="w-full h-full object-contain dark:hidden block" />
              <img src="/favicon-white.png" alt="FactoryOS Logo" className="w-full h-full object-contain hidden dark:block" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-zinc-100 font-mono">
                  FACTORYOS
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400">
                  LOBBY v2.4
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-500 tracking-wide uppercase">
                SHORT-FORM PRODUCTION OS
              </p>
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden md:block" />

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {(["Lobby", "Productions", "Factory", "Reports"] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                    isActive
                      ? "bg-zinc-800/90 text-zinc-100 border border-zinc-700/60 font-medium"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Operational Controls */}
        <div className="flex items-center gap-2.5">
          {/* Overseer Operational Status Trigger */}
          <button
            onClick={() => setOverseerDrawerOpen(true)}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors text-xs font-mono"
            title="Open Overseer Command Report"
          >
            <div className={`w-2 h-2 rounded-full ${hasAttention ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            <span className="text-zinc-300">OVERSEER</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              ({factoryState.overseer.activeProductionsCount} RUNNING)
            </span>
          </button>

          {/* Attention Banner Trigger (if active attention) */}
          {hasAttention && (
            <button
              onClick={() => setAttentionDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all text-xs font-mono font-medium animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>ATTENTION ({activeAttentionCount})</span>
            </button>
          )}

          <div className="h-4 w-px bg-zinc-800" />

          {/* Notifications */}
          <button 
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all relative"
            title="Factory Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full" />
          </button>

          {/* Profile / System Admin */}
          <button 
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
            title="Control Tower Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Avatar Badge */}
          <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-mono font-bold">
            OP
          </div>
        </div>

      </div>
    </header>
  );
}
