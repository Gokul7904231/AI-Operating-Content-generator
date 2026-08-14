"use client";

import React, { useState } from "react";
import { TopNav } from "@/components/new-ui/TopNav";
import { Sidebar } from "@/components/new-ui/Sidebar";
import { Panel } from "@/components/new-ui/Panel";
import { CommandPalette } from "@/components/new-ui/CommandPalette";
import { BarChart3, Activity, Cpu, Clock, CheckCircle2 } from "lucide-react";

export default function AnalyticsPage() {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#070708] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav title="Pipeline Analytics & Render Telemetry" onOpenCommand={() => setCmdOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 nle-scroll">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Panel className="p-3">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Total Render Pass Rate</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">99.2%</p>
            </Panel>
            <Panel className="p-3">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Avg Render Latency</span>
              <p className="text-2xl font-bold font-mono text-zinc-100 mt-1">22.4s</p>
            </Panel>
            <Panel className="p-3">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">FFmpeg Worker Efficiency</span>
              <p className="text-2xl font-bold font-mono text-blue-400 mt-1">94.8%</p>
            </Panel>
            <Panel className="p-3">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">TTS Voice Latency</span>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">1.8s</p>
            </Panel>
          </div>

          <Panel title="Real-Time Worker Node Performance">
            <div className="space-y-3 font-mono text-xs">
              {[
                { node: "worker-az-us-east-1", status: "HEALTHY", cpu: "42%", ram: "3.2GB / 8GB", jobs: "124" },
                { node: "worker-az-us-east-2", status: "HEALTHY", cpu: "38%", ram: "2.8GB / 8GB", jobs: "98" },
                { node: "worker-az-us-east-3", status: "HEALTHY", cpu: "55%", ram: "4.1GB / 8GB", jobs: "142" },
              ].map((worker) => (
                <div key={worker.node} className="p-3 bg-zinc-950/80 border border-zinc-800 rounded flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">{worker.node}</span>
                  <div className="flex items-center gap-4 text-zinc-400">
                    <span>CPU: {worker.cpu}</span>
                    <span>RAM: {worker.ram}</span>
                    <span>Jobs: {worker.jobs}</span>
                    <span className="text-emerald-400 font-semibold">{worker.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
