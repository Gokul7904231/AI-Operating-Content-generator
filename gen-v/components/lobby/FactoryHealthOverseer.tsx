"use client";

import React from "react";
import { useLobbyStore } from "@/lib/lobby/mock-state";
import { 
  ShieldCheck, AlertTriangle, Activity, Cpu, CheckCircle2, 
  ChevronRight, Radio, FileText, Wrench
} from "lucide-react";

export default function FactoryHealthOverseer() {
  const { factoryState, setOverseerDrawerOpen, setAttentionDrawerOpen } = useLobbyStore();
  const activeAttention = factoryState.attention.filter((a) => !a.resolved);
  const isHealthy = activeAttention.length === 0;

  return (
    <div className="space-y-4 select-none">
      {/* 1. Primary Attention Banner — Immediate answer to "Does the factory need me?" */}
      <div className={`p-6 sm:p-7 rounded-2xl border shadow-sm apple-card-hover transition-all ${
        isHealthy
          ? "bg-white border-[#e8e8ed] text-[#1d1d1f]"
          : "bg-amber-50 border-amber-200 text-[#1d1d1f]"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              isHealthy
                ? "bg-emerald-50 border-emerald-200 text-[#34c759]"
                : "bg-amber-100 border-amber-300 text-[#ff9500] animate-pulse"
            }`}>
              {isHealthy ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#86868b] font-bold">
                  FACTORY STATUS
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isHealthy
                    ? "bg-emerald-50 border-emerald-200 text-[#34c759]"
                    : "bg-amber-100 border-amber-300 text-[#ff9500]"
                }`}>
                  {isHealthy ? "RUNNING NORMALLY" : "ATTENTION REQUIRED"}
                </span>
              </div>

              <h3 className="text-sm font-display font-semibold text-[#1d1d1f] tracking-display mt-1">
                {isHealthy
                  ? "All production floors are operational with zero critical anomalies."
                  : activeAttention[0]?.title || "Operational anomaly requires floor intervention."}
              </h3>

              {!isHealthy && activeAttention[0] && (
                <p className="text-xs font-mono text-amber-300/80 mt-0.5">
                  {activeAttention[0].floorName} — {activeAttention[0].suggestedAction}
                </p>
              )}
            </div>
          </div>

          {!isHealthy && (
            <button
              onClick={() => setAttentionDrawerOpen(true)}
              className="px-4 py-2 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-mono text-xs font-bold rounded-lg transition-all shrink-0 shadow-md flex items-center justify-center gap-1.5"
            >
              VIEW ISSUE & RESOLVE
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Overseer Operational Presence Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold tracking-wider text-zinc-100 font-mono uppercase">
              OVERSEER CONTROL PRESENCE
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            Audit Sync: {factoryState.overseer.lastAuditTimestamp}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs mb-3">
          <div className="bg-zinc-950/60 border border-zinc-850 p-2.5 rounded-lg">
            <span className="text-[9px] text-zinc-500 uppercase">Active Workers</span>
            <p className="text-sm font-bold text-zinc-100 mt-0.5">
              {factoryState.overseer.activeWorkersCount}
            </p>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-850 p-2.5 rounded-lg">
            <span className="text-[9px] text-zinc-500 uppercase">Running Jobs</span>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">
              {factoryState.overseer.activeProductionsCount}
            </p>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-850 p-2.5 rounded-lg">
            <span className="text-[9px] text-zinc-500 uppercase">Awaiting Review</span>
            <p className="text-sm font-bold text-amber-400 mt-0.5">
              {factoryState.overseer.floorsAwaitingReviewCount}
            </p>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-850 p-2.5 rounded-lg">
            <span className="text-[9px] text-zinc-500 uppercase">Recovered Jobs</span>
            <p className="text-sm font-bold text-zinc-300 mt-0.5">
              {factoryState.overseer.recoveredJobsCount}
            </p>
          </div>
        </div>

        {/* Overseer Action trigger */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
          <p className="text-xs font-mono text-zinc-400 truncate max-w-md">
            "{factoryState.overseer.headline}"
          </p>
          <button
            onClick={() => setOverseerDrawerOpen(true)}
            className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-md text-xs font-mono transition-colors flex items-center gap-1 shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            VIEW REPORT
          </button>
        </div>
      </div>
    </div>
  );
}
