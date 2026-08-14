"use client";

import React, { useState } from "react";
import { TopNav } from "@/components/new-ui/TopNav";
import { Sidebar } from "@/components/new-ui/Sidebar";
import { Panel } from "@/components/new-ui/Panel";
import { VideoViewport } from "@/components/new-ui/VideoViewport";
import { ProductionStatusCard } from "@/components/new-ui/ProductionStatusCard";
import { CommandPalette } from "@/components/new-ui/CommandPalette";
import { Button } from "@/components/new-ui/Button";
import { Sparkles, Film, Cpu, Activity, Clock, Play, ArrowUpRight } from "lucide-react";

export default function StudioDashboardPage() {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#070708] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav title="Studio Command Center" onOpenCommand={() => setCmdOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 nle-scroll">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Panel className="p-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1">
                <span>TOTAL RENDERS</span>
                <Film className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-100">142</p>
              <span className="text-[11px] text-emerald-400 font-mono">+12 this week</span>
            </Panel>

            <Panel className="p-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1">
                <span>ACTIVE WORKERS</span>
                <Cpu className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-100">4 / 4</p>
              <span className="text-[11px] text-emerald-400 font-mono">100% capacity</span>
            </Panel>

            <Panel className="p-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1">
                <span>AVG RENDER TIME</span>
                <Clock className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-zinc-100">22.4s</p>
              <span className="text-[11px] text-zinc-500 font-mono">1080x1920 @ 30FPS</span>
            </Panel>

            <Panel className="p-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1">
                <span>PIPELINE HEALTH</span>
                <Activity className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-400">OPTIMAL</p>
              <span className="text-[11px] text-zinc-500 font-mono">0 queued failures</span>
            </Panel>
          </div>

          {/* Main NLE Production Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Active Production Pipeline & Telemetry */}
            <div className="lg:col-span-7 space-y-6">
              <ProductionStatusCard
                jobId="JOB-9041"
                title="Active Short-Form Render"
                progressPercent={76}
                elapsedSec={18}
                estimatedSec={7}
              />

              <Panel title="Recent Production Jobs">
                <div className="space-y-2">
                  {[
                    { id: "JOB-9040", name: "Why AI Workflows Are Exploding", status: "READY", time: "2 mins ago" },
                    { id: "JOB-9039", name: "The 3-Second Brain Hack", status: "READY", time: "14 mins ago" },
                    { id: "JOB-9038", name: "Space Startups Build Fast", status: "READY", time: "1 hour ago" },
                  ].map((job) => (
                    <div
                      key={job.id}
                      className="p-2.5 bg-zinc-950/60 border border-zinc-800/60 rounded-[4px] flex items-center justify-between text-xs hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-zinc-500">{job.id}</span>
                        <span className="font-semibold text-zinc-200">{job.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] rounded">
                          {job.status}
                        </span>
                        <span className="text-zinc-500 text-[11px] font-mono">{job.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Right 5 Columns: NLE Hero Video Viewport */}
            <div className="lg:col-span-5">
              <Panel title="Live Viewport Preview">
                <VideoViewport
                  title="Why AI Workflows Are Exploding"
                  timecode="00:00:18:12"
                  codec="H.264 / 1080x1920"
                  fps={30}
                />
              </Panel>
            </div>
          </div>
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
