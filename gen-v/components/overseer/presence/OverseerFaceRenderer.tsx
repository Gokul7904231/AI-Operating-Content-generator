"use client";

import React, { useRef, useEffect, memo } from "react";
import type { FaceParameters, OverseerIntent, VoiceState } from "@/factoryos/core/overseer/presence";
import { OverseerAnimationController } from "@/factoryos/core/overseer/presence/OverseerAnimationController";

export interface OverseerFaceRendererProps {
  faceParameters: FaceParameters;
  intent?: OverseerIntent;
  voiceState?: VoiceState;
  width?: number;
  height?: number;
  className?: string;
  onFaceClick?: (e: React.MouseEvent) => void;
  enableMouseLook?: boolean;
}

export const OverseerFaceRenderer: React.FC<OverseerFaceRendererProps> = memo(({
  faceParameters,
  intent = "IDLE",
  voiceState = "IDLE",
  width = 240,
  height = 150,
  className = "",
  onFaceClick,
  enableMouseLook = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseGazeRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs holding latest reactive props for the non-react animation frame loop
  const targetParamsRef = useRef<FaceParameters>(faceParameters);
  targetParamsRef.current = faceParameters;

  const intentRef = useRef<OverseerIntent>(intent);
  intentRef.current = intent;

  const voiceStateRef = useRef<VoiceState>(voiceState);
  voiceStateRef.current = voiceState;

  const enableMouseLookRef = useRef<boolean>(enableMouseLook);
  enableMouseLookRef.current = enableMouseLook;

  // Animation controller instance (retained across renders)
  const animControllerRef = useRef<OverseerAnimationController | null>(null);
  if (!animControllerRef.current) {
    animControllerRef.current = new OverseerAnimationController(faceParameters);
  }

  // Autonomous natural procedural state trackers
  const blinkStateRef = useRef<{ isBlinking: boolean; blinkStart: number; nextBlinkTime: number }>({
    isBlinking: false,
    blinkStart: 0,
    nextBlinkTime: Date.now() + 2500 + Math.random() * 3000,
  });

  const saccadeRef = useRef<{ x: number; y: number; nextSaccadeTime: number }>({
    x: 0,
    y: 0,
    nextSaccadeTime: Date.now() + 1500 + Math.random() * 2500,
  });

  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      prefersReducedMotion.current = mediaQuery.matches;
      const handler = (e: MediaQueryListEvent) => {
        prefersReducedMotion.current = e.matches;
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  // Isolated high-performance 60 FPS canvas render loop (ZERO React setState calls)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const startTime = Date.now();

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const renderLoop = () => {
      const now = Date.now();
      const elapsedSec = (now - startTime) / 1000;
      const isReduced = prefersReducedMotion.current;
      const controller = animControllerRef.current!;

      const blendedTarget: FaceParameters = JSON.parse(JSON.stringify(targetParamsRef.current));
      const currentIntent = intentRef.current;
      const currentVoice = voiceStateRef.current;

      // 1. Natural Random Blink
      if (!isReduced) {
        if (!blinkStateRef.current.isBlinking && now >= blinkStateRef.current.nextBlinkTime) {
          blinkStateRef.current.isBlinking = true;
          blinkStateRef.current.blinkStart = now;
        }

        if (blinkStateRef.current.isBlinking) {
          const blinkProgress = (now - blinkStateRef.current.blinkStart) / 140;
          if (blinkProgress >= 1.0) {
            blinkStateRef.current.isBlinking = false;
            blinkStateRef.current.nextBlinkTime = now + 2500 + Math.random() * 3500;
          } else {
            const blinkFactor = Math.sin(blinkProgress * Math.PI);
            blendedTarget.eye.openness = Math.max(0.02, blendedTarget.eye.openness * (1 - blinkFactor * 0.95));
          }
        }
      }

      // 2. Micro-Saccades
      if (!isReduced && currentIntent === "IDLE") {
        if (now >= saccadeRef.current.nextSaccadeTime) {
          saccadeRef.current.x = (Math.random() - 0.5) * 0.12;
          saccadeRef.current.y = (Math.random() - 0.5) * 0.08;
          saccadeRef.current.nextSaccadeTime = now + 1800 + Math.random() * 2500;
        }
        blendedTarget.eye.gazeX += saccadeRef.current.x;
        blendedTarget.eye.gazeY += saccadeRef.current.y;
      }

      // 3. Subtle Breathing Motion
      if (!isReduced) {
        const breathingCycle = Math.sin(elapsedSec * 1.5) * 0.015;
        blendedTarget.faceScale = Math.max(0.8, Math.min(1.2, blendedTarget.faceScale + breathingCycle));
      }

      // 4. Speaking Mouth Aperture Modulation
      if (currentVoice === "SPEAKING") {
        const speechModulation = Math.abs(Math.sin(elapsedSec * 12)) * 0.6 + Math.abs(Math.cos(elapsedSec * 18)) * 0.4;
        blendedTarget.mouthOpenness = Math.max(0.3, speechModulation * 0.85);
        blendedTarget.mouthCurve = 0.1;
      } else if (currentVoice === "LISTENING") {
        blendedTarget.mouthOpenness = 0.02;
        blendedTarget.eye.openness = Math.min(1.0, blendedTarget.eye.openness * 1.05);
      }

      // 5. Mouse Look Offset
      if (enableMouseLookRef.current && !isReduced) {
        blendedTarget.eye.gazeX = Math.max(
          -1.0,
          Math.min(1.0, blendedTarget.eye.gazeX + mouseGazeRef.current.x * 0.22)
        );
        blendedTarget.eye.gazeY = Math.max(
          -1.0,
          Math.min(1.0, blendedTarget.eye.gazeY + mouseGazeRef.current.y * 0.18)
        );
      }

      // Step physics
      const currentParams = controller.stepToward(blendedTarget, isReduced ? 2.5 : 1.0);

      // Check if light mode is active in the DOM
      const isLightMode = typeof document !== "undefined" && (document.documentElement.classList.contains("light") || document.documentElement.getAttribute("data-theme") === "light");

      // Render Directly to Canvas
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const { eye, mouthCurve, mouthOpenness, headTilt, faceScale, glowIntensity, accentColor } = currentParams;

      const centerX = width / 2;
      const centerY = height / 2;
      const baseScale = Math.min(width / 260, height / 160);

      // Subtle Soft Ambient Aura behind the Face (Restrained, not neon)
      const auraGradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.max(width, height) * 0.48);
      const auraAlpha = Math.min(0.24, (glowIntensity * (isLightMode ? 0.12 : 0.18)));
      auraGradient.addColorStop(0, isLightMode ? `rgba(23, 105, 232, ${auraAlpha * 1.2})` : `rgba(23, 105, 232, ${auraAlpha})`);
      auraGradient.addColorStop(1, "rgba(23, 105, 232, 0)");
      ctx.fillStyle = auraGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.translate(centerX, centerY);
      ctx.rotate((headTilt * Math.PI) / 180);
      ctx.scale(baseScale * faceScale, baseScale * faceScale);

      // Refined Apple-Grade Eye Geometry Constants (Disciplined, spacious, calm)
      const eyeSpacing = 68;
      const baseEyeWidth = 52 * eye.width;
      const baseEyeHeight = 66 * eye.height * Math.max(0.04, eye.openness);
      const gazeShiftX = eye.gazeX * 14;
      const gazeShiftY = eye.gazeY * 12;

      // Effective colors based on theme
      const eyeFillColor = isLightMode ? "#0F1E36" : (accentColor || "#1769E8");
      const pupilColor = isLightMode ? "#1769E8" : "#FFFFFF";
      const eyeGlowColor = isLightMode ? "rgba(23, 105, 232, 0.3)" : (accentColor || "#1769E8");

      // Eye Renderer
      const drawEye = (isLeft: boolean) => {
        const eyeCenterX = isLeft ? -eyeSpacing : eyeSpacing;
        const eyeCenterY = -4;

        ctx.save();
        ctx.translate(eyeCenterX, eyeCenterY);

        const browRot = ((isLeft ? -eye.eyebrowAngle : eye.eyebrowAngle) * Math.PI) / 180;
        ctx.rotate(browRot);

        // Soft restrained halo glow
        ctx.shadowColor = eyeGlowColor;
        ctx.shadowBlur = (isLightMode ? 10 : 16) * glowIntensity;

        ctx.fillStyle = eyeFillColor;
        ctx.beginPath();
        ctx.roundRect(
          -baseEyeWidth / 2,
          -baseEyeHeight / 2,
          baseEyeWidth,
          baseEyeHeight,
          Math.min(baseEyeWidth, baseEyeHeight) / 2
        );
        ctx.fill();

        // Eye Pupil / Iris Inner Light
        if (eye.openness > 0.12) {
          ctx.shadowBlur = isLightMode ? 4 : 8;
          ctx.shadowColor = pupilColor;
          ctx.fillStyle = pupilColor;

          const pupilW = baseEyeWidth * 0.44 * eye.pupilScale;
          const pupilH = baseEyeHeight * 0.44 * eye.pupilScale;

          ctx.beginPath();
          ctx.roundRect(
            gazeShiftX - pupilW / 2,
            gazeShiftY - pupilH / 2,
            pupilW,
            pupilH,
            Math.min(pupilW, pupilH) / 2
          );
          ctx.fill();

          // Subtle reflection specular dot
          ctx.fillStyle = isLightMode ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.95)";
          ctx.beginPath();
          ctx.arc(gazeShiftX - pupilW * 0.22, gazeShiftY - pupilH * 0.25, pupilW * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      };

      drawEye(true);
      drawEye(false);

      // Refined Minimal Robotic Mouth Indicator
      const mouthY = 48;
      const mouthW = 38;
      const mouthH = Math.max(2.5, mouthOpenness * 18);

      ctx.save();
      ctx.translate(0, mouthY);
      ctx.shadowColor = eyeGlowColor;
      ctx.shadowBlur = 6 * glowIntensity;
      ctx.fillStyle = eyeFillColor;

      if (mouthOpenness > 0.08) {
        ctx.beginPath();
        ctx.roundRect(-mouthW / 2, -mouthH / 2, mouthW, mouthH, Math.min(6, mouthH / 2));
        ctx.fill();

        ctx.fillStyle = pupilColor;
        ctx.beginPath();
        ctx.roundRect(-mouthW * 0.35, -mouthH * 0.2, mouthW * 0.7, mouthH * 0.4, 1.5);
        ctx.fill();
      } else {
        ctx.strokeStyle = eyeFillColor;
        ctx.lineWidth = 3.0;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-mouthW / 2, 0);
        ctx.quadraticCurveTo(0, mouthCurve * 10, mouthW / 2, 0);
        ctx.stroke();
      }
      ctx.restore();

      ctx.restore();

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [width, height]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableMouseLook || prefersReducedMotion.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    mouseGazeRef.current = { x: nx, y: ny };
  };

  const handleMouseLeave = () => {
    mouseGazeRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onFaceClick}
      className={`relative flex items-center justify-center cursor-pointer select-none ${className}`}
      style={{ width, height }}
      role="img"
      aria-label={`Overseer Face displaying ${intent} state`}
    >
      <canvas
        ref={canvasRef}
        style={{ width, height }}
      />
    </div>
  );
});

OverseerFaceRenderer.displayName = "OverseerFaceRenderer";
