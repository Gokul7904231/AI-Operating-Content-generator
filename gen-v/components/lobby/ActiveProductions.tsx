"use client";

import React from "react";
import { useLobbyStore } from "@/lib/lobby/mock-state";
import { ProductionJob } from "@/lib/lobby/types";
import { 
  Film, AlertTriangle, Clock, ChevronRight, Activity, CheckCircle2
} from "lucide-react";

export default function ActiveProductions() {
  const { factoryState, selectJob, setAttentionDrawerOpen } = useLobbyStore();

  // Sort productions: jobs with attention state first, then processing, then completed
  const sortedJobs = [...factoryState.productions].sort((a, b) => {
    if (a.attentionState && !b.attentionState) return -1;
    if (!a.attentionState && b.attentionState) return 1;
    return 0;
  });

  return (
    <section className="bg-white border border-[#e8e8ed] rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#86868b]" />
            <h2 className="text-sm font-display font-semibold tracking-display text-[#1d1d1f] uppercase">
              ACTIVE PRODUCTIONS
            </h2>
          </div>
          <p className="text-xs font-text text-[#6e6e73] mt-0.5">
            Running video jobs & production floor assignments ({factoryState.productions.length} active)
          </p>
        </div>
      </div>

      {/* Production List */}
      <div className="space-y-3">
        {sortedJobs.map((job) => {
          const hasAttention = !!job.attentionState;

          return (
            <div
              key={job.id}
              onClick={() => selectJob(job.id)}
              className={`p-4 rounded-xl border apple-card-hover cursor-pointer ${
                hasAttention
                  ? "bg-red-50 border-red-200"
                  : "bg-[#f5f5f7] border-[#e8e8ed]"
              }`}
            >
              {/* Row 1: Title, ID, Floor Tag & State */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400/90">
                      {job.id}
                    </span>
                    <h3 className="text-xs font-bold font-mono text-zinc-100 truncate max-w-lg">
                      {job.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-zinc-400">
                      {job.currentFloor}
                    </span>
                    <span className="text-zinc-600 font-mono">•</span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {job.topic}
                    </span>
                  </div>
                </div>

                {/* State Pill */}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    job.state === "BLOCKED" || job.state === "FAILED"
                      ? "bg-red-500/10 text-red-400 border-red-500/40 animate-pulse"
                      : job.state === "AWAITING_REVIEW"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  }`}>
                    {job.state}
                  </span>

                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {job.elapsedTime}
                  </span>
                </div>
              </div>

              {/* Row 2: Custom Progress Bar */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span className="truncate max-w-md text-zinc-400 font-mono">
                    Event: {job.lastEvent}
                  </span>
                  <span className="font-bold font-mono text-zinc-300">{job.progressPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                  {/* Recipe: RECIPES.md #CompositorScaleProgressBar - GPU scaleX transform progress bar */}
                  <div
                    className={`h-full w-full transition-transform duration-500 ease-out origin-left rounded-full ${
                      hasAttention ? "bg-red-500" : "bg-amber-400"
                    }`}
                    style={{ transform: `scaleX(${job.progressPct / 100})` }}
                  />
                </div>
              </div>

              {/* Row 3: Attention Alert Trigger (if job has attention item) */}
              {hasAttention && (
                <div className="mt-2.5 p-2 bg-red-950/40 border border-red-500/30 rounded flex items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-red-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="truncate">{job.attentionState?.title}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttentionDrawerOpen(true);
                    }}
                    className="px-2 py-0.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded text-[10px] font-mono uppercase tracking-wider shrink-0 transition-colors"
                  >
                    INSPECT ANOMALY
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
