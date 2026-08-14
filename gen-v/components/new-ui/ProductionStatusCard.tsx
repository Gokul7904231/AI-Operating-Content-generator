"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Terminal } from "lucide-react";

export interface ProductionStage {
  id: string;
  name: string;
  status: "idle" | "running" | "completed" | "error";
  detail?: string;
}

interface ProductionStatusCardProps {
  jobId?: string;
  title?: string;
  stages?: ProductionStage[];
  progressPercent?: number;
  elapsedSec?: number;
  estimatedSec?: number;
}

const DEFAULT_STAGES: ProductionStage[] = [
  { id: "prep", name: "Preparing", status: "completed", detail: "Validated prompt & 9:16 target ratio" },
  { id: "script", name: "Script Synthesis", status: "completed", detail: "Generated 14s hook & narration" },
  { id: "scene", name: "Scene Generation", status: "completed", detail: "Fetched 8 scene assets & clip vectors" },
  { id: "voice", name: "Voice Over", status: "completed", detail: "Synthesized Edge TTS audio track" },
  { id: "ffmpeg", name: "FFmpeg Render", status: "running", detail: "Compositing 8 scenes into 1080x1920 MP4" },
  { id: "encoding", name: "Encoding", status: "idle", detail: "H.264 video pass & audio muxing" },
  { id: "publishing", name: "Publishing", status: "idle", detail: "CDN upload & metadata indexing" },
];

export function ProductionStatusCard({
  jobId = "JOB-8942",
  title = "AI Video Generation Pipeline",
  stages = DEFAULT_STAGES,
  progressPercent = 76,
  elapsedSec = 18,
  estimatedSec = 7,
}: ProductionStatusCardProps) {
  const [showLogs, setShowLogs] = useState(false);

  const activeStage = stages.find((s) => s.status === "running") || stages[stages.length - 1];

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-[6px] p-4 font-sans text-zinc-100 shadow-xl nle-glass-edge">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h4 className="text-sm font-semibold text-zinc-200">{title}</h4>
        </div>
        <span className="text-xs font-mono text-zinc-500">{jobId}</span>
      </div>

      {/* Primary Human-Oriented Stage Detail */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-[4px] p-3 mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-mono text-blue-400 font-semibold uppercase tracking-wider">
            {activeStage.name}
          </span>
          <span className="font-mono text-zinc-400">{progressPercent}%</span>
        </div>
        <p className="text-xs text-zinc-300 mb-2.5">{activeStage.detail}</p>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Elapsed: 00:{elapsedSec < 10 ? `0${elapsedSec}` : elapsedSec}</span>
          <span>Est: ~{estimatedSec} sec remaining</span>
        </div>
      </div>

      {/* Stage Step Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`p-2 rounded-[4px] border text-xs flex items-center gap-1.5 ${
              stage.status === "completed"
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                : stage.status === "running"
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400 font-semibold"
                : stage.status === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-zinc-950/40 border-zinc-800/40 text-zinc-600"
            }`}
          >
            {stage.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            {stage.status === "running" && <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />}
            {stage.status === "error" && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {stage.status === "idle" && <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />}
            <span className="truncate text-[11px] font-mono">{stage.name}</span>
          </div>
        ))}
      </div>

      {/* Log Drawer Toggle */}
      <button
        onClick={() => setShowLogs(!showLogs)}
        className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 py-1 transition-colors"
      >
        <span className="flex items-center gap-1.5 font-mono text-[11px]">
          <Terminal className="w-3.5 h-3.5" /> Pipeline Telemetry Log
        </span>
        {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showLogs && (
        <div className="mt-2 p-2.5 bg-black border border-zinc-800/80 rounded font-mono text-[11px] text-zinc-400 space-y-1">
          <p className="text-zinc-500">[00:02] Hook generation complete (142 words/min)</p>
          <p className="text-zinc-500">[00:08] Edge TTS audio rendered: 24.2KB</p>
          <p className="text-blue-400">[00:15] FFmpeg pass 1: 1080x1920 @ 30FPS</p>
          <p className="text-zinc-500">[00:18] Worker node: worker-az-us-east-4</p>
        </div>
      )}
    </div>
  );
}
