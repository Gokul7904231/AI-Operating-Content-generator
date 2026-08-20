"use client";

import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import type { FaceParameters, OverseerIntent, VoiceState } from "@/factoryos/core/overseer/presence";
import {
  deriveOverseerExpression,
  EXPRESSION_MAP,
  type OverseerExpression,
} from "./OverseerStateMachine";
import { OverseerAmbientField } from "./OverseerAmbientField";
import { OverseerStatusRing } from "./OverseerStatusRing";
import { OverseerEyeSystem } from "./OverseerEyeSystem";
import { OverseerBrowSystem } from "./OverseerBrowSystem";
import { OverseerMouthSystem } from "./OverseerMouthSystem";

export interface OverseerFaceProps {
  targetFaceParameters?: FaceParameters;
  intent?: OverseerIntent;
  voiceState?: VoiceState;
  activeJobsCount?: number;
  hasErrors?: boolean;
  width?: number;
  height?: number;
  className?: string;
  onFaceClick?: () => void;
  enableMouseLook?: boolean;
}

export const OverseerFace: React.FC<OverseerFaceProps> = memo(({
  intent = "OBSERVING",
  voiceState = "IDLE",
  activeJobsCount = 0,
  hasErrors = false,
  width = 440,
  height = 267,
  className = "",
  onFaceClick,
  enableMouseLook = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Derive unified state from incoming intent, voice, and telemetry
  const expressionKey: OverseerExpression = deriveOverseerExpression(
    intent,
    voiceState,
    activeJobsCount,
    hasErrors
  );
  const expression = EXPRESSION_MAP[expressionKey] || EXPRESSION_MAP.observing;

  // Contextual default gaze (e.g. looking down towards input when listening)
  const defaultGaze = expressionKey === "listening" ? { x: 0, y: 0.3 } : { x: 0, y: 0 };

  // Mouse / Pointer Gaze Tracking with boundary clamping
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enableMouseLook || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
    const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);

    // Clamp within safe subtle eye range (-1 to 1)
    setGaze({
      x: Math.max(-1, Math.min(1, deltaX)),
      y: Math.max(-1, Math.min(1, deltaY)),
    });
  }, [enableMouseLook]);

  useEffect(() => {
    if (!enableMouseLook) return;
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [enableMouseLook, handleMouseMove]);

  const activeGaze = isHovered || (gaze.x !== 0 && gaze.y !== 0) ? gaze : defaultGaze;

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center cursor-pointer select-none transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] ${className}`}
      style={{ width: "100%", maxWidth: width, height: "auto", aspectRatio: "280 / 170" }}
      onClick={onFaceClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setGaze({ x: 0, y: 0 });
      }}
      role="img"
      aria-label={`Overseer Status: ${expression.label}`}
    >
      <svg
        viewBox="0 0 280 170"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Layer 1: Ambient Energy Field & Visor Shell */}
        <OverseerAmbientField expression={expression} />

        {/* Layer 2: Dynamic Segmented Status Ring */}
        <OverseerStatusRing expression={expression} />

        {/* Layer 3: Micro-Brow Expressive System */}
        <OverseerBrowSystem expression={expression} />

        {/* Layer 4: Layered Gaze-Tracking SVG Eyes */}
        <OverseerEyeSystem
          expression={expression}
          targetGaze={activeGaze}
          isMouseGazeActive={isHovered || (gaze.x !== 0 && gaze.y !== 0)}
        />

        {/* Layer 5: Vector Morphing Mouth System */}
        <OverseerMouthSystem
          expression={expression}
          isSpeaking={voiceState === "SPEAKING" || expressionKey === "speaking"}
        />
      </svg>
    </div>
  );
});

OverseerFace.displayName = "OverseerFace";
