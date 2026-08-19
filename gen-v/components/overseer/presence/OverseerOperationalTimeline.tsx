"use client";

import React, { useState, memo } from "react";
import { 
  Terminal, Activity, Eye, ShieldAlert, Wrench, 
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, 
  Sparkles, Bot, Layers, Clock
} from "lucide-react";

export type OperationalEventType =
  | "OBSERVE"
  | "DETECT"
  | "INVESTIGATE"
  | "THINK"
  | "PLAN"
  | "DISPATCH"
  | "REPAIR"
  | "VERIFY"
  | "SUCCESS"
  | "WARNING"
  | "ESCALATE"
  | "REPLAN"
  | "MISSION"
  | "USER";

export interface OperationalTimelineEntry {
  id: string;
  timestamp: string;
  type: OperationalEventType;
  description: string;
  floorId?: string;
  caseId?: string;
  missionId?: string;
  confidence?: number;
  evidence?: string[];
  actionTaken?: string;
}

interface OverseerOperationalTimelineProps {
  entries: OperationalTimelineEntry[];
  onSelectEntry?: (entry: OperationalTimelineEntry) => void;
  maxItems?: number;
  className?: string;
}

const EVENT_TYPE_CONFIG: Record<
  OperationalEventType,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  OBSERVE: { label: "OBSERVE", bg: "bg-[#1677FF]/10", text: "text-[#1677FF]", border: "border-[#1677FF]/20", icon: Eye },
  DETECT: { label: "DETECT", bg: "bg-[#F5B942]/10", text: "text-[#F5B942]", border: "border-[#F5B942]/20", icon: AlertTriangle },
  INVESTIGATE: { label: "INVESTIGATE", bg: "bg-[#1677FF]/10", text: "text-[#1677FF]", border: "border-[#1677FF]/20", icon: Terminal },
  THINK: { label: "THINK", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", icon: Sparkles },
  PLAN: { label: "PLAN", bg: "bg-[#1677FF]/10", text: "text-[#1677FF]", border: "border-[#1677FF]/20", icon: Layers },
  DISPATCH: { label: "DISPATCH", bg: "bg-[#1677FF]/10", text: "text-[#1677FF]", border: "border-[#1677FF]/20", icon: Bot },
  REPAIR: { label: "REPAIR", bg: "bg-[#4D8DFF]/10", text: "text-[#4D8DFF]", border: "border-[#4D8DFF]/20", icon: Wrench },
  VERIFY: { label: "VERIFY", bg: "bg-[#19C37D]/10", text: "text-[#19C37D]", border: "border-[#19C37D]/20", icon: Activity },
  SUCCESS: { label: "SUCCESS", bg: "bg-[#19C37D]/10", text: "text-[#19C37D]", border: "border-[#19C37D]/20", icon: CheckCircle2 },
  WARNING: { label: "WARNING", bg: "bg-[#F5B942]/10", text: "text-[#F5B942]", border: "border-[#F5B942]/20", icon: AlertTriangle },
  ESCALATE: { label: "ESCALATE", bg: "bg-[#FF5A67]/10", text: "text-[#FF5A67]", border: "border-[#FF5A67]/20", icon: ShieldAlert },
  REPLAN: { label: "REPLAN", bg: "bg-fuchsia-500/10", text: "text-fuchsia-400", border: "border-fuchsia-500/20", icon: Layers },
  MISSION: { label: "MISSION", bg: "bg-[#1677FF]/10", text: "text-[#1677FF]", border: "border-[#1677FF]/20", icon: Bot },
  USER: { label: "USER", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", icon: Clock },
};

export const OverseerOperationalTimeline: React.FC<OverseerOperationalTimelineProps> = memo(({
  entries,
  onSelectEntry,
  maxItems = 8,
  className = "",
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const displayEntries = entries.slice(-maxItems).reverse();

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className={`w-full rounded-2xl bg-[#0A1220] border border-white/[0.08] p-4 sm:p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#1677FF]" />
          <h4 className="text-xs font-mono font-bold tracking-widest text-[#F5F7FA] uppercase">
            OVERSEER OPERATIONAL ACTIVITY TIMELINE
          </h4>
        </div>
        <span className="text-[10px] font-mono text-[#667085]">
          Showing {displayEntries.length} events
        </span>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto terminal-scroll pr-1">
        {displayEntries.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#667085] font-mono">
            No recent operational events recorded. System nominal.
          </div>
        ) : (
          displayEntries.map((entry) => {
            const config = EVENT_TYPE_CONFIG[entry.type] || EVENT_TYPE_CONFIG.OBSERVE;
            const Icon = config.icon;
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                className="rounded-xl bg-[#070D18] border border-white/[0.06] p-3 transition-all duration-150 hover:border-[#1677FF]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Event Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 border flex-shrink-0 mt-0.5 ${config.bg} ${config.text} ${config.border}`}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#F5F7FA] font-sans leading-relaxed">
                        {entry.description}
                      </p>

                      {/* Floor / Case / Mission Tags */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px] font-mono text-[#667085]">
                        {entry.floorId && (
                          <span className="bg-[#0E1728] border border-white/[0.08] px-1.5 py-0.5 rounded text-[#A8B2C1]">
                            {entry.floorId}
                          </span>
                        )}
                        {entry.caseId && (
                          <span className="bg-[#F5B942]/10 text-[#F5B942] px-1.5 py-0.5 rounded border border-[#F5B942]/20">
                            {entry.caseId}
                          </span>
                        )}
                        {entry.missionId && (
                          <span className="bg-[#1677FF]/10 text-[#1677FF] px-1.5 py-0.5 rounded border border-[#1677FF]/20">
                            {entry.missionId}
                          </span>
                        )}
                        {entry.confidence != null && (
                          <span className="text-[#1677FF]">
                            Conf: {(entry.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-[#667085]">{entry.timestamp}</span>
                    {entry.evidence && entry.evidence.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(entry.id)}
                        className="p-1 rounded hover:bg-white/[0.08] text-[#667085] hover:text-[#F5F7FA] cursor-pointer transition-colors"
                        title="Toggle Evidence"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Evidence Drawer */}
                {isExpanded && entry.evidence && entry.evidence.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] space-y-1 text-xs font-mono animate-fade-in">
                    <span className="text-[10px] text-[#667085] uppercase font-bold tracking-wider">
                      Authoritative Evidence:
                    </span>
                    {entry.evidence.map((ev, idx) => (
                      <div key={idx} className="text-[#F5B942] text-[11px] pl-2 border-l-2 border-[#F5B942]/40">
                        • {ev}
                      </div>
                    ))}
                    {entry.actionTaken && (
                      <div className="text-[#19C37D] text-[11px] pl-2 border-l-2 border-[#19C37D]/40 mt-1">
                        ✓ Action: {entry.actionTaken}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

OverseerOperationalTimeline.displayName = "OverseerOperationalTimeline";
