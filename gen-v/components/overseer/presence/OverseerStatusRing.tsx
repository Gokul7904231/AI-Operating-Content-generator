"use client";

import React, { memo } from "react";
import type { ExpressionConfig } from "./OverseerStateMachine";

interface StatusRingProps {
  expression: ExpressionConfig;
}

export const OverseerStatusRing: React.FC<StatusRingProps> = memo(({ expression }) => {
  const { primaryColor, secondaryColor, ringMode, ringSpeed } = expression;

  return (
    <g className="overseer-status-ring">
      <defs>
        <linearGradient id="ring-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0.85" />
          <stop offset="50%" stopColor={secondaryColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Rotating Segmented Ring */}
      <g
        style={{
          transformOrigin: "140px 85px",
          animation: ringMode !== "calm" ? `overseer-orbit ${ringSpeed}s linear infinite` : "none",
        }}
      >
        <circle
          cx="140"
          cy="85"
          r="74"
          fill="none"
          stroke="url(#ring-glow-grad)"
          strokeWidth="1.25"
          strokeDasharray={
            ringMode === "rendering"
              ? "14 8"
              : ringMode === "listening"
              ? "4 4"
              : "36 10 18 10"
          }
          strokeOpacity={ringMode === "calm" ? "0.25" : "0.75"}
          style={{
            transition: "stroke 300ms ease, stroke-dasharray 300ms ease",
          }}
        />
      </g>

      {/* Outer Fine Dash Circle */}
      <circle
        cx="140"
        cy="85"
        r="80"
        fill="none"
        stroke={primaryColor}
        strokeWidth="0.75"
        strokeDasharray="2 10"
        strokeOpacity="0.2"
      />

      {/* 4 Cardinal Telemetry Ticks */}
      <g stroke={primaryColor} strokeWidth="1.5" strokeOpacity="0.4">
        {/* Top Tick */}
        <line x1="140" y1="6" x2="140" y2="11" />
        {/* Bottom Tick */}
        <line x1="140" y1="159" x2="140" y2="164" />
        {/* Left Tick */}
        <line x1="61" y1="85" x2="66" y2="85" />
        {/* Right Tick */}
        <line x1="214" y1="85" x2="219" y2="85" />
      </g>

      <style jsx>{`
        @keyframes overseer-orbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </g>
  );
});

OverseerStatusRing.displayName = "OverseerStatusRing";
