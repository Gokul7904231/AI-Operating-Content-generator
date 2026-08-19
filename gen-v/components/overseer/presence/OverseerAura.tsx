"use client";

import React, { useMemo } from "react";
import type {
  OverseerIntent,
  OverseerAffectState,
  VisualEffectLevel,
} from "@/factoryos/core/overseer/presence";
import { OverseerEffectController } from "@/factoryos/core/overseer/presence/OverseerEffectController";

interface OverseerAuraProps {
  intent: OverseerIntent;
  affect: OverseerAffectState;
  accentColor?: string;
  effectLevel?: VisualEffectLevel;
  className?: string;
}

export const OverseerAura: React.FC<OverseerAuraProps> = ({
  intent,
  affect,
  accentColor = "#00e5ff",
  effectLevel = 3,
  className = "",
}) => {
  const effectController = useMemo(() => new OverseerEffectController({ effectLevel }), []);

  if (effectLevel < 2) return null;

  const config = effectController.getAuraConfig(intent, affect, accentColor);

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}
    >
      {/* Outer Halo Glow */}
      <div
        className="rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${config.radius * 2}px`,
          height: `${config.radius * 2}px`,
          background: `radial-gradient(circle, ${config.color}22 0%, ${config.color}08 45%, transparent 70%)`,
          opacity: config.intensity,
          filter: "blur(24px)",
          transform: `scale(${1.0 + affect.arousal * 0.1})`,
        }}
      />

      {/* Inner Concentric Pulse Ring */}
      <div
        className="absolute rounded-full border transition-all duration-500 ease-out animate-pulse"
        style={{
          width: `${config.radius * 1.5}px`,
          height: `${config.radius * 1.5}px`,
          borderColor: `${config.color}33`,
          boxShadow: `0 0 30px ${config.color}22, inset 0 0 20px ${config.color}15`,
          animationDuration: `${1 / config.pulseSpeed}s`,
        }}
      />
    </div>
  );
};
