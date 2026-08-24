"use client";

import React, { useState, useEffect } from "react";
import type { VoiceState } from "@/factoryos/core/overseer/presence";

interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface OverseerInteractionOverlayProps {
  voiceState?: VoiceState;
  accentColor?: string;
  className?: string;
}

export const OverseerInteractionOverlay: React.FC<OverseerInteractionOverlayProps> = ({
  voiceState = "IDLE",
  accentColor = "#00e5ff",
  className = "",
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const newRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
        color: accentColor,
      };
      setRipples((prev) => [...prev.slice(-4), newRipple]);
    };

    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [accentColor]);

  // Clean up ripples after 600ms
  useEffect(() => {
    if (ripples.length === 0) return;
    const timer = setTimeout(() => {
      setRipples((prev) => prev.filter((r) => Date.now() - r.id < 600));
    }, 600);
    return () => clearTimeout(timer);
  }, [ripples]);

  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden z-20 ${className}`}>
      {/* Click / Touch Energy Ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full border animate-ping pointer-events-none"
          style={{
            left: r.x - 20,
            top: r.y - 20,
            width: 40,
            height: 40,
            borderColor: `${r.color}88`,
            boxShadow: `0 0 16px ${r.color}44`,
          }}
        />
      ))}

      {/* Listening Wave Pulse when user is speaking */}
      {voiceState === "LISTENING" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-96 h-96 rounded-full border-2 animate-ping"
            style={{
              borderColor: `${accentColor}33`,
              animationDuration: "1.8s",
            }}
          />
        </div>
      )}
    </div>
  );
};
