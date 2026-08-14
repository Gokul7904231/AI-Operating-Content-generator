"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Film,
  Layers,
  Sliders,
  FolderOpen,
  Plus,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Maximize2,
  Volume2,
  Share2,
} from "lucide-react";

export default function PrototypeDirectionA() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState("scene-1");
  const [currentTimecode, setCurrentTimecode] = useState("00:00:04:12");

  return (
    <div className="h-screen w-screen bg-[#070708] text-zinc-100 flex flex-col font-sans overflow-hidden select-none">
      {/* Top Header Rail */}
      <header className="h-12 border-b border-zinc-800/80 bg-[#0c0c0e] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold rounded">
            PROTOTYPE A
          </div>
          <h1 className="text-xs font-bold font-mono tracking-wider text-zinc-200">
            THE STUDIO — Professional Creative NLE Suite
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <span>PROJECT: <strong className="text-zinc-200">Brain Hack Short #042</strong></span>
          <span>FORMAT: <strong className="text-amber-400">9:16 (1080x1920)</strong></span>
          <Link
            href="/prototypes/direction-b"
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[11px] text-zinc-300 transition-colors"
          >
            Switch to Prototype B →
          </Link>
        </div>
      </header>

      {/* Main Studio Editor Grid */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Asset & Scene Bin */}
        <aside className="w-64 border-r border-zinc-800/80 bg-[#0c0c0e]/80 flex flex-col shrink-0">
          <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> Asset Bin
            </span>
            <button className="p-1 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-2 space-y-2 overflow-y-auto flex-1 nle-scroll">
            {[
              { id: 1, name: "Scene 1: Hook Video", duration: "00:03.5", type: "Visual" },
              { id: 2, name: "Scene 2: Brain Synapse", duration: "00:04.2", type: "Visual" },
              { id: 3, name: "Scene 3: Deep Work", duration: "00:05.1", type: "Visual" },
              { id: 4, name: "ElevenLabs Voiceover", duration: "00:12.8", type: "Audio" },
              { id: 5, name: "Cinematic Ambient Bed", duration: "00:15.0", type: "Audio" },
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveTrack(`scene-${item.id}`)}
                className={`p-2.5 rounded border text-xs cursor-pointer transition-all ${
                  activeTrack === `scene-${item.id}`
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                    : "bg-zinc-950/60 border-zinc-850 hover:bg-zinc-900/60 text-zinc-300"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-[11px] truncate">{item.name}</span>
                  <span className="text-[9px] font-mono px-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded">
                    {item.type}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500">{item.duration}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: 9:16 Video Monitor Canvas */}
        <main className="flex-1 bg-[#050506] flex flex-col justify-between p-4 relative overflow-hidden">
          {/* Top Video Transport Overlay */}
          <div className="flex justify-between items-center mb-2 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400">NLE VIEWPORT MONITOR</span>
            </div>
            <span className="text-sm font-mono text-amber-400 font-bold tracking-wider">
              {currentTimecode}
            </span>
          </div>

          {/* 9:16 Video Stage */}
          <div className="flex-1 flex items-center justify-center relative">
            <div className="w-72 aspect-[9/16] bg-black rounded-lg border border-zinc-800 relative overflow-hidden shadow-2xl flex flex-col justify-between p-4 group">
              {/* Simulated Rendered Frame Background */}
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/40 via-purple-950/20 to-black pointer-events-none" />

              {/* Video Overlay Text */}
              <div className="relative z-10 pt-6 text-center">
                <span className="px-2 py-0.5 bg-black/60 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase tracking-widest rounded">
                  Hook #01
                </span>
                <h3 className="text-sm font-extrabold text-zinc-50 mt-4 leading-tight tracking-tight drop-shadow-md">
                  Why 90% of Brain Energy is Wasted Before Noon
                </h3>
              </div>

              {/* Center Play Button Overlay */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto my-auto relative z-10 hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-amber-400" /> : <Play className="w-6 h-6 fill-amber-400 ml-1" />}
              </button>

              {/* Bottom Scrubber */}
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

          {/* Transport Control Controls Bar */}
          <div className="h-10 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-center justify-between px-4 mt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 hover:bg-zinc-900 text-zinc-300 rounded transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button className="p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs font-mono text-zinc-400">PLAYHEAD: 00:04:12</span>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-zinc-400" />
              <Maximize2 className="w-4 h-4 text-zinc-400" />
            </div>
          </div>
        </main>

        {/* Right: Parameter Inspector Panel */}
        <aside className="w-72 border-l border-zinc-800/80 bg-[#0c0c0e]/80 flex flex-col shrink-0">
          <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" /> Track Inspector
            </span>
          </div>

          <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1 nle-scroll">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Scene Prompt Context</label>
              <textarea
                className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-200 focus:border-amber-500/50 outline-none"
                defaultValue="Close up shot of human brain synapses firing illuminated in electric blue neural lighting, cinematic 8k."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Voiceover Model & Rate</label>
              <select className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300 outline-none">
                <option>ElevenLabs — Adam (Deep Narrative)</option>
                <option>ElevenLabs — Rachel (High Energy)</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-zinc-500">Pacing Density</span>
                <span className="text-amber-400">1.15x</span>
              </div>
              <input type="range" className="w-full accent-amber-500" min="0.8" max="1.5" step="0.05" defaultValue="1.15" />
            </div>

            <div className="pt-4 border-t border-zinc-800/80">
              <button className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Re-Render Scene #1
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom: Multitrack Timeline Panel */}
      <footer className="h-44 border-t border-zinc-800/80 bg-[#0a0a0c] flex flex-col shrink-0">
        <div className="h-8 border-b border-zinc-800/80 px-4 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-amber-400" /> MULTITRACK TIMELINE EDITOR
          </span>
          <div className="flex gap-6">
            <span>00:00.0</span>
            <span>00:03.0</span>
            <span>00:06.0</span>
            <span>00:09.0</span>
            <span>00:12.0</span>
            <span>00:15.0</span>
          </div>
        </div>

        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
          {/* Track 1: Visuals */}
          <div className="flex items-center gap-2">
            <span className="w-20 text-[10px] font-mono text-zinc-500 truncate">V1: Visuals</span>
            <div className="flex-1 h-7 bg-zinc-950 border border-zinc-800/80 rounded flex gap-1 p-0.5">
              <div className="w-1/4 h-full bg-amber-500/20 border border-amber-500/40 rounded text-[9px] font-mono text-amber-300 flex items-center px-2">
                Scene 1 (Hook)
              </div>
              <div className="w-1/3 h-full bg-blue-500/20 border border-blue-500/40 rounded text-[9px] font-mono text-blue-300 flex items-center px-2">
                Scene 2 (Synapse)
              </div>
              <div className="w-5/12 h-full bg-purple-500/20 border border-purple-500/40 rounded text-[9px] font-mono text-purple-300 flex items-center px-2">
                Scene 3 (Deep Work)
              </div>
            </div>
          </div>

          {/* Track 2: Voiceover */}
          <div className="flex items-center gap-2">
            <span className="w-20 text-[10px] font-mono text-zinc-500 truncate">A1: Voice</span>
            <div className="flex-1 h-7 bg-zinc-950 border border-zinc-800/80 rounded p-0.5">
              <div className="w-11/12 h-full bg-emerald-500/20 border border-emerald-500/40 rounded text-[9px] font-mono text-emerald-300 flex items-center px-2">
                ElevenLabs TTS Stream Track
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
