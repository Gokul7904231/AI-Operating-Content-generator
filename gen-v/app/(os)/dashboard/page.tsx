"use client";

import React, { useEffect } from "react";
import { useFactoryStore } from "@/lib/factory-store";
import { useOSStore } from "@/lib/os-store";
import { 
  Activity, Cpu, HardDrive, Zap, DollarSign, Sliders, Play, 
  AlertTriangle, RefreshCw, Layers, Calendar, Clock, Terminal, ChevronRight
} from "lucide-react";
import Link from "next/link";

export default function MissionControlDashboard() {
  const { 
    system, jobsSummary, jobs, queues, activeProviders, activeEngines, events, fetchState, initSSE 
  } = useFactoryStore();
  const selectedProviderId = useOSStore((state) => state.selectedProviderId);

  useEffect(() => {
    initSSE();
  }, [initSSE]);

  // Derive recent failures
  const recentFailures = jobs.filter(j => j.status === "failed").slice(0, 3);

  // Active uploads/publishes
  const activeQueuedCount = queues.storageQueue.length + queues.publisherQueue.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner - Factory Health */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 border border-zinc-900 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-50">Factory Mission Control</h2>
          <p className="text-xs text-zinc-400 mt-1">ShortFactory AI Factory OS is currently active.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>State: <span className="text-emerald-400 font-bold">{system.healthPct}% Healthy</span></span>
          </div>
        </div>
      </div>

      {/* Jobs Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Queued", value: jobsSummary.queued, color: "text-zinc-400" },
          { label: "Running", value: jobsSummary.running, color: "text-blue-400 animate-pulse" },
          { label: "Completed", value: jobsSummary.completed, color: "text-emerald-400" },
          { label: "Failed", value: jobsSummary.failed, color: "text-red-400" },
          { label: "In Queues", value: activeQueuedCount, color: "text-amber-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 text-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-mono">{stat.label}</span>
            <span className={`text-2xl font-bold font-mono tracking-tight mt-1.5 block ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Hardware / SRE metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: "CPU Usage", value: `${system.cpuUsagePct}%`, icon: Cpu, color: "text-blue-400" },
          { label: "Memory", value: `${system.memUsagePct}%`, icon: HardDrive, color: "text-purple-400" },
          { label: "GPU Load", value: system.hardware?.gpuVendor !== "none" ? "22%" : "N/A", icon: Cpu, color: "text-emerald-400" },
          { label: "Workers", value: system.hardware ? CapabilityManagerShim(system.hardware.cpuCores) : "1", icon: Activity, color: "text-cyan-400" },
          { label: "Disk Free", value: `${100 - system.diskUsagePct}%`, icon: HardDrive, color: "text-zinc-400" },
          { label: "Tokens/sec", value: "310", icon: Zap, color: "text-amber-400" },
          { label: "Total Cost", value: "$1.42", icon: DollarSign, color: "text-emerald-400" },
          { label: "Events/sec", value: events.length > 0 ? "1.8" : "0", icon: Activity, color: "text-rose-400" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-zinc-900/40 border border-zinc-850/80 rounded-xl p-3 flex flex-col items-center text-center">
              <Icon className={`w-4 h-4 mb-2 ${item.color}`} />
              <span className="text-[9px] text-zinc-500 uppercase font-mono">{item.label}</span>
              <span className="text-sm font-bold font-mono mt-1 text-zinc-200">{item.value}</span>
            </div>
          );
        })}
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Current Workflow status */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-6">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest border-b border-zinc-800 pb-3 mb-4">
              Current Active Pipeline Workflow
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono font-bold text-zinc-500 bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl">
              <span className={jobsSummary.running > 0 ? "text-emerald-400" : "text-zinc-650"}>SCRIPT</span>
              <span>➔</span>
              <span className={jobsSummary.running > 0 ? "text-emerald-400" : "text-zinc-650"}>VOICE</span>
              <span>➔</span>
              <span className={jobsSummary.running > 0 ? "text-emerald-400" : "text-zinc-650"}>IMAGE</span>
              <span>➔</span>
              <span className={jobsSummary.running > 0 ? "text-blue-400 animate-pulse" : "text-zinc-650"}>RENDERER</span>
              <span>➔</span>
              <span className={activeQueuedCount > 0 ? "text-amber-400" : "text-zinc-650"}>UPLOADER</span>
              <span>➔</span>
              <span className="text-zinc-650">PUBLISHER</span>
            </div>
          </div>

          {/* Recent Jobs list */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-6">
            <div className="border-b border-zinc-800 pb-3 mb-4 flex justify-between items-center">
              <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-widest">
                Recent Generation Jobs
              </h3>
              <Link href="/factory/jobs" className="text-[10px] text-zinc-500 hover:text-emerald-400 flex items-center gap-1 font-semibold">
                View all jobs <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.id} className="bg-zinc-950/30 border border-zinc-850/50 rounded-lg p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-350 block">{job.topic}</span>
                    <span className="text-[10px] text-zinc-650 font-mono mt-0.5">{job.id.slice(0, 12)}...</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize ${job.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : job.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-zinc-850 text-zinc-400"}`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Current Provider */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest border-b border-zinc-800 pb-2.5">
              Active Provider Config
            </h3>
            <div className="text-xs font-mono text-zinc-400 space-y-1.5">
              <div>Provider: <span className="text-zinc-200 capitalize font-bold">{selectedProviderId}</span></div>
              <div>Available Models: <span className="text-zinc-200">{activeProviders.find(p=>p.id === selectedProviderId)?.status?.rateLimitLimit || "Standard"}</span></div>
              <div>Latency Index: <span className="text-zinc-200">180ms</span></div>
            </div>
          </div>

          {/* Upcoming Schedules */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest border-b border-zinc-800 pb-2.5">
              Upcoming Cron Schedules
            </h3>
            <div className="text-xs text-zinc-500 font-mono space-y-2">
              <div className="flex justify-between items-center">
                <span>Quiz Engine (Every 6h)</span>
                <span className="text-zinc-400">08:00 PM</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Story Builder (Daily)</span>
                <span className="text-zinc-400">Tomorrow</span>
              </div>
            </div>
          </div>

          {/* Recent Failures */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest border-b border-zinc-800 pb-2.5 flex items-center gap-1.5 text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Recent Failures
            </h3>
            <div className="text-xs text-zinc-550 font-mono space-y-2">
              {recentFailures.length === 0 ? (
                <div>No recent pipeline failures detected.</div>
              ) : (
                recentFailures.map(f => (
                  <div key={f.id} className="border-b border-zinc-850 pb-1.5 last:border-0 last:pb-0">
                    <div className="text-zinc-300 truncate font-semibold">{f.topic}</div>
                    <div className="text-[10px] text-red-400/80 mt-0.5">Step failure rendering file</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CapabilityManagerShim(cpuCores: number): number {
  return Math.max(1, cpuCores - 1);
}
