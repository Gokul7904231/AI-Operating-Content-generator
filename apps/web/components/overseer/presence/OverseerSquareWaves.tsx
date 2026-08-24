"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeStore } from "@/lib/theme-store";
import type { VoiceState, OverseerIntent } from "@/factoryos/core/overseer/presence";

interface OverseerSquareWavesProps {
  accentColor?: string;
  intent?: OverseerIntent;
  voiceState?: VoiceState;
  className?: string;
  triggerBurst?: boolean;
}

interface BurstSquare {
  id: number;
  initialScale: number;
  targetScale: number;
  delay: number;
  duration: number;
  opacity: number;
  borderColor: string;
}

export const OverseerSquareWaves: React.FC<OverseerSquareWavesProps> = ({
  accentColor = "#0A84FF",
  intent = "IDLE",
  voiceState = "IDLE",
  className = "",
  triggerBurst = false,
}) => {
  const lastThemeSwitchTimestamp = useThemeStore((state) => state.lastThemeSwitchTimestamp);
  const [burstSquares, setBurstSquares] = useState<BurstSquare[]>([]);

  // Trigger burst square shockwaves on theme switch or manual trigger (centered on face)
  useEffect(() => {
    if (lastThemeSwitchTimestamp === 0 && !triggerBurst) return;

    const newBurst: BurstSquare[] = Array.from({ length: 4 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      initialScale: 1.0,
      targetScale: 1.6 + i * 0.35,
      delay: i * 0.1,
      duration: 1.1 + i * 0.15,
      opacity: 0.8 - i * 0.15,
      borderColor: i % 2 === 0 ? accentColor : "#38bdf8",
    }));

    setBurstSquares((prev) => [...prev.slice(-8), ...newBurst]);

    const timer = setTimeout(() => {
      setBurstSquares((prev) => prev.filter((s) => Date.now() - s.id < 2200));
    }, 2200);

    return () => clearTimeout(timer);
  }, [lastThemeSwitchTimestamp, triggerBurst, accentColor]);

  // Ambient continuous wave pulses matching visor dimensions (270px x 190px, 44px radius)
  const waveDelays = [0, 1.0, 2.0, 3.0];

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-visible ${className}`}
      aria-hidden="true"
    >
      {/* 1. Ambient Concentric Expanding Face Squares (Clean Smooth Rounded Outlines) */}
      {waveDelays.map((delay, index) => (
        <motion.div
          key={`ambient-face-square-${index}`}
          className="absolute border border-solid pointer-events-none"
          style={{
            width: "270px",
            height: "190px",
            borderRadius: "44px",
            top: "calc(50% - 8px)",
            left: "50%",
            x: "-50%",
            y: "-50%",
            borderColor: `${accentColor}${index % 2 === 0 ? "55" : "33"}`,
            boxShadow: `0 0 20px ${accentColor}1A, inset 0 0 12px ${accentColor}0D`,
          }}
          initial={{ scale: 1.0, opacity: 0.7 }}
          animate={{
            scale: [1.0, 1.22, 1.48, 1.8],
            opacity: [0.7, 0.42, 0.16, 0],
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            delay,
            ease: "easeOut",
          }}
        />
      ))}

      {/* 2. Burst Shockwave Face Squares (Clean Smooth Rounded Outlines on Theme Toggle / Click) */}
      <AnimatePresence>
        {burstSquares.map((sq) => (
          <motion.div
            key={sq.id}
            className="absolute border-2 pointer-events-none"
            style={{
              width: "270px",
              height: "190px",
              borderRadius: "44px",
              top: "calc(50% - 8px)",
              left: "50%",
              x: "-50%",
              y: "-50%",
              borderColor: sq.borderColor,
              boxShadow: `0 0 32px ${sq.borderColor}66, inset 0 0 18px ${sq.borderColor}33`,
            }}
            initial={{ scale: sq.initialScale, opacity: sq.opacity }}
            animate={{
              scale: sq.targetScale,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: sq.duration,
              delay: sq.delay,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
