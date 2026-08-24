"use client";

import React, { useMemo, memo } from "react";
import { History, ArrowRight } from "lucide-react";
import type { OperationalTimelineEntry } from "./OverseerOperationalTimeline";

interface OverseerActivityStripProps {
  entries: OperationalTimelineEntry[];
  onOpenFullHistory: () => void;
  accentColor?: string;
  className?: string;
}

export const OverseerActivityStrip: React.FC<OverseerActivityStripProps> = memo(({
  entries,
  onOpenFullHistory,
  accentColor = "#1677FF",
  className = "",
}) => {
  // Frontend deduplication: collapse repeated heartbeat / identical state entries into one rolling entry
  const deduplicatedEntries = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    const result: OperationalTimelineEntry[] = [];
    for (const entry of entries) {
      const last = result[result.length - 1];
      if (last && last.type === entry.type && last.description.trim() === entry.description.trim()) {
        result[result.length - 1] = {
          ...last,
          timestamp: entry.timestamp,
        };
      } else {
        result.push(entry);
      }
    }
    return result;
  }, [entries]);

  const latestEntry = deduplicatedEntries[deduplicatedEntries.length - 1] || {
    id: "init",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    type: "OBSERVE",
    description: "Factory operational. All 4 floors healthy and supervised.",
    confidence: 0.98,
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "ESCALATE":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FF5A67]/10 text-[#FF5A67] border border-[#FF5A67]/20">ALERT</span>;
      case "REPAIR":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#4D8DFF]/10 text-[#4D8DFF] border border-[#4D8DFF]/20">REPAIR</span>;
      case "INVESTIGATE":
      case "RESEARCH":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#1677FF]/10 text-[#1677FF] border border-[#1677FF]/20">RESEARCH</span>;
      case "MISSION":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#1677FF]/10 text-[#1677FF] border border-[#1677FF]/20">MISSION</span>;
      case "SUCCESS":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#19C37D]/10 text-[#19C37D] border border-[#19C37D]/20">SUCCESS</span>;
      case "USER":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">COMMAND</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#0E1728] text-[#A8B2C1] border border-white/[0.08]">OBSERVE</span>;
    }
  };

  return (
    <div
      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#0A1220] border border-white/[0.08] shadow-xs text-xs font-mono select-none ${className}`}
      role="status"
      aria-label="Live Activity Status Strip"
    >
      {/* 1. Left: Live Ticker Indicator + Latest Deduplicated Event */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#19C37D] animate-pulse flex-shrink-0" />
        <span className="text-[10px] text-[#667085] flex-shrink-0">
          {latestEntry.timestamp}
        </span>
        <div className="flex-shrink-0">{getEventBadge(latestEntry.type)}</div>
        <p className="text-[#F5F7FA] font-sans truncate text-xs">
          {latestEntry.description}
        </p>
      </div>

      {/* 2. Right: Drawer Opener */}
      <button
        type="button"
        onClick={onOpenFullHistory}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0E1728] hover:bg-[#121E32] border border-white/[0.08] text-[11px] font-sans font-medium text-[#F5F7FA] transition-colors cursor-pointer flex-shrink-0"
        title="Open full conversation and telemetry audit drawer"
      >
        <History className="w-3 h-3 text-[#1677FF]" />
        <span className="hidden sm:inline">Audit Log ({entries.length})</span>
        <ArrowRight className="w-3 h-3 text-[#667085]" />
      </button>
    </div>
  );
});

OverseerActivityStrip.displayName = "OverseerActivityStrip";
