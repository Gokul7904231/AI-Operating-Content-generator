"use client";

import React from "react";
import {
  ShieldAlert,
  Brain,
  Wrench,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
  Clock,
} from "lucide-react";

export interface ActivityEvent {
  id: string;
  timestamp: string;
  source: "SLAYER" | "OVERSEER" | "COGNITIVE" | "HEALER" | "VALIDATOR" | "WORLDSTATE" | "WATCHDOG";
  title: string;
  description: string;
  floorId?: string;
  severity?: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

interface OverseerActivityProps {
  events: ActivityEvent[];
  className?: string;
}

const SOURCE_ICONS: Record<ActivityEvent["source"], React.ReactNode> = {
  SLAYER: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
  OVERSEER: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />,
  COGNITIVE: <Brain className="w-3.5 h-3.5 text-purple-400" />,
  HEALER: <Wrench className="w-3.5 h-3.5 text-blue-400" />,
  VALIDATOR: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  WORLDSTATE: <Layers className="w-3.5 h-3.5 text-indigo-400" />,
  WATCHDOG: <Activity className="w-3.5 h-3.5 text-rose-400" />,
};

const SOURCE_COLORS: Record<ActivityEvent["source"], string> = {
  SLAYER: "border-amber-500/30 bg-amber-950/20 text-amber-300",
  OVERSEER: "border-cyan-500/30 bg-cyan-950/20 text-cyan-300",
  COGNITIVE: "border-purple-500/30 bg-purple-950/20 text-purple-300",
  HEALER: "border-blue-500/30 bg-blue-950/20 text-blue-300",
  VALIDATOR: "border-emerald-500/30 bg-emerald-950/20 text-emerald-300",
  WORLDSTATE: "border-indigo-500/30 bg-indigo-950/20 text-indigo-300",
  WATCHDOG: "border-rose-500/30 bg-rose-950/20 text-rose-300",
};

export const OverseerActivity: React.FC<OverseerActivityProps> = ({ events, className = "" }) => {
  if (!events || events.length === 0) {
    return (
      <div className={`p-4 text-center text-xs font-mono text-zinc-500 ${className}`}>
        No recent operational activity recorded. Factory nominal.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {events.map((evt) => (
        <div
          key={evt.id}
          className={`p-3 rounded-xl border flex items-start gap-3 backdrop-blur-md transition-all ${
            SOURCE_COLORS[evt.source] || "border-zinc-800 bg-zinc-900/50 text-zinc-300"
          }`}
        >
          <div className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 shrink-0 mt-0.5">
            {SOURCE_ICONS[evt.source] || <Activity className="w-3.5 h-3.5 text-zinc-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase opacity-80">
                {evt.source} {evt.floorId && `// ${evt.floorId}`}
              </span>
              <span className="text-[10px] font-mono text-zinc-500 shrink-0">{evt.timestamp}</span>
            </div>

            <h4 className="text-xs font-semibold text-zinc-100 mt-0.5">{evt.title}</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{evt.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
