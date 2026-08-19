"use client";

import React from "react";
import type { OverseerIntent } from "@/factoryos/core/overseer/presence";
import { Sparkles, AlertTriangle, CheckCircle, Brain, RefreshCw, ShieldAlert } from "lucide-react";

interface OverseerStatusProps {
  intent: OverseerIntent;
  thoughtSummary: string;
  accentColor?: string;
  className?: string;
}

export const OverseerStatus: React.FC<OverseerStatusProps> = ({
  intent,
  thoughtSummary,
  accentColor = "#0A84FF",
  className = "",
}) => {
  const getIntentIcon = () => {
    switch (intent) {
      case "CRITICAL":
        return <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />;
      case "WARNING":
      case "CONCERNED":
        return <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-bounce" />;
      case "SUCCESS":
      case "PROUD":
        return <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      case "THINKING":
      case "DEEP_THINKING":
        return <Brain className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />;
      case "RECOVERING":
      case "VERIFYING":
        return <RefreshCw className="w-4 h-4 text-sky-500 dark:text-sky-400 animate-spin" />;
      default:
        return <Sparkles className="w-4 h-4" style={{ color: accentColor }} />;
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-1.5 px-4 transition-all duration-300 ${className}`}
    >
      <div className="flex items-center gap-2">
        {getIntentIcon()}
        <span
          className="text-xs font-mono font-bold uppercase tracking-widest"
          style={{ color: accentColor }}
        >
          {intent.replace("_", " ")}
        </span>
      </div>

      <p className="text-sm font-sans text-[#1d1d1f] dark:text-zinc-200 max-w-xl leading-relaxed tracking-tight select-none font-medium">
        "{thoughtSummary}"
      </p>
    </div>
  );
};
