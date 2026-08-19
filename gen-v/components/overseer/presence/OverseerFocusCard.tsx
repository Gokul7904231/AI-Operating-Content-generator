"use client";

import React, { memo } from "react";
import { Compass, ShieldAlert, AlertTriangle, Activity, ChevronRight } from "lucide-react";
import type { AttentionTarget } from "@/factoryos/core/overseer/presence";

interface OverseerFocusCardProps {
  attention?: AttentionTarget;
  onInspect?: (target: string) => void;
  onExplain?: (target: string) => void;
  onShowEvidence?: (target: string) => void;
  accentColor?: string;
  className?: string;
}

export const OverseerFocusCard: React.FC<OverseerFocusCardProps> = memo(({
  attention,
  onInspect,
  onExplain,
  onShowEvidence,
  accentColor = "#1677FF",
  className = "",
}) => {
  const target = attention?.target || "factory";
  const priority = attention?.priority || "NORMAL";
  const reason = attention?.reason || "Autonomous factory overview and routine telemetry monitoring";

  const getTargetTitle = (t: string) => {
    switch (t) {
      case "floor01_strategy":
        return "Floor 01 — Strategy & Planning";
      case "floor02_scripting":
        return "Floor 02 — Scripting & Narrative";
      case "floor03_asset_realization":
        return "Floor 03 — Rendering & Assets";
      case "floor07_compliance":
        return "Floor 07 — Compliance & Review";
      case "user":
        return "Operator Interaction Channel";
      case "factory":
        return "Global Factory Operations";
      default:
        return t.startsWith("case_") ? `Incident ${t}` : t.startsWith("mission_") ? `Mission ${t}` : t;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "CRITICAL":
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#FF5A67]/10 text-[#FF5A67] border border-[#FF5A67]/20 text-[9px] font-mono font-bold uppercase flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#F5B942]/10 text-[#F5B942] border border-[#F5B942]/20 text-[9px] font-mono font-bold uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> HIGH
          </span>
        );
      case "LOW":
      case "NORMAL":
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-[#1677FF]/10 text-[#1677FF] border border-[#1677FF]/20 text-[9px] font-mono font-bold uppercase flex items-center gap-1">
            <Activity className="w-3 h-3" /> NOMINAL
          </span>
        );
    }
  };

  const confidence = priority === "CRITICAL" ? 0.96 : priority === "HIGH" ? 0.91 : 0.98;

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl bg-[#0A1220] border border-white/[0.08] shadow-sm select-none transition-all ${className}`}
      role="region"
      aria-label="Overseer Current Focus Target"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#667085]">
            CURRENT FOCUS
          </span>
          {getPriorityBadge(priority)}
        </div>
        <span className="text-[10px] font-mono text-[#667085]">
          {(confidence * 100).toFixed(0)}% Conf • <span className="text-[#19C37D] font-semibold">Active Watch</span>
        </span>
      </div>

      <h4 className="text-xs sm:text-sm font-sans font-bold text-[#F5F7FA] tracking-tight">
        {getTargetTitle(target)}
      </h4>

      <p className="text-[11px] font-sans text-[#A8B2C1] leading-relaxed line-clamp-2 mt-1 mb-2.5">
        {reason}
      </p>

      {/* Focus Action Buttons */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => onInspect?.(target)}
          className="flex-1 py-1 px-2 rounded-lg bg-[#0E1728] hover:bg-[#121E32] border border-white/[0.08] text-[11px] font-sans font-medium text-[#F5F7FA] transition-colors cursor-pointer text-center"
        >
          Inspect
        </button>
        <button
          type="button"
          onClick={() => onExplain?.(target)}
          className="flex-1 py-1 px-2 rounded-lg bg-[#0E1728] hover:bg-[#121E32] border border-white/[0.08] text-[11px] font-sans font-medium text-[#F5F7FA] transition-colors cursor-pointer text-center"
        >
          Explain
        </button>
        <button
          type="button"
          onClick={() => onShowEvidence?.(target)}
          className="py-1 px-2.5 rounded-lg bg-[#1677FF]/10 hover:bg-[#1677FF]/20 text-[#1677FF] text-[11px] font-sans font-semibold transition-colors cursor-pointer flex items-center gap-0.5"
        >
          <span>Evidence</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
});

OverseerFocusCard.displayName = "OverseerFocusCard";
