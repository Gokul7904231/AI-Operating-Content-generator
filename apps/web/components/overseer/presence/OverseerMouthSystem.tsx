"use client";

import React, { memo } from "react";
import type { ExpressionConfig } from "./OverseerStateMachine";

interface MouthSystemProps {
  expression: ExpressionConfig;
  isSpeaking?: boolean;
}

export const OverseerMouthSystem: React.FC<MouthSystemProps> = memo(({
  expression,
  isSpeaking = false,
}) => {
  const { mouthState, primaryColor } = expression;

  // Morphing path calculation centered on (140, 130)
  const getMouthPath = () => {
    switch (mouthState) {
      case "smile":
      case "success":
        return "M 130 128 Q 140 135 150 128";
      case "concerned":
        return "M 131 133 Q 140 128 149 133";
      case "thinking":
        return "M 133 130 Q 140 130 147 131";
      case "speaking":
        return isSpeaking
          ? "M 132 130 Q 140 137 148 130"
          : "M 132 130 Q 140 133 148 130";
      case "neutral":
      default:
        return "M 132 130 Q 140 131 148 130";
    }
  };

  return (
    <g className="overseer-mouth-system">
      {/* Subtle Glow Behind Mouth */}
      <path
        d={getMouthPath()}
        fill="none"
        stroke={primaryColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeOpacity="0.25"
        style={{
          transition: "d 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />

      {/* Primary Mouth Vector Line */}
      <path
        d={getMouthPath()}
        fill="none"
        stroke={primaryColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        style={{
          transition: "d 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
        className={mouthState === "speaking" ? "animate-pulse" : ""}
      />
    </g>
  );
});

OverseerMouthSystem.displayName = "OverseerMouthSystem";
