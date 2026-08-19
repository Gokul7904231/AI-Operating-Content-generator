"use client";

import React, { memo } from "react";
import type { FaceParameters, OverseerIntent, VoiceState } from "@/factoryos/core/overseer/presence";
import { OverseerFace } from "./OverseerFace";
import { AlertTriangle, CheckCircle, Brain, RefreshCw, ShieldAlert, Eye, Mic } from "lucide-react";

interface OverseerHeroProps {
  faceParameters: FaceParameters;
  intent: OverseerIntent;
  thoughtSummary?: string;
  voiceState: VoiceState;
  onFaceClick: () => void;
  accentColor?: string;
  className?: string;
}

export const OverseerHero: React.FC<OverseerHeroProps> = memo(({
  faceParameters,
  intent,
  thoughtSummary = "All factory systems are stable.",
  voiceState,
  onFaceClick,
  accentColor = "#1769E8",
  className = "",
}) => {
  const getIntentIcon = () => {
    if (voiceState === "SPEAKING") {
      return <span className="w-2 h-2 rounded-full bg-[#1769E8] animate-ping" />;
    }
    if (voiceState === "LISTENING") {
      return <Mic className="w-3.5 h-3.5 text-[#1769E8] animate-pulse" />;
    }
    switch (intent) {
      case "CRITICAL":
        return <ShieldAlert className="w-3.5 h-3.5 text-[#FF5964] animate-pulse" />;
      case "WARNING":
      case "CONCERNED":
        return <AlertTriangle className="w-3.5 h-3.5 text-[#E8B949]" />;
      case "SUCCESS":
      case "PROUD":
        return <CheckCircle className="w-3.5 h-3.5 text-[#21C58B]" />;
      case "THINKING":
      case "DEEP_THINKING":
        return <Brain className="w-3.5 h-3.5 text-[#1769E8] animate-pulse" />;
      case "RECOVERING":
      case "VERIFYING":
        return <RefreshCw className="w-3.5 h-3.5 text-[#2C72D6] animate-spin" />;
      case "OBSERVING":
        return <Eye className="w-3.5 h-3.5 text-[#1769E8]" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-[#1769E8]" />;
    }
  };

  const getStatusLabel = () => {
    if (voiceState === "SPEAKING") return "SPEAKING";
    if (voiceState === "LISTENING") return "LISTENING";
    return intent.replace("_", " ");
  };

  return (
    <div
      className={`flex flex-col items-center justify-center select-none text-center ${className}`}
      role="region"
      aria-label="Living Overseer Entity"
    >
      {/* 1. Entity Monospace Subtitle */}
      <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.28em] text-[#1769E8] mb-1">
        OVERSEER
      </span>

      {/* 2. Floating Living Face (Subtle, almost invisible visor boundary) */}
      <div 
        className="relative flex items-center justify-center p-3 sm:p-4 my-1 rounded-3xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] transition-all duration-300 group cursor-pointer"
        onClick={onFaceClick}
      >
        <OverseerFace
          targetFaceParameters={faceParameters}
          intent={intent}
          voiceState={voiceState}
          width={280}
          height={170}
          onFaceClick={onFaceClick}
        />
      </div>

      {/* 3. Floating Status Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 mt-2 rounded-full bg-black/[0.04] dark:bg-[#08101B]/80 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs backdrop-blur-xs">
        {getIntentIcon()}
        <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#111827] dark:text-[#F5F7FA]">
          {getStatusLabel()}
        </span>
      </div>

      {/* 4. Soft Operational Thought Narrative */}
      <p className="mt-2 text-xs sm:text-sm font-sans italic text-[#667085] dark:text-[#A7B0BC] max-w-md px-4 line-clamp-2">
        &ldquo;{thoughtSummary}&rdquo;
      </p>
    </div>
  );
});

OverseerHero.displayName = "OverseerHero";
