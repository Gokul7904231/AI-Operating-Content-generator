"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  FolderOpen,
  Plus,
  Sparkles,
  Layers,
  HelpCircle,
  Volume2,
  Maximize2,
} from "lucide-react";

export default function WorkspaceDirectionA() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState("v1");
  const [timecode, setTimecode] = useState("00:00:04:12");

  return (
    <div className="h-screen w-screen bg-[#070708] text-zinc-100 flex flex-col font-sans overflow-hidden select-none">
      {/* Workspace Header */}
      <header className="h-12 border-b border-zinc-800 bg-[#0c0c0e] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold rounded">
            WORKSPACE A
          </div>
          <h1 className="text-xs font-bold font-mono tracking-wider text-zinc-200">
            THE STUDIO — Multitrack NLE Timeline & Video Monitor
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <Link href="/prototypes/design-system" className="hover:text-zinc-200">
            ← Design Lab
          </Link>
          <Link href="/prototypes/workspace-b" className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded">
            Workspace B →
          </Link>
        </div>
      </header>

      {/* Main Studio Grid */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Asset Bin */}
        <aside className="w-64 border-r border-zinc-800 bg-[#0c0c0e] flex flex-col shrink-0">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> Asset Bin
            </span>
            <button className="p-1 hover:bg-zinc-900 text-zinc-400 rounded">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1 nle-scroll font-mono text-xs">
            {[
              { name: "Scene 1: Hook Video", duration: "00:03.5", type: "Visual" },
              { name: "Scene 2: Brain Synapses", duration: "00:04.2", type: "Visual" },
              { name: "ElevenLabs Voiceover", duration: "00:12.8", type: "Audio" },
            ].map((item, idx) => (
              <div key={idx} className="p-2.5 bg-zinc-950 border border-zinc-850 rounded hover:border-zinc-700 cursor-pointer">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-[11px] text-zinc-200">{item.name}</span>
                  <span className="text-[9px] px-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded">{item.type}</span>
                </div>
                <div className="text-[10px] text-zinc-500">{item.duration}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: Video Viewport Monitor */}
        <main className="flex-1 bg-[#050506] flex flex-col justify-between p-4 relative overflow-hidden">
          <div className="flex justify-between items-center z-10 text-xs font-mono text-zinc-400">
            <span>NLE VIEWPORT MONITOR</span>
            <span className="text-amber-400 font-bold">{timecode}</span>
          </div>

          <div className="flex-1 flex items-center justify-center relative">
            <div className="w-72 aspect-[9/16] bg-black rounded-lg border border-zinc-800 relative overflow-hidden shadow-2xl flex flex-col justify-between p-4 group">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-zinc-900/40 to-black pointer-events-none" />

              <div className="relative z-10 text-center pt-4">
                <span className="px-2 py-0.5 bg-black/60 border border-amber-500/30 text-amber-400 text-[9px] font-mono uppercase tracking-widest rounded">
                  Hook #01
                </span>
                <h3 className="text-sm font-extrabold text-zinc-50 mt-4 leading-tight">
                  Why 90% of Brain Energy is Wasted Before Noon
                </h3>
              </div>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto my-auto relative z-10 hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-amber-400" /> : <Play className="w-6 h-6 fill-amber-400 ml-1" />}
              </button>

              <div className="relative z-10 space-y-2">
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-1/3" />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                  <span>00:04.2</span>
                  <span>00:15.0</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-10 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPlaying(!isPlaying)} className="p-1 text-zinc-300 hover:text-white">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button className="p-1 text-zinc-400 hover:text-zinc-200">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs font-mono text-zinc-400">PLAYHEAD: {timecode}</span>
            <div className="flex items-center gap-2 text-zinc-400">
              <Volume2 className="w-4 h-4" />
              <Maximize2 className="w-4 h-4" />
            </div>
          </div>
        </main>

        {/* Right: Parameter Inspector */}
        <aside className="w-72 border-l border-zinc-800 bg-[#0c0c0e] flex flex-col shrink-0 p-4 space-y-4 font-mono text-xs">
          <div className="border-b border-zinc-800 pb-2 flex items-center justify-between text-zinc-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-amber-400" /> Track Inspector</span>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase">Scene Prompt</label>
            <textarea
              className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-200 outline-none"
              defaultValue="Close up shot of human brain synapses firing illuminated in electric blue neural lighting."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 uppercase">TTS Voice Pacing</label>
            <input type="range" className="w-full accent-amber-500" min="0.8" max="1.5" step="0.05" defaultValue="1.15" />
          </div>
        </aside>
      </div>

      {/* Bottom Timeline Panel */}
      <footer className="h-40 border-t border-zinc-800 bg-[#0a0a0c] flex flex-col shrink-0 p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 border-b border-zinc-850 pb-1">
          <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-amber-400" /> MULTITRACK TIMELINE</span>
          <div className="flex gap-6"><span>00:00.0</span><span>00:03.0</span><span>00:06.0</span><span>00:09.0</span><span>00:12.0</span></div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="w-16 text-zinc-500">V1: Visuals</span>
            <div className="flex-1 h-7 bg-zinc-950 border border-zinc-800 rounded p-0.5 flex gap-1">
              <div className="w-1/3 bg-amber-500/20 border border-amber-500/40 rounded flex items-center px-2 text-amber-300 truncate">Scene 1 (Hook)</div>
              <div className="w-2/3 bg-blue-500/20 border border-blue-500/40 rounded flex items-center px-2 text-blue-300 truncate">Scene 2 (Synapse)</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="w-16 text-zinc-500">A1: Voice</span>
            <div className="flex-1 h-7 bg-zinc-950 border border-zinc-800 rounded p-0.5">
              <div className="w-full bg-emerald-500/20 border border-emerald-500/40 rounded flex items-center px-2 text-emerald-300 truncate">ElevenLabs Voiceover Stream</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
