"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Maximize2,
  Sparkles,
  HelpCircle,
  X,
  Search,
  Command,
  ChevronDown,
  Check,
  AlertCircle,
  Lock,
  Layers,
  Sliders,
  Cpu,
  Activity,
} from "lucide-react";

export default function DesignSystemLaboratory() {
  const [activeTab, setActiveTab] = useState("all");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [scrubberPos, setScrubberPos] = useState(35);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tooltipActive, setTooltipActive] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen w-screen bg-[#070708] text-zinc-100 font-sans select-none pb-20">
      {/* Top Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-[#0c0c0e]/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold rounded">
            FACTORYOS LAB
          </div>
          <h1 className="text-sm font-bold tracking-tight text-zinc-100 font-sans">
            Design System & Component Laboratory (Apple + Emil Standard)
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <Link href="/prototypes/workspace-a" className="hover:text-zinc-100 transition-colors">
            Workspace A →
          </Link>
          <Link href="/prototypes/workspace-b" className="hover:text-zinc-100 transition-colors">
            Workspace B →
          </Link>
          <Link href="/prototypes/workspace-c" className="hover:text-zinc-100 transition-colors">
            Workspace C →
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-12">
        {/* Section 1: TYPOGRAPHY */}
        <section className="space-y-4">
          <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-widest">
              1. Typography & Optical Hierarchy
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">Optical Sizing • Size-Specific Tracking</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#121215] border border-zinc-800/80 rounded-xl p-6">
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Display (-0.02em tracking, 1.05 leading)</span>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50 leading-[1.05]">
                  Automated Short-Form Production OS
                </h1>
              </div>

              <div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Page Title</span>
                <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                  Mission Control Studio Pipeline
                </h2>
              </div>

              <div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Section Title</span>
                <h3 className="text-sm font-semibold text-zinc-200">
                  9-Stage Execution Orchestrator
                </h3>
              </div>

              <div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">Body Text</span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  FactoryOS frames creative production as an automated digital assembly line, transforming raw concepts into broadcast-ready vertical video assets.
                </p>
              </div>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 bg-[#070708] border border-zinc-850 rounded-lg space-y-1">
                <span className="text-[9px] text-zinc-500 uppercase block">Technical Metadata (+0.04em tracking)</span>
                <div className="text-amber-400 font-bold tracking-wider">H.264 / AAC • 1080x1920 @ 60FPS • BITRATE 12.4MBPS</div>
              </div>

              <div className="p-3 bg-[#070708] border border-zinc-850 rounded-lg space-y-1">
                <span className="text-[9px] text-zinc-500 uppercase block">NLE Timecode (Tabular Numbers)</span>
                <div className="text-2xl font-bold text-zinc-100 tracking-wider">00:00:04:12</div>
              </div>

              <div className="p-3 bg-[#070708] border border-zinc-850 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase block">Numerical Telemetry</span>
                  <div className="text-sm font-bold text-emerald-400">14.2 MB Rendered (8.4s)</div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                  <Activity className="w-3 h-3 text-emerald-400" /> GPU 22%
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: CONTROLS & INTERACTION CRAFT */}
        <section className="space-y-4">
          <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-widest">
              2. Controls & Direct Manipulation (Emil Active Scale 0.97)
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">Instant Pointer Feedback • Origin-Aware Popovers</span>
          </div>

          <div className="bg-[#121215] border border-zinc-800/80 rounded-xl p-6 space-y-6">
            {/* Buttons Row */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-[9px] font-mono text-zinc-500 block mb-1">Primary Button</span>
                <button className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-[0.97] transition-all duration-150 text-zinc-950 font-bold text-xs rounded-md shadow-md flex items-center gap-1.5 cursor-pointer">
                  <Sparkles className="w-3.5 h-3.5" /> Start Production
                </button>
              </div>

              <div>
                <span className="text-[9px] font-mono text-zinc-500 block mb-1">Secondary Button</span>
                <button className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 active:scale-[0.97] transition-all duration-150 text-zinc-200 text-xs rounded-md flex items-center gap-1.5 cursor-pointer">
                  Configure Settings
                </button>
              </div>

              <div>
                <span className="text-[9px] font-mono text-zinc-500 block mb-1">Icon Button</span>
                <button className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 active:scale-[0.95] transition-all duration-150 text-zinc-300 rounded-md cursor-pointer">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Control */}
              <div>
                <span className="text-[9px] font-mono text-zinc-500 block mb-1">Segmented Control</span>
                <div className="p-1 bg-[#070708] border border-zinc-850 rounded-lg flex gap-1">
                  {["all", "visuals", "audio"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                        activeTab === t
                          ? "bg-zinc-800 text-amber-400 font-bold shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Inputs & Dropdowns Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-800/80">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 uppercase">Input Field</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search video assets..."
                    className="w-full bg-[#070708] border border-zinc-800 focus:border-amber-500/60 rounded-md pl-9 pr-3 py-2 text-xs font-sans text-zinc-100 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Origin-Aware Dropdown */}
              <div className="space-y-1 relative">
                <label className="text-[10px] font-mono text-zinc-500 uppercase">Origin-Aware Dropdown</label>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full bg-[#070708] border border-zinc-800 hover:border-zinc-700 rounded-md px-3 py-2 text-xs font-mono text-zinc-300 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>Select Engine Workflow</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0c0c0e] border border-zinc-800 rounded-md p-1 shadow-2xl z-20 space-y-0.5 text-xs font-mono animate-in fade-in zoom-in-95 duration-150">
                    {["Brain Hack Engine (v1.0)", "Reddit Story Engine", "Quiz Battle Engine"].map((opt) => (
                      <div
                        key={opt}
                        onClick={() => setDropdownOpen(false)}
                        className="px-2.5 py-1.5 hover:bg-zinc-900 text-zinc-300 rounded cursor-pointer transition-colors"
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tooltip Demonstration (Skip Delay on Subsequent) */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 uppercase">Smart Tooltip</label>
                <div className="flex gap-2 relative">
                  {["Render", "Inspect", "Export"].map((item) => (
                    <button
                      key={item}
                      onMouseEnter={() => setTooltipActive(item)}
                      onMouseLeave={() => setTooltipActive(null)}
                      className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-xs font-mono text-zinc-300 rounded-md transition-all relative cursor-pointer"
                    >
                      {item}
                      {tooltipActive === item && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-amber-400 rounded shadow-xl whitespace-nowrap z-30 animate-in fade-in duration-100">
                          Click to execute {item.toLowerCase()}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: VIDEO CONTROLS & MEDIA CANVAS */}
        <section className="space-y-4">
          <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-widest">
              3. Video Controls & Direct Scrubber Tracking
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">1:1 Pointer Tracking • Transport Bar</span>
          </div>

          <div className="bg-[#121215] border border-zinc-800/80 rounded-xl p-6 flex flex-col md:flex-row gap-6">
            {/* 9:16 Video Player Surface */}
            <div className="w-64 aspect-[9/16] bg-black rounded-lg border border-zinc-800 relative overflow-hidden flex flex-col justify-between p-4 shrink-0 mx-auto shadow-2xl">
              <div className="flex justify-between items-center z-10">
                <span className="px-2 py-0.5 bg-black/60 border border-amber-500/30 text-amber-400 text-[9px] font-mono font-bold rounded">
                  LIVE VIEWPORT
                </span>
                <span className="text-[10px] font-mono text-zinc-400">00:04:12</span>
              </div>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto my-auto z-10 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-amber-400" /> : <Play className="w-6 h-6 fill-amber-400 ml-1" />}
              </button>

              <div className="space-y-2 z-10">
                <div className="text-xs font-bold text-zinc-100">Why 90% of Brain Energy is Wasted</div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${scrubberPos}%` }} />
                </div>
              </div>
            </div>

            {/* Transport Scrubber Controls */}
            <div className="flex-1 space-y-6 flex flex-col justify-center">
              <div className="p-4 bg-[#070708] border border-zinc-850 rounded-xl space-y-4">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Direct Scrubber Position</span>
                  <span className="text-amber-400 font-bold">{scrubberPos}% (00:05.2)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scrubberPos}
                  onChange={(e) => setScrubberPos(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-[#070708] border border-zinc-850 rounded-xl space-y-4">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Audio Volume Gain</span>
                  <span className="text-emerald-400 font-bold">{volume}% (+0.2 dB)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-mono text-amber-400 rounded-md flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
                >
                  <HelpCircle className="w-4 h-4" /> Open Decision Context Drawer ("Why?")
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: PRODUCTION STATES */}
        <section className="space-y-4">
          <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-widest">
              4. Coherent State Language (Non-Color Relying Indicators)
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">Accessible Icons + Plain Text</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "IDLE", status: "Awaiting Input", icon: Activity, color: "text-zinc-400 border-zinc-800 bg-zinc-950" },
              { label: "CREATING", status: "Scripting Scene", icon: Sparkles, color: "text-blue-400 border-blue-500/30 bg-blue-500/5" },
              { label: "RENDERING", status: "FFmpeg 60FPS", icon: Cpu, color: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
              { label: "READY", status: "Render Complete", icon: Check, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" },
              { label: "NEEDS REVIEW", status: "Guardian Flagged", icon: AlertCircle, color: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
              { label: "ERROR", status: "Timeout Retry", icon: AlertCircle, color: "text-rose-400 border-rose-500/30 bg-rose-500/5" },
              { label: "UNAVAILABLE", status: "Offline Node", icon: X, color: "text-zinc-500 border-zinc-800 bg-zinc-950" },
              { label: "LOCKED", status: "Pro Entitlement", icon: Lock, color: "text-purple-400 border-purple-500/30 bg-purple-500/5" },
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.label} className={`p-3 border rounded-lg font-mono text-xs flex flex-col justify-between ${st.color}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{st.label}</span>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] text-zinc-400">{st.status}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Contextual Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-96 h-full bg-[#0c0c0e] border-l border-zinc-800 p-6 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4 font-mono">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" /> Contextual Drawer Surface
                </h3>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 hover:bg-zinc-900 text-zinc-400 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-mono text-zinc-300">
                <p>
                  This floating drawer layer demonstrates Apple's translucent surface material guidelines and Emil's spring transition behavior.
                </p>
                <div className="p-3 bg-[#070708] border border-zinc-850 rounded space-y-1">
                  <span className="text-[10px] text-zinc-500 block uppercase">Interruptibility Check</span>
                  <div className="text-emerald-400 font-bold">● Pass (Spring animation responds instantly to escape)</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setDrawerOpen(false)}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono font-bold text-zinc-200 rounded-md"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
