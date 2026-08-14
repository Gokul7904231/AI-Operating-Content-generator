"use client";

import React, { useState } from "react";
import { useLobbyStore } from "@/lib/lobby/mock-state";
import { Terminal, Filter, ShieldAlert, ArrowRight, Activity } from "lucide-react";

export default function FactoryCommsStream() {
  const { factoryState } = useLobbyStore();
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const filteredEvents = factoryState.events.filter((evt) => {
    if (filterSeverity === "all") return true;
    return evt.severity === filterSeverity;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "warning":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "success":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "info":
      default:
        return "text-zinc-400 bg-zinc-900 border-zinc-800";
    }
  };

  return (
    <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 relative overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-bold tracking-wider text-zinc-100 font-mono uppercase">
            FACTORY COMMUNICATIONS STREAM
          </h2>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <Filter className="w-3 h-3 text-zinc-500" />
          <span className="text-zinc-500 hidden sm:inline">Filter:</span>
          {(["all", "error", "warning", "info"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2 py-0.5 rounded uppercase text-[10px] font-mono transition-all ${
                filterSeverity === sev
                  ? "bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Stream List */}
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 font-mono text-xs">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className="p-2.5 bg-zinc-950/80 border border-zinc-850/80 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-zinc-700/60 transition-colors"
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <span className="text-[11px] text-zinc-500 shrink-0 font-mono">
                {evt.timestamp}
              </span>

              {/* Sender → Recipient Signal */}
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-zinc-300 shrink-0 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                <span>{evt.sender}</span>
                <ArrowRight className="w-3 h-3 text-zinc-500" />
                <span>{evt.recipient}</span>
              </div>

              {/* Message */}
              <span className="text-zinc-300 truncate text-[11px]">
                {evt.message}
              </span>
            </div>

            {/* Severity Pill */}
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border self-start sm:self-auto ${getSeverityBadge(evt.severity)}`}>
              {evt.severity}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
