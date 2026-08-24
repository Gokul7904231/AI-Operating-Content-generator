"use client";

import React, { memo } from "react";
import type { FaceParameters, OverseerIntent, VoiceState } from "@/factoryos/core/overseer/presence";
import { OverseerFace } from "./OverseerFace";
import {
  AlertTriangle,
  CheckCircle,
  Brain,
  RefreshCw,
  ShieldAlert,
  Eye,
  Mic,
  Activity,
  Layers,
  Zap,
} from "lucide-react";
import BrandIcon from "@/components/BrandIcon";

interface ActiveMission {
  id: string;
  topic: string;
  stage: string;
  progressPct: number;
}

interface OverseerHeroProps {
  faceParameters?: FaceParameters;
  intent: OverseerIntent;
  thoughtSummary?: string;
  voiceState: VoiceState;
  activeJobsCount?: number;
  hasErrors?: boolean;
  activeMission?: ActiveMission | null;
  metrics?: {
    factoryHealthPercent?: number;
    activeMissionsCount?: number;
    healthyWorkersCount?: number;
  };
  onFaceClick: () => void;
  onQuickCommand?: (command: string) => void;
  accentColor?: string;
  className?: string;
}

export const OverseerHero: React.FC<OverseerHeroProps> = memo(({
  faceParameters,
  intent,
  thoughtSummary = "All factory systems are operating at peak efficiency.",
  voiceState,
  activeJobsCount = 0,
  hasErrors = false,
  activeMission = null,
  metrics,
  onFaceClick,
  onQuickCommand,
  accentColor = "#1677FF",
  className = "",
}) => {
  const getIntentIcon = () => {
    if (voiceState === "SPEAKING") {
      return <span className="w-2 h-2 rounded-full bg-[#1677FF] animate-ping" />;
    }
    if (voiceState === "LISTENING") {
      return <Mic className="w-3.5 h-3.5 text-[#06B6D4] animate-pulse" />;
    }
    switch (intent) {
      case "CRITICAL":
        return <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444] animate-pulse" />;
      case "WARNING":
      case "CONCERNED":
        return <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />;
      case "SUCCESS":
      case "PROUD":
        return <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />;
      case "THINKING":
      case "DEEP_THINKING":
        return <Brain className="w-3.5 h-3.5 text-[#8B5CF6] animate-pulse" />;
      case "RECOVERING":
      case "VERIFYING":
        return <RefreshCw className="w-3.5 h-3.5 text-[#0284C7] animate-spin" />;
      case "OBSERVING":
        return <Eye className="w-3.5 h-3.5 text-[#1677FF]" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-[#1677FF]" />;
    }
  };

  const getStatusLabel = () => {
    if (voiceState === "SPEAKING") return "SPEAKING";
    if (voiceState === "LISTENING") return "LISTENING";
    if (activeJobsCount > 0) return `PROCESSING (${activeJobsCount} ACTIVE)`;
    return intent.replace(/_/g, " ");
  };

  return (
    <div
      className={`flex flex-col items-center justify-center select-none text-center relative ${className}`}
      role="region"
      aria-label="Living Frontier Overseer Entity"
    >
      {/* 2. Floating Living SVG Face with Gaze Tracking & Autonomous Expressions */}
      <div
        className="relative flex items-center justify-center p-2 my-2 transition-all duration-300 group cursor-pointer w-full max-w-[340px] sm:max-w-[400px] md:max-w-[460px]"
        onClick={onFaceClick}
      >
        <OverseerFace
          targetFaceParameters={faceParameters}
          intent={intent}
          voiceState={voiceState}
          activeJobsCount={activeJobsCount}
          hasErrors={hasErrors}
          width={460}
          height={280}
          onFaceClick={onFaceClick}
          enableMouseLook={true}
        />
      </div>

      {/* 3. Floating Status Pill with Semantic Feedback */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mt-1 rounded-full bg-black/[0.04] dark:bg-[#08101B]/80 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs backdrop-blur-md transition-all">
        {getIntentIcon()}
        <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#111827] dark:text-[#F5F7FA]">
          {getStatusLabel()}
        </span>
      </div>

      {/* 4. Soft Operational Thought Narrative */}
      <p className="mt-2.5 text-xs sm:text-sm font-sans italic text-[#667085] dark:text-[#A7B0BC] max-w-lg px-4 line-clamp-2">
        &ldquo;{thoughtSummary}&rdquo;
      </p>

      {/* 5. Contextual Active Mission Card (When a render/generation is active) */}
      {activeMission && (
        <div className="mt-4 w-full max-w-md bg-white dark:bg-[#0A1220] border border-[#1677FF]/30 rounded-2xl p-4 shadow-sm text-left space-y-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1677FF] flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#1677FF]" /> Active Pipeline Mission
            </span>
            <span className="text-[10px] font-semibold text-[#667085] dark:text-[#A8B2C1]">
              {activeMission.stage || "Rendering"} ({activeMission.progressPct || 65}%)
            </span>
          </div>
          <div className="text-xs font-bold text-[#111827] dark:text-[#F5F7FA] truncate">
            {activeMission.topic}
          </div>
          <div className="w-full bg-black/[0.04] dark:bg-[#070D18] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#1677FF] h-full rounded-full transition-all duration-300"
              style={{ width: `${activeMission.progressPct || 65}%` }}
            />
          </div>
        </div>
      )}

      {/* 6. Contextual Quick Command Chips */}
      {onQuickCommand && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-xl mx-auto">
          <button
            onClick={() => onQuickCommand("Create video about ")}
            className="px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-[#1677FF]/10 hover:border-[#1677FF]/30 border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-medium text-[#667085] dark:text-[#A8B2C1] hover:text-[#1677FF] dark:hover:text-[#60A5FA] transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <BrandIcon className="w-3 h-3" /> Create Short
          </button>
          <button
            onClick={() => onQuickCommand("Check my 5-video quota")}
            className="px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-[#1677FF]/10 hover:border-[#1677FF]/30 border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-medium text-[#667085] dark:text-[#A8B2C1] hover:text-[#1677FF] dark:hover:text-[#60A5FA] transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Layers className="w-3 h-3" /> Check Quota
          </button>
          <button
            onClick={() => onQuickCommand("System status report")}
            className="px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-[#1677FF]/10 hover:border-[#1677FF]/30 border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-medium text-[#667085] dark:text-[#A8B2C1] hover:text-[#1677FF] dark:hover:text-[#60A5FA] transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Activity className="w-3 h-3" /> System Status
          </button>
        </div>
      )}
    </div>
  );
});

OverseerHero.displayName = "OverseerHero";
