"use client";

import React, { memo } from "react";
import type { ExpressionConfig } from "./OverseerStateMachine";

interface AmbientFieldProps {
  expression: ExpressionConfig;
}

export const OverseerAmbientField: React.FC<AmbientFieldProps> = memo(({ expression }) => {
  const { primaryColor, ambientIntensity, particleActivity } = expression;

  return (
    <g className="overseer-ambient-field">
      <defs>
        {/* Soft Radial Ambient Glow */}
        <radialGradient id="face-ambient-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity={0.24 * ambientIntensity} />
          <stop offset="60%" stopColor={primaryColor} stopOpacity={0.06 * ambientIntensity} />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
        </radialGradient>

        {/* Visor Capsule Deep Gradient */}
        <linearGradient id="visor-fill-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#081120" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#02060F" stopOpacity="0.98" />
        </linearGradient>
      </defs>

      {/* Radial Soft Ambient Glow */}
      <circle
        cx="140"
        cy="85"
        r="110"
        fill="url(#face-ambient-glow)"
        style={{
          transition: "all 400ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />

      {/* Primary Visor Shell Boundary */}
      <rect
        x="32"
        y="16"
        width="216"
        height="138"
        rx="34"
        fill="url(#visor-fill-grad)"
        stroke={primaryColor}
        strokeWidth="1.5"
        strokeOpacity="0.3"
        style={{
          transition: "stroke 300ms ease, stroke-opacity 300ms ease",
        }}
      />

      {/* Inner Visor Specular Line */}
      <path
        d="M 58 28 Q 140 22 222 28"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1"
        strokeOpacity="0.1"
      />

      {/* Subtle Bottom Ambient Light Catch */}
      <path
        d="M 70 144 Q 140 150 210 144"
        fill="none"
        stroke={primaryColor}
        strokeWidth="1"
        strokeOpacity="0.2"
      />

      {/* Orbiting Telemetry Particles */}
      {particleActivity > 0.25 && (
        <g className="overseer-particles" opacity={particleActivity}>
          <circle
            cx="60"
            cy="45"
            r="1.5"
            fill={primaryColor}
            className="animate-ping"
            style={{ animationDuration: "3s" }}
          />
          <circle
            cx="220"
            cy="125"
            r="1.5"
            fill={primaryColor}
            className="animate-ping"
            style={{ animationDuration: "2.6s" }}
          />
        </g>
      )}
    </g>
  );
});

OverseerAmbientField.displayName = "OverseerAmbientField";
