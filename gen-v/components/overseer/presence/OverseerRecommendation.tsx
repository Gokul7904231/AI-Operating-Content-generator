"use client";

import React, { memo } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import type { OverseerMode } from "./OverseerChat";

interface OverseerRecommendationProps {
  recommendation?: {
    headline: string;
    source: string;
    confidence: number;
    promptAction: string;
    mode: OverseerMode;
  };
  onApplyRecommendation: (prompt: string, mode: OverseerMode) => void;
  onReviewEvidence: () => void;
  accentColor?: string;
  className?: string;
}

export const OverseerRecommendation: React.FC<OverseerRecommendationProps> = memo(({
  recommendation = {
    headline: "Quiz shorts show 42% higher retention across educational topics.",
    source: "Agent-Reach Intelligence",
    confidence: 0.88,
    promptAction: "Create a 30 second quiz short on World History & AI Trivia",
    mode: "CREATE",
  },
  onApplyRecommendation,
  onReviewEvidence,
  accentColor = "#1677FF",
  className = "",
}) => {
  return (
    <div
      className={`p-3 sm:p-3.5 rounded-2xl bg-[#0A1220] border border-white/[0.08] shadow-sm select-none transition-all ${className}`}
      role="region"
      aria-label="Overseer Proactive Recommendation"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#1677FF]">
          <Lightbulb className="w-3.5 h-3.5" />
          <span>OVERSEER INSIGHT</span>
        </div>
        <span className="text-[10px] font-mono text-[#667085]">
          {(recommendation.confidence * 100).toFixed(0)}% Conf • {recommendation.source}
        </span>
      </div>

      <p className="text-xs font-sans font-medium text-[#F5F7FA] leading-snug mb-2.5">
        {recommendation.headline}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApplyRecommendation(recommendation.promptAction, (recommendation.mode as OverseerMode) || "CREATE")}
          className="flex-1 py-1 px-2.5 rounded-xl bg-[#1677FF] hover:bg-[#0F63D8] text-white text-[11px] font-sans font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
        >
          <span>Create Mission</span>
          <ArrowRight className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onReviewEvidence}
          className="py-1 px-2.5 rounded-xl bg-[#0E1728] hover:bg-[#121E32] border border-white/[0.08] text-[11px] font-sans font-medium text-[#F5F7FA] transition-colors cursor-pointer"
        >
          Evidence
        </button>
      </div>
    </div>
  );
});

OverseerRecommendation.displayName = "OverseerRecommendation";
