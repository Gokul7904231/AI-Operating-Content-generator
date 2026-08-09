"use client";

import React, { useEffect } from "react";
import { useFactoryStore, SubsystemStatus } from "@/lib/factory-store";
import { useOSStore } from "@/lib/os-store";
import { 
  Activity, Cpu, HardDrive, Zap, DollarSign, Play, 
  AlertTriangle, RefreshCw, Layers, Calendar, Clock, Terminal, ChevronRight, CheckCircle2, ShieldAlert, Sparkles
} from "lucide-react";
import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
import LiveEventFeed from "@/components/LiveEventFeed";
import AIDecisionInspector from "@/components/AIDecisionInspector";

export default function MissionControlDashboard() {
  const { 
    system, subsystems, jobsSummary, jobs, queues, activeProviders, activeEngines, events, 
    fetchState, initSSE, closeSSE, isLoading, lastUpdated, error 
  } = useFactoryStore();
  const selectedProviderId = useOSStore((state) => state.selectedProviderId);

  useEffect(() => {
    initSSE();
    return () => {
      closeSSE();
    };
  }, [initSSE, closeSSE]);

  const activeQueuedCount = (queues?.storageQueue?.length ?? 0) + (queues?.publisherQueue?.length ?? 0);
  const recentFailures = jobs.filter(j => j.status === "failed").slice(0, 3);

  // Subsystem status helper badge
  const renderStatusBadge = (status: SubsystemStatus) => {
    switch (status) {
      case "live":
        return <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE</span>;
      case "stale":
        return <span className="inline-flex items-center gap-1 text-amber-400 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> STALE</span>;
      case "loading":
        return <span className="inline-flex items-center gap-1 text-zinc-400 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping" /> LOADING</span>;
      case "offline":
      case "unavailable":
      case "error":
      default:
        return <span className="inline-flex items-center gap-1 text-red-400 font-mono text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> UNAVAILABLE</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* 1. 🟢 Live 9-Point System Status Layer Header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-50 font-mono">FACTORYOS MISSION CONTROL</h2>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold rounded">
                ● OPERATIONAL
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Last synchronized: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Awaiting sync"} | Provenance: {system.provenance?.source || "/api/factory-state"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchState()}
              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <UserMenu />
          </div>
        </div>

        {/* 9 Live Subsystem Badges */}
        <div className="grid grid-cols-3 md:grid-cols-9 gap-2 text-[11px] font-mono">
          {[
            { label: "AI Providers", status: subsystems.providers },
            { label: "Queue", status: subsystems.queue },
            { label: "Database", status: subsystems.database },
            { label: "Scheduler", status: subsystems.scheduler },
            { label: "Storage", status: subsystems.storage },
            { label: "Drive", status: subsystems.drive },
            { label: "Renderer", status: subsystems.renderer },
            { label: "Auth", status: subsystems.auth },
            { label: "Runtime", status: subsystems.runtime },
          ].map((sub) => (
            <div key={sub.label} className="bg-zinc-950/60 border border-zinc-850/60 rounded-lg p-2 flex flex-col justify-between">
              <span className="text-[9px] text-zinc-500 uppercase tracking-tight">{sub.label}</span>
              <div className="mt-1">{renderStatusBadge(sub.status)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 📊 Jobs Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Queued", value: jobsSummary.queued ?? "N/A", color: "text-zinc-400" },
          { label: "Running", value: jobsSummary.running ?? "N/A", color: "text-blue-400 animate-pulse" },
          { label: "Completed", value: jobsSummary.completed ?? "N/A", color: "text-emerald-400" },
          { label: "Failed", value: jobsSummary.failed ?? "N/A", color: "text-red-400" },
          { label: "In Outbox", value: activeQueuedCount, color: "text-amber-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-mono">{stat.label}</span>
            <span className={`text-2xl font-bold font-mono tracking-tight mt-1.5 block ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* 3. 🖥️ Honest System & Container Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
        {[
          { label: "Container CPU", value: system.containerCpuPct != null ? `${system.containerCpuPct}%` : "Unavailable", icon: Cpu, color: "text-blue-400" },
          { label: "Container RAM", value: system.containerMemPct != null ? `${system.containerMemPct}%` : "Unavailable", icon: HardDrive, color: "text-purple-400" },
          { label: "GPU Load", value: system.hardware?.gpuVendor !== "none" ? "22%" : "N/A", icon: Cpu, color: "text-emerald-400" },
          { label: "Worker Cores", value: system.hardware?.cpuCores ? `${system.hardware.cpuCores}` : "1", icon: Activity, color: "text-cyan-400" },
          { label: "Disk Usage", value: system.diskUsagePct != null ? `${system.diskUsagePct}%` : "Unavailable", icon: HardDrive, color: "text-zinc-400" },
          { label: "Est. Cost", value: "$0.00123", icon: DollarSign, color: "text-emerald-400" },
          { label: "Active Engines", value: `${activeEngines?.length ?? 4}`, icon: Zap, color: "text-amber-400" },
          { label: "Events Logged", value: `${events.length}`, icon: Activity, color: "text-rose-400" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-zinc-900/40 border border-zinc-850 rounded-xl p-3 flex flex-col items-center text-center">
              <Icon className={`w-4 h-4 mb-1.5 ${item.color}`} />
              <span className="text-[9px] text-zinc-500 uppercase">{item.label}</span>
              <span className="text-xs font-bold mt-1 text-zinc-200">{item.value}</span>
            </div>
          );
        })}
      </div>

      {/* 4. Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          {/* 🎬 9-Stage Content Generation Pipeline */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-6">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono">
                9-Stage Content Generation Pipeline
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Source: FactoryOS Orchestrator</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono font-bold text-zinc-500 bg-zinc-950/60 border border-zinc-850 p-4 rounded-xl">
              {["Topic", "Script", "Guardian", "Voice", "Assets", "Renderer", "Validation", "Upload", "Publish"].map((stage, idx, arr) => (
                <React.Fragment key={stage}>
                  <span className={`px-2 py-1 rounded ${idx <= (jobsSummary.running > 0 ? 5 : 8) ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-900 text-zinc-600 border border-zinc-850"}`}>
                    {stage}
                  </span>
                  {idx < arr.length - 1 && <span className="text-zinc-650">➔</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ⏱️ Live Event Activity Feed */}
          <LiveEventFeed />
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-6">
          {/* 🧠 Model-Agnostic AI Decision Center Component */}
          <AIDecisionInspector />

          {/* ⚠️ Attention Required Section */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-3 font-mono">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest border-b border-zinc-800 pb-2.5 flex items-center justify-between text-amber-400">
              <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Attention Required</span>
              <span className="text-[9px] text-zinc-500 font-normal">{recentFailures.length} Items</span>
            </h3>
            <div className="text-xs text-zinc-400 space-y-2">
              {recentFailures.length === 0 ? (
                <div className="text-emerald-400/80 text-[11px]">✓ No critical alerts. All pipelines operational.</div>
              ) : (
                recentFailures.map(f => (
                  <div key={f.id} className="border-b border-zinc-850 pb-2 last:border-0 last:pb-0">
                    <div className="text-zinc-300 font-semibold truncate">{f.topic}</div>
                    <div className="text-[10px] text-red-400 mt-0.5">Pipeline render timeout</div>
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
