"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Cpu,
  HardDrive,
  Zap,
  Terminal,
  CheckCircle2,
  RefreshCw,
  Search,
  Server,
  Play,
  Share2,
} from "lucide-react";

export default function PrototypeDirectionB() {
  const [selectedSubsystem, setSelectedSubsystem] = useState("Renderer");

  return (
    <div className="h-screen w-screen bg-[#070708] text-zinc-100 flex flex-col font-mono overflow-hidden select-none">
      {/* Header Command Bar */}
      <header className="h-14 border-b border-zinc-800 bg-[#0c0c0e] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded">
            PROTOTYPE B
          </div>
          <h1 className="text-sm font-bold tracking-tight text-zinc-100">
            THE COMMAND CENTER — Evolved Operational Control Tower
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-500">SYSTEM STATUS: <strong className="text-emerald-400">9/9 ONLINE</strong></span>
          <Link
            href="/prototypes/direction-c"
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-zinc-300 transition-colors"
          >
            Switch to Prototype C →
          </Link>
        </div>
      </header>

      {/* Main Command Center Dashboard */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto nle-scroll">
        {/* 1. 9-Subsystem Health Grid Header */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" /> FactoryOS 9-Subsystem Control Plane
            </span>
            <span className="text-[10px] text-zinc-500">SSE Stream Active (100ms sync)</span>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-9 gap-2 text-xs">
            {[
              { name: "Providers", status: "LIVE", color: "text-emerald-400" },
              { name: "Queue", status: "LIVE", color: "text-emerald-400" },
              { name: "Database", status: "LIVE", color: "text-emerald-400" },
              { name: "Scheduler", status: "LIVE", color: "text-emerald-400" },
              { name: "Storage", status: "LIVE", color: "text-emerald-400" },
              { name: "Drive", status: "LIVE", color: "text-emerald-400" },
              { name: "Renderer", status: "LIVE", color: "text-emerald-400" },
              { name: "Auth", status: "LIVE", color: "text-emerald-400" },
              { name: "Runtime", status: "LIVE", color: "text-emerald-400" },
            ].map((sub) => (
              <div
                key={sub.name}
                onClick={() => setSelectedSubsystem(sub.name)}
                className={`p-2 bg-zinc-950/80 border rounded cursor-pointer transition-colors ${
                  selectedSubsystem === sub.name ? "border-amber-500/60 bg-amber-500/5" : "border-zinc-850 hover:border-zinc-700"
                }`}
              >
                <span className="text-[9px] text-zinc-500 block uppercase">{sub.name}</span>
                <span className={`text-[10px] font-bold mt-1 block ${sub.color}`}>● {sub.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Worker Core Allocation & Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 uppercase">Worker Node Cores</span>
            <span className="text-2xl font-bold text-zinc-100 mt-2">16 Cores</span>
            <span className="text-[10px] text-emerald-400 mt-1">Concurreny Conductor Active</span>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 uppercase">Render Queue Jobs</span>
            <span className="text-2xl font-bold text-amber-400 mt-2">4 Active</span>
            <span className="text-[10px] text-zinc-500 mt-1">Avg 14.2s per job</span>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 uppercase">Storage Pipeline</span>
            <span className="text-2xl font-bold text-blue-400 mt-2">Google Drive</span>
            <span className="text-[10px] text-zinc-500 mt-1">Cloudinary CDN backup</span>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 uppercase">Est. Render Cost</span>
            <span className="text-2xl font-bold text-emerald-400 mt-2">$0.0014 / min</span>
            <span className="text-[10px] text-zinc-500 mt-1">Local FFmpeg Optimization</span>
          </div>
        </div>

        {/* 3. Live Execution Stream & Output Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Execution Log Stream */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
              <span className="text-xs text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" /> Live Execution Stream
              </span>
              <span className="text-[10px] text-zinc-500">Worker ID: worker_40592</span>
            </div>

            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-850 h-64 overflow-y-auto text-xs space-y-1 text-zinc-400 font-mono nle-scroll">
              <div className="text-zinc-500">[14:32:01] [WorkflowLoader] Registered workflow: "Brain Hack Engine" (v1.0)</div>
              <div className="text-emerald-400">[14:32:02] [ScriptStep] Script generated via Groq Llama-3.3-70b in 420ms</div>
              <div className="text-blue-400">[14:32:03] [VoiceStep] ElevenLabs TTS stream buffered (12.8s audio)</div>
              <div className="text-purple-400">[14:32:05] [SceneStep] 3 scenes generated & validated by Guardian</div>
              <div className="text-amber-400">[14:32:08] [RenderWorker] FFmpeg rendering 1080x1920 @ 60fps... (Frame 450/900)</div>
              <div className="text-zinc-500">[14:32:12] [StorageQueue] Uploading asset to Google Drive...</div>
              <div className="text-emerald-400">[14:32:14] [PublishingRegistry] Post scheduled for YouTube Shorts & TikTok</div>
            </div>
          </div>

          {/* Right: Output Telemetry Preview */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
              <span className="text-xs text-zinc-300 font-bold uppercase tracking-wider">
                Output Monitor
              </span>
              <span className="text-[10px] text-emerald-400">READY FOR PUBLISH</span>
            </div>

            <div className="flex gap-4 items-center">
              <div className="w-28 aspect-[9/16] bg-black rounded border border-zinc-800 relative overflow-hidden flex items-center justify-center shrink-0">
                <Play className="w-8 h-8 text-amber-400 fill-amber-400" />
              </div>
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-zinc-200">The 3-Second Brain Hack</h4>
                <div className="text-[11px] text-zinc-500 space-y-1">
                  <div>CODEC: H.264 / AAC</div>
                  <div>BITRATE: 12.4 Mbps</div>
                  <div>FPS: 60 fps</div>
                  <div>SIZE: 14.2 MB</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
