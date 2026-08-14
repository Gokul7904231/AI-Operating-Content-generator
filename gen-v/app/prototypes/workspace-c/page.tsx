"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Sparkles,
  Layers,
  Cpu,
  Volume2,
  Maximize2,
  Sliders,
  CheckCircle2,
  HelpCircle,
  X,
  Share2,
} from "lucide-react";

export default function WorkspaceDirectionC() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNode, setActiveNode] = useState("render");
  const [showWhyDrawer, setShowWhyDrawer] = useState(false);

  return (
    <div className="h-screen w-screen bg-[#070708] text-zinc-100 flex flex-col font-sans overflow-hidden select-none">
      {/* Workspace Header */}
      <header className="h-12 border-b border-zinc-800 bg-[#0c0c0e] px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold rounded">
            WORKSPACE C
          </div>
          <h1 className="text-xs font-bold font-mono tracking-wider text-zinc-200">
            THE PRODUCTION CANVAS — Spatial Modular Node Workspace
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <Link href="/prototypes/workspace-b" className="hover:text-zinc-200">
            ← Workspace B
          </Link>
          <Link href="/prototypes/design-system" className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded">
            Design Lab →
          </Link>
        </div>
      </header>

      {/* Main Spatial Infinite Node Canvas Grid */}
      <div className="flex-1 flex min-h-0 relative bg-[#050506] overflow-hidden">
        {/* Subtle Node Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f26_1px,transparent_1px),linear-gradient(to_bottom,#1f1f26_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-6 relative z-10 overflow-y-auto nle-scroll">
          {/* Node 1: Topic & Script Node */}
          <div
            onClick={() => setActiveNode("script")}
            className={`w-72 bg-[#121215] border rounded-xl p-4 space-y-3 cursor-pointer transition-all ${
              activeNode === "script" ? "border-amber-500/60 ring-1 ring-amber-500/30 shadow-2xl" : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 1. Script Node
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                COMPLETED
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <label className="text-[10px] text-zinc-500 uppercase block">Topic Prompt</label>
              <div className="p-2 bg-zinc-950 border border-zinc-850 rounded text-zinc-200 text-[11px]">
                Why 90% of Brain Energy is Wasted Before Noon
              </div>
            </div>

            <div className="text-[10px] font-mono text-zinc-500 flex justify-between pt-1">
              <span>MODEL: Llama-3.3-70b</span>
              <span>SCORE: 0.94</span>
            </div>
          </div>

          {/* Node Link Line */}
          <div className="hidden md:block w-8 h-0.5 bg-gradient-to-r from-amber-500/40 to-blue-500/40 shrink-0" />

          {/* Node 2: Voice & Audio Node */}
          <div
            onClick={() => setActiveNode("voice")}
            className={`w-72 bg-[#121215] border rounded-xl p-4 space-y-3 cursor-pointer transition-all ${
              activeNode === "voice" ? "border-blue-500/60 ring-1 ring-blue-500/30 shadow-2xl" : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-[11px] font-mono text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> 2. Voice Node
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                STREAMED
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <label className="text-[10px] text-zinc-500 uppercase block">ElevenLabs Voice Model</label>
              <div className="p-2 bg-zinc-950 border border-zinc-850 rounded text-zinc-200 text-[11px]">
                Adam (Deep Narrative • 1.15x Pacing)
              </div>
            </div>

            <div className="text-[10px] font-mono text-zinc-500 flex justify-between pt-1">
              <span>AUDIO DURATION: 12.8s</span>
              <span>CODEC: AAC</span>
            </div>
          </div>

          {/* Node Link Line */}
          <div className="hidden md:block w-8 h-0.5 bg-gradient-to-r from-blue-500/40 to-emerald-500/40 shrink-0" />

          {/* Node 3: Hero Render Viewport Node */}
          <div
            onClick={() => setActiveNode("render")}
            className={`w-80 bg-[#121215] border rounded-xl p-5 space-y-4 cursor-pointer transition-all ${
              activeNode === "render" ? "border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-2xl" : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> 3. Render Viewport Node
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWhyDrawer(true);
                }}
                className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] font-mono rounded flex items-center gap-1 hover:border-amber-500/50 transition-colors"
              >
                <HelpCircle className="w-3 h-3 text-amber-400" /> Why?
              </button>
            </div>

            {/* Viewport Canvas */}
            <div className="w-full aspect-[9/16] bg-black rounded-lg border border-zinc-800 relative overflow-hidden flex flex-col justify-between p-4 shadow-xl">
              <div className="flex justify-between items-center z-10 text-[10px] font-mono text-zinc-400">
                <span className="text-emerald-400 font-bold">● RENDER COMPLETE</span>
                <span>00:15.0</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
                className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto my-auto z-10 hover:scale-105 active:scale-95 transition-transform"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-amber-400" /> : <Play className="w-6 h-6 fill-amber-400 ml-1" />}
              </button>

              <div className="space-y-2 z-10">
                <div className="text-xs font-bold text-zinc-100">Why 90% of Brain Energy is Wasted</div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Why Drawer */}
      {showWhyDrawer && (
        <aside className="fixed right-0 top-12 bottom-0 w-96 border-l border-zinc-800 bg-[#0c0c0e] p-6 flex flex-col justify-between z-50 animate-in slide-in-from-right duration-200 font-mono text-xs">
          <div>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Node Decision Context
              </h3>
              <button onClick={() => setShowWhyDrawer(false)} className="p-1 hover:bg-zinc-900 text-zinc-400 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded">
                <span className="text-[10px] text-zinc-500 uppercase block">Spatial Pipeline Linkage</span>
                <div className="text-[11px] text-zinc-300 mt-1">Script Node $\rightarrow$ Voice Node $\rightarrow$ Render Node</div>
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded">
                <span className="text-[10px] text-zinc-500 uppercase block">FFmpeg Hardware</span>
                <div className="text-emerald-400 mt-1">NVENC GPU Acceleration (1080x1920 @ 60fps in 8.4s)</div>
              </div>
            </div>
          </div>

          <button onClick={() => setShowWhyDrawer(false)} className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded font-bold">
            Close Explanation
          </button>
        </aside>
      )}
    </div>
  );
}
