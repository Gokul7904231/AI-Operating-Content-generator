"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Sparkles,
  HelpCircle,
  X,
  CheckCircle2,
  ArrowRight,
  Sliders,
  RotateCcw,
  Layers,
} from "lucide-react";

export default function WorkspaceDirectionB() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStage, setActiveStage] = useState<"idea" | "script" | "scenes" | "voice" | "render">("render");
  const [showWhyDrawer, setShowWhyDrawer] = useState(false);
  const [promptText, setPromptText] = useState("Why 90% of Brain Energy is Wasted Before Noon");

  return (
    <div className="h-screen w-screen bg-[#070708] text-zinc-100 flex flex-col font-sans overflow-hidden select-none">
      {/* Workspace Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-[#0c0c0e]/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold rounded">
            WORKSPACE B
          </div>
          <h1 className="text-sm font-bold tracking-tight text-zinc-100 font-sans">
            THE SPATIAL FACTORY — Progressive Stage Stepper & Hero Canvas
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <Link href="/prototypes/workspace-a" className="hover:text-zinc-200">
            ← Workspace A
          </Link>
          <Link href="/prototypes/workspace-c" className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded">
            Workspace C →
          </Link>
        </div>
      </header>

      {/* Main Studio Spatial Layout */}
      <div className="flex-1 flex min-h-0 relative">
        <main className="flex-1 flex flex-col justify-between p-6 overflow-y-auto nle-scroll">
          {/* Top Prompt Input */}
          <div className="max-w-3xl mx-auto w-full">
            <div className="bg-zinc-900/60 border border-zinc-800 focus-within:border-amber-500/60 rounded-xl p-2.5 flex items-center gap-3 shadow-xl transition-all">
              <Sparkles className="w-4 h-4 text-amber-400 ml-2 shrink-0" />
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Transform your idea into a short-form video..."
                className="w-full bg-transparent text-sm font-medium text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
              <button className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 active:scale-[0.97]">
                Generate <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center Stage: Hero 9:16 Video Player */}
          <div className="flex-1 flex items-center justify-center my-6 relative">
            <div className="w-80 aspect-[9/16] bg-black rounded-xl border border-zinc-800/80 relative overflow-hidden shadow-2xl flex flex-col justify-between p-5 group">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-zinc-900/40 to-black pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2 py-0.5 bg-black/60 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold rounded">
                  READY
                </span>
                <button
                  onClick={() => setShowWhyDrawer(true)}
                  className="px-2.5 py-1 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-[11px] font-mono rounded flex items-center gap-1 transition-colors"
                >
                  <HelpCircle className="w-3 h-3 text-amber-400" /> Why?
                </button>
              </div>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto my-auto relative z-10 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                {isPlaying ? <Pause className="w-7 h-7 fill-amber-400" /> : <Play className="w-7 h-7 fill-amber-400 ml-1" />}
              </button>

              <div className="relative z-10 space-y-3">
                <h3 className="text-sm font-bold text-zinc-50 leading-tight">
                  {promptText}
                </h3>
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                  <span>00:15.0 • 1080x1920</span>
                  <span className="text-emerald-400 font-bold">● Render Complete</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 5-Stage Spatial Stepper */}
          <div className="max-w-3xl mx-auto w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 text-xs font-mono">
              {[
                { id: "idea", label: "1. Idea" },
                { id: "script", label: "2. Script" },
                { id: "scenes", label: "3. Scenes" },
                { id: "voice", label: "4. Voice" },
                { id: "render", label: "5. Render" },
              ].map((stage, idx, arr) => (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => setActiveStage(stage.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all active:scale-[0.97] ${
                      activeStage === stage.id
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{stage.label}</span>
                  </button>
                  {idx < arr.length - 1 && <span className="text-zinc-700">➔</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </main>

        {/* Right Contextual Why Drawer */}
        {showWhyDrawer && (
          <aside className="w-96 border-l border-zinc-800 bg-[#0c0c0e] flex flex-col justify-between p-6 z-40 animate-in slide-in-from-right duration-200 font-mono text-xs">
            <div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" /> Contextual Explanation
                </h3>
                <button onClick={() => setShowWhyDrawer(false)} className="p-1 hover:bg-zinc-900 text-zinc-400 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded">
                  <span className="text-[10px] text-zinc-500 uppercase block">Internal 9-Stage Execution</span>
                  <div className="text-[11px] text-zinc-300 mt-1">Topic $\rightarrow$ Script $\rightarrow$ Guardian $\rightarrow$ Voice $\rightarrow$ Assets $\rightarrow$ Renderer $\rightarrow$ Validation $\rightarrow$ Upload $\rightarrow$ Publish</div>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded">
                  <span className="text-[10px] text-zinc-500 uppercase block">Voiceover Model</span>
                  <div className="text-zinc-200 mt-1">ElevenLabs TTS stream (Voice: Adam, Pacing 1.15x)</div>
                </div>
              </div>
            </div>

            <button onClick={() => setShowWhyDrawer(false)} className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded font-bold">
              Close Explanation
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
