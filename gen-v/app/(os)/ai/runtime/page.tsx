"use client";

import React, { useEffect } from "react";
import { useFactoryStore } from "@/lib/factory-store";
import { Terminal, Zap, AlertTriangle, RefreshCw, Cpu, Activity, HardDrive, ShieldAlert } from "lucide-react";

export default function RuntimePage() {
  const { system, jobsSummary, activeProviders, queues, events, fetchState, isLoading, initSSE } = useFactoryStore();

  useEffect(() => {
    initSSE();
  }, [initSSE]);

  // Active uploads/publishes
  const activeQueuedCount = queues.storageQueue.length + queues.publisherQueue.length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">AI Runtime</h1>
          <p className="text-xs text-zinc-500 mt-1">Live AI router state, system metrics, hardware capability, and active executions.</p>
        </div>
        <button 
          onClick={() => fetchState()} 
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* SRE Stats Block */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border border-zinc-850 bg-zinc-900/60 p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Running Jobs</div>
          <div className="text-xl font-bold text-zinc-200 font-mono">{jobsSummary.running}</div>
        </div>
        <div className="rounded-xl border border-zinc-850 bg-zinc-900/60 p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Queue Workers</div>
          <div className="text-xl font-bold text-zinc-200 font-mono">3</div>
        </div>
        <div className="rounded-xl border border-zinc-850 bg-zinc-900/60 p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Active Router</div>
          <div className="text-xl font-bold text-emerald-400 capitalize font-mono">Dynamic</div>
        </div>
        <div className="rounded-xl border border-zinc-850 bg-zinc-900/60 p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Cache Efficacy</div>
          <div className="text-xl font-bold text-blue-400 font-mono">82%</div>
        </div>
        <div className="rounded-xl border border-zinc-850 bg-zinc-900/60 p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Events Stream</div>
          <div className="text-xl font-bold text-rose-400 font-mono">{events.length}/sec</div>
        </div>
      </div>

      {/* SRE Resources & Provider Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: SRE Metrics */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-widest border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" /> SRE Resource Allocation
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-zinc-950/40 border border-zinc-850/80 rounded-lg">
                <span className="text-zinc-650 block text-[9px] uppercase">CPU Load</span>
                <span className="text-zinc-250 font-bold block mt-1">{system.cpuUsagePct}%</span>
                <div className="w-full bg-zinc-900 rounded-full h-1 mt-2">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${system.cpuUsagePct}%` }} />
                </div>
              </div>
              <div className="p-3 bg-zinc-950/40 border border-zinc-850/80 rounded-lg">
                <span className="text-zinc-650 block text-[9px] uppercase">RAM Allocation</span>
                <span className="text-zinc-250 font-bold block mt-1">{system.memUsagePct}%</span>
                <div className="w-full bg-zinc-900 rounded-full h-1 mt-2">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${system.memUsagePct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Running Events Feed */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-6">
            <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-widest border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" /> Live Pipeline Events timeline
            </h3>
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-850/80 font-mono text-[10px] text-zinc-550 space-y-2.5 max-h-56 overflow-y-auto terminal-scroll">
              {events.length === 0 ? (
                <div>Waiting for events...</div>
              ) : (
                events.map((evt, i) => (
                  <div key={i} className="flex justify-between">
                    <div>
                      <span className="text-emerald-500">[EVENT]</span> {evt.type}
                    </div>
                    <span className="text-zinc-600">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Router Active Models */}
        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-widest border-b border-zinc-800 pb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Active Router Providers
          </h3>

          <div className="space-y-3.5">
            {activeProviders.map((prov) => (
              <div key={prov.id} className="bg-zinc-950/30 border border-zinc-850/50 rounded-lg p-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-zinc-300 capitalize">{prov.name}</span>
                  <span className="text-[9px] text-zinc-600 block font-mono mt-0.5">{prov.id}</span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase ${prov.metrics?.state === "ONLINE" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {prov.metrics?.state || "ONLINE"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
