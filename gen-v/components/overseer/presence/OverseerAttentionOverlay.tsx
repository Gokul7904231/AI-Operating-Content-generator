"use client";

import React from "react";
import type { AttentionTarget } from "@/factoryos/core/overseer/presence";
import { Eye, ShieldAlert, Cpu, Layers, UserCheck } from "lucide-react";

interface OverseerAttentionOverlayProps {
  attention?: AttentionTarget;
  accentColor?: string;
  className?: string;
}

export const OverseerAttentionOverlay: React.FC<OverseerAttentionOverlayProps> = ({
  attention,
  accentColor = "#00e5ff",
  className = "",
}) => {
  if (!attention || attention.target === "factory" || attention.target === "user") {
    return null;
  }

  const getTargetIcon = () => {
    switch (attention.target) {
      case "floor01_strategy":
        return <Layers className="w-3.5 h-3.5" />;
      case "floor02_scripting":
        return <Cpu className="w-3.5 h-3.5" />;
      case "floor03_asset_realization":
        return <Cpu className="w-3.5 h-3.5" />;
      case "floor07_compliance":
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case "worker":
      case "case":
        return <ShieldAlert className="w-3.5 h-3.5" />;
      default:
        return <Eye className="w-3.5 h-3.5" />;
    }
  };

  const getTargetLabel = () => {
    switch (attention.target) {
      case "floor01_strategy":
        return "Floor 01 — Strategy";
      case "floor02_scripting":
        return "Floor 02 — Scripting";
      case "floor03_asset_realization":
        return "Floor 03 — Asset Realization";
      case "floor07_compliance":
        return "Floor 07 — Compliance";
      default:
        return attention.target;
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono tracking-wide backdrop-blur-md border transition-all duration-300 ${className}`}
      style={{
        backgroundColor: "rgba(10, 15, 25, 0.75)",
        borderColor: `${accentColor}44`,
        color: accentColor,
        boxShadow: `0 0 16px ${accentColor}18`,
      }}
    >
      <span className="flex items-center justify-center animate-pulse">
        {getTargetIcon()}
      </span>
      <span className="font-semibold uppercase">{getTargetLabel()}</span>
      <span className="text-zinc-400 font-normal truncate max-w-[240px]">
        {attention.reason}
      </span>
    </div>
  );
};
