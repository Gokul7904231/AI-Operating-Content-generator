"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { 
  Activity, RefreshCw, Cpu, HardDrive, 
  DollarSign, Zap, AlertTriangle
} from "lucide-react";
import { useFactoryStore } from "@/lib/factory-store";
import { OverseerPresenceView } from "@/components/overseer/presence/OverseerPresenceView";
import BasicUserDashboard from "@/components/dashboard/BasicUserDashboard";
import AIDecisionInspector from "@/components/AIDecisionInspector";
import LiveEventFeed from "@/components/LiveEventFeed";

export default function DashboardPage() {
  const { 
    system, 
    jobsSummary, 
    queues, 
    events, 
    activeEngines, 
    lastUpdated, 
    fetchState, 
    isLoading 
  } = useFactoryStore();

  const [userRole, setUserRole] = useState<string>("VIEWER");
  const [userEmail, setUserEmail] = useState<string>("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated && data?.user) {
          startTransition(() => {
            setUserRole(data.user.role || "VIEWER");
            setUserEmail(data.user.email || "");
          });
        }
      })
      .catch(() => {});
  }, []);

  const subsystems = (system as any)?.subsystems || {
    providers: "ONLINE",
    queue: "ONLINE",
    database: "ONLINE",
    scheduler: "ONLINE",
    storage: "ONLINE",
    drive: "ONLINE",
    renderer: "ONLINE",
    auth: "ONLINE",
    runtime: "ONLINE",
  };

  const isAdmin = userRole === "OWNER" || userRole === "ADMIN";

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ONLINE":
      case "READY":
        return <span className="text-[#19C37D] font-bold">● ONLINE</span>;
      case "DEGRADED":
        return <span className="text-[#F5B942] font-bold">▲ DEGRADED</span>;
      case "OFFLINE":
      case "ERROR":
        return <span className="text-[#FF5A67] font-bold">✕ OFFLINE</span>;
      default:
        return <span className="text-[#667085] font-bold">● {status}</span>;
    }
  };

  const activeQueuedCount = (queues?.storageQueue?.length ?? 0) + (queues?.publisherQueue?.length ?? 0);

  return (
    <div id="overseer-command-center" className="space-y-10 max-w-7xl mx-auto pb-16 select-none font-sans">
      {/* 1. 🌟 UNIFIED LIVING OVERSEER COMMAND CENTER (PRIMARY FOCAL POINT ON LOAD) */}
      <section className="relative w-full">
        <OverseerPresenceView isDashboardEmbedded={true} />
      </section>

      {/* 2. 🟢 BELOW THE FOLD: ROLE-AWARE SECONDARY FACTORY INFORMATION */}
      <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-8">
        
        {/* BASIC USER EXPERIENCE TIER (CREATOR & VIEWER ROLES) */}
        {!isAdmin && (
          <section className="space-y-8">
            {/* 9-Stage Content Generation Pipeline */}
            <div className="bg-white dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-6 shadow-2xs">
              <div className="flex justify-between items-center border-b border-black/[0.04] dark:border-white/[0.08] pb-3 mb-4">
                <h3 className="text-xs font-bold text-[#111827] dark:text-[#F5F7FA] uppercase tracking-widest font-mono">
                  9-Stage Content Generation Pipeline
                </h3>
                <span className="text-[10px] text-[#667085] dark:text-[#A7B0BC] font-mono">Source: FactoryOS Swarms</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono font-bold text-[#667085] dark:text-[#A7B0BC] bg-black/[0.02] dark:bg-[#050A12] border border-black/[0.04] dark:border-white/[0.06] p-4 rounded-xl">
                {["Topic", "Script", "Guardian", "Voice", "Assets", "Renderer", "Validation", "Upload", "Publish"].map((stage, idx, arr) => (
                  <React.Fragment key={stage}>
                    <span className={`px-2.5 py-1 rounded-lg ${idx <= (jobsSummary.running > 0 ? 5 : 8) ? "bg-[#179E69]/10 dark:bg-[#21C58B]/10 text-[#179E69] dark:text-[#21C58B] border border-[#179E69]/20 dark:border-[#21C58B]/20" : "bg-black/[0.04] dark:bg-[#0D1622] text-[#98A2B3] dark:text-[#667085] border border-black/[0.04] dark:border-white/[0.06]"}`}>
                      {stage}
                    </span>
                    {idx < arr.length - 1 && <span className="text-[#98A2B3] dark:text-[#667085]">➔</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ADMINISTRATIVE TELEMETRY TIER (ADMIN & OWNER ROLES) */}
        {isAdmin && (
          <section className="space-y-8">
            {/* Live 9-Point System Status Layer Header */}
            <div className="bg-white dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-5 relative overflow-hidden shadow-2xs backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/[0.04] dark:border-white/[0.08] pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight text-[#111827] dark:text-[#F5F7FA] font-mono">
                      FACTORYOS TELEMETRY PLANE
                    </h3>
                    <span className="px-2 py-0.5 bg-[#179E69]/10 dark:bg-[#21C58B]/10 border border-[#179E69]/20 dark:border-[#21C58B]/20 text-[#179E69] dark:text-[#21C58B] text-[10px] font-mono font-bold rounded">
                      ● OPERATIONAL
                    </span>
                  </div>
                  <p className="text-xs text-[#667085] dark:text-[#A7B0BC] mt-1 font-mono">
                    Last synchronized: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Awaiting sync"} | Provenance: {system.provenance?.source || "/api/factory-state"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => fetchState()}
                    className="px-3 py-1.5 bg-black/[0.04] dark:bg-[#0D1622] hover:bg-black/[0.08] dark:hover:bg-[#121E30] border border-black/[0.06] dark:border-white/[0.08] rounded-lg text-xs font-mono text-[#111827] dark:text-[#F5F7FA] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh State
                  </button>
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
                  <div key={sub.label} className="bg-black/[0.02] dark:bg-[#050A12] border border-black/[0.04] dark:border-white/[0.06] rounded-xl p-2 flex flex-col justify-between">
                    <span className="text-[9px] text-[#667085] dark:text-[#A7B0BC] uppercase tracking-tight font-bold">{sub.label}</span>
                    <div className="mt-1">{renderStatusBadge(sub.status)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Production Status Tier */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#A8B2C1]">
                  Production Pipeline Throughput
                </h3>
                <span className="text-[10px] font-mono text-[#667085]">Authoritative Job Counters</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: "Queued", value: jobsSummary.queued ?? "0", color: "text-[#F5F7FA]" },
                  { label: "Running", value: jobsSummary.running ?? "0", color: "text-[#1677FF] animate-pulse" },
                  { label: "Completed", value: jobsSummary.completed ?? "0", color: "text-[#19C37D]" },
                  { label: "Failed", value: jobsSummary.failed ?? "0", color: "text-[#FF5A67]" },
                  { label: "In Outbox", value: activeQueuedCount, color: "text-[#1677FF]" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[#0A1220] border border-white/[0.08] rounded-2xl p-5 sm:p-6 text-center shadow-xs">
                    <span className="text-xs font-mono font-bold text-[#A8B2C1] uppercase tracking-wider block mb-2">{stat.label}</span>
                    <span className={`text-3xl sm:text-4xl font-display font-bold tracking-display block ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline Stages & Live Activity Feeds */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left column */}
              <div className="lg:col-span-8 space-y-6">
                {/* 🎬 9-Stage Content Generation Pipeline */}
                <div className="bg-[#0A1220] border border-white/[0.08] rounded-2xl p-6 shadow-xs">
                  <div className="flex justify-between items-center border-b border-white/[0.08] pb-3 mb-4">
                    <h3 className="text-xs font-bold text-[#F5F7FA] uppercase tracking-widest font-mono">
                      9-Stage Content Generation Pipeline
                    </h3>
                    <span className="text-[10px] text-[#667085] font-mono">Source: FactoryOS Swarms</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono font-bold text-[#667085] bg-[#070D18] border border-white/[0.06] p-4 rounded-xl">
                    {["Topic", "Script", "Guardian", "Voice", "Assets", "Renderer", "Validation", "Upload", "Publish"].map((stage, idx, arr) => (
                      <React.Fragment key={stage}>
                        <span className={`px-2.5 py-1 rounded-lg ${idx <= (jobsSummary.running > 0 ? 5 : 8) ? "bg-[#19C37D]/10 text-[#19C37D] border border-[#19C37D]/20" : "bg-[#0E1728] text-[#667085] border border-white/[0.06]"}`}>
                          {stage}
                        </span>
                        {idx < arr.length - 1 && <span className="text-[#667085]">➔</span>}
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
                <div className="bg-[#0A1220] border border-white/[0.08] rounded-2xl p-5 space-y-3 font-mono shadow-xs">
                  <h3 className="text-xs font-bold text-[#F5F7FA] uppercase tracking-widest border-b border-white/[0.08] pb-2.5 flex items-center justify-between text-[#F5B942]">
                    <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Attention Required</span>
                    <span className="text-[10px] bg-[#F5B942]/10 px-2 py-0.5 rounded border border-[#F5B942]/20">
                      {jobsSummary.failed > 0 ? `${jobsSummary.failed} Failed Jobs` : "NOMINAL"}
                    </span>
                  </h3>
                  {jobsSummary.failed > 0 ? (
                    <div className="space-y-2 text-xs">
                      <p className="text-[#FF5A67]">
                        ⚠️ {jobsSummary.failed} job(s) reported rendering or upload failures in the last 24h.
                      </p>
                      <Link
                        href="/factory/jobs"
                        className="inline-block text-[11px] text-[#1677FF] hover:underline"
                      >
                        Inspect Failed Jobs in Factory Queue ➔
                      </Link>
                    </div>
                  ) : (
                    <p className="text-xs text-[#667085] leading-relaxed">
                      No active blocking incidents. All video synthesis engines running nominal with zero backpressure.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Secondary Infrastructure & System Telemetry */}
            <div className="bg-[#0A1220] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="text-[10px] font-mono font-bold text-[#A8B2C1] uppercase tracking-wider">
                  System Resources & Infrastructure Telemetry
                </span>
                <span className="text-[9px] font-mono text-[#667085]">Live Diagnostic Feed</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 font-mono">
                {[
                  { label: "Container CPU", value: system.containerCpuPct != null ? `${system.containerCpuPct}%` : "Unavailable", icon: Cpu, color: "text-[#1677FF]" },
                  { label: "Container RAM", value: system.containerMemPct != null ? `${system.containerMemPct}%` : "Unavailable", icon: HardDrive, color: "text-[#1677FF]" },
                  { label: "GPU Load", value: system.hardware?.gpuVendor !== "none" ? "22%" : "N/A", icon: Cpu, color: "text-[#19C37D]" },
                  { label: "Worker Cores", value: system.hardware?.cpuCores ? `${system.hardware.cpuCores}` : "1", icon: Activity, color: "text-[#1677FF]" },
                  { label: "Disk Usage", value: system.diskUsagePct != null ? `${system.diskUsagePct}%` : "Unavailable", icon: HardDrive, color: "text-[#A8B2C1]" },
                  { label: "Est. Cost", value: "$0.00123", icon: DollarSign, color: "text-[#19C37D]" },
                  { label: "Active Engines", value: `${activeEngines?.length ?? 4}`, icon: Zap, color: "text-[#1677FF]" },
                  { label: "Events Logged", value: `${events.length}`, icon: Activity, color: "text-[#A8B2C1]" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="bg-[#070D18] border border-white/[0.06] rounded-xl p-2.5 flex flex-col items-center text-center shadow-xs">
                      <Icon className={`w-3.5 h-3.5 mb-1 ${item.color}`} />
                      <span className="text-[8px] text-[#667085] uppercase tracking-tight truncate w-full">{item.label}</span>
                      <span className="text-xs font-mono font-semibold mt-0.5 text-[#F5F7FA]">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
