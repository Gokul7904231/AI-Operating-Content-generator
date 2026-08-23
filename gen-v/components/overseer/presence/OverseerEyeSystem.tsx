"use client";

import React, { useEffect, useRef, memo } from "react";
import type { ExpressionConfig } from "./OverseerStateMachine";

interface EyeSystemProps {
  expression: ExpressionConfig;
  targetGaze?: { x: number; y: number }; // -1 to 1 range
  isMouseGazeActive?: boolean;
}

export const OverseerEyeSystem: React.FC<EyeSystemProps> = memo(({
  expression,
  targetGaze = { x: 0, y: 0 },
  isMouseGazeActive = true,
}) => {
  const containerRef = useRef<SVGGElement | null>(null);

  // Micro-motion & Blink State (Isolated from React renders for 60 FPS)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isMounted = true;
    let animFrame: number;

    let curX = 0;
    let curY = 0;
    let targetX = targetGaze.x;
    let targetY = targetGaze.y;

    let nextSaccadeTime = Date.now() + 1500 + Math.random() * 2000;
    let saccadeX = 0;
    let saccadeY = 0;

    let isBlinking = false;
    let blinkStartTime = 0;
    let blinkDuration = 180;
    let isDoubleBlink = false;
    let nextBlinkTime = Date.now() + 2500 + Math.random() * 3500;

    const loop = () => {
      if (!isMounted) return;
      const now = Date.now();

      // 1. Saccade Trigger
      if (now > nextSaccadeTime && !isMouseGazeActive) {
        saccadeX = (Math.random() - 0.5) * 3;
        saccadeY = (Math.random() - 0.5) * 1.5;
        nextSaccadeTime = now + 1800 + Math.random() * 3000;
      }

      // 2. Target Gaze Lerp
      targetX = targetGaze.x * 8 + saccadeX;
      targetY = targetGaze.y * 5 + saccadeY;
      curX += (targetX - curX) * 0.14;
      curY += (targetY - curY) * 0.14;

      // 3. Autonomous Natural Blink (ScaleY)
      let blinkScaleL = 1;
      let blinkScaleR = 1;

      if (!isBlinking && now > nextBlinkTime) {
        isBlinking = true;
        blinkStartTime = now;
        blinkDuration = 160 + Math.random() * 40;
        isDoubleBlink = Math.random() < 0.2;
      }

      if (isBlinking) {
        const progress = (now - blinkStartTime) / blinkDuration;
        if (progress <= 0.5) {
          const closeP = progress / 0.5;
          blinkScaleL = 1 - closeP * 0.94;
          blinkScaleR = 1 - closeP * 0.94;
        } else if (progress <= 1.0) {
          const openP = (progress - 0.5) / 0.5;
          blinkScaleL = 0.06 + openP * 0.94;
          blinkScaleR = 0.06 + Math.min(1, openP * 1.04) * 0.94;
        } else {
          isBlinking = false;
          if (isDoubleBlink) {
            isDoubleBlink = false;
            nextBlinkTime = now + 80;
          } else {
            nextBlinkTime = now + 2800 + Math.random() * 3800;
          }
        }
      }

      // Apply CSS Variables directly to SVG group
      el.style.setProperty("--pupil-x", `${curX.toFixed(2)}px`);
      el.style.setProperty("--pupil-y", `${curY.toFixed(2)}px`);
      el.style.setProperty("--blink-l", blinkScaleL.toFixed(3));
      el.style.setProperty("--blink-r", blinkScaleR.toFixed(3));

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animFrame);
    };
  }, [targetGaze, isMouseGazeActive]);

  const { primaryColor, secondaryColor, eyeSquint, eyeScale, pupilScale } = expression;

  return (
    <g ref={containerRef} className="overseer-eye-system">
      <defs>
        {/* Pure Electric Blue Luminous Radial Gradient (No Black Pupil) */}
        <radialGradient id="overseer-luminous-core-gradient" cx="45%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
          <stop offset="25%" stopColor="#60A5FA" stopOpacity="0.95" />
          <stop offset="55%" stopColor={secondaryColor || "#3B82F6"} stopOpacity="0.92" />
          <stop offset="85%" stopColor={primaryColor || "#1D4ED8"} stopOpacity="0.90" />
          <stop offset="100%" stopColor="#0B1E48" stopOpacity="0.85" />
        </radialGradient>

        <radialGradient id="overseer-inner-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
        </radialGradient>

        <filter id="eye-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* LEFT EYE CONTAINER */}
      <g transform="translate(95, 82)">
        {/* Outer Dark Socket Housing */}
        <rect
          x="-22"
          y="-35"
          width="44"
          height="70"
          rx="22"
          fill="#050C1A"
          stroke={primaryColor}
          strokeWidth="1.75"
          strokeOpacity="0.45"
        />

        {/* Outer Eye Soft Luminous Backlight */}
        <rect
          x="-20"
          y="-33"
          width="40"
          height="66"
          rx="20"
          fill={primaryColor}
          fillOpacity="0.18"
        />

        {/* Dynamic Eyelid Group (Pure scaleY around center 0,0) */}
        <g
          style={{
            transform: `scaleY(calc(var(--blink-l, 1) * ${1 - eyeSquint})) scale(${eyeScale})`,
            transformOrigin: "0px 0px",
            transition: "transform 140ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          {/* Gaze-Tracking Electric Blue Luminous Eye */}
          <g
            style={{
              transform: `translate(var(--pupil-x, 0px), var(--pupil-y, 0px))`,
            }}
          >
            {/* Luminous Iris Aperture */}
            <rect
              x="-17"
              y="-28"
              width="34"
              height="56"
              rx="17"
              fill="url(#overseer-luminous-core-gradient)"
              filter="url(#eye-glow-filter)"
            />

            {/* Inner Electric Blue Luminous Core (Replaced Black Pupil with Pure Glow Aperture) */}
            <ellipse
              cx="0"
              cy="0"
              rx={10 * (pupilScale || 1)}
              ry={16 * (pupilScale || 1)}
              fill="url(#overseer-inner-glow)"
              opacity="0.9"
            />

            {/* Dynamic Aperture Ring */}
            <ellipse
              cx="0"
              cy="0"
              rx={11 * (pupilScale || 1)}
              ry={17 * (pupilScale || 1)}
              fill="none"
              stroke="#93C5FD"
              strokeWidth="1.2"
              strokeDasharray="4 2"
              opacity="0.75"
            />

            {/* Primary Specular Light Catch */}
            <ellipse
              cx="-5"
              cy="-10"
              rx="4.5"
              ry="6.5"
              fill="#FFFFFF"
              opacity="0.98"
            />

            {/* Secondary Specular Light Catch */}
            <circle
              cx="5"
              cy="9"
              r="2.2"
              fill="#FFFFFF"
              opacity="0.8"
            />
          </g>
        </g>
      </g>

      {/* RIGHT EYE CONTAINER */}
      <g transform="translate(185, 82)">
        {/* Outer Dark Socket Housing */}
        <rect
          x="-22"
          y="-35"
          width="44"
          height="70"
          rx="22"
          fill="#050C1A"
          stroke={primaryColor}
          strokeWidth="1.75"
          strokeOpacity="0.45"
        />

        {/* Outer Eye Soft Luminous Backlight */}
        <rect
          x="-20"
          y="-33"
          width="40"
          height="66"
          rx="20"
          fill={primaryColor}
          fillOpacity="0.18"
        />

        {/* Dynamic Eyelid Group (Pure scaleY around center 0,0) */}
        <g
          style={{
            transform: `scaleY(calc(var(--blink-r, 1) * ${1 - eyeSquint})) scale(${eyeScale})`,
            transformOrigin: "0px 0px",
            transition: "transform 140ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          {/* Gaze-Tracking Electric Blue Luminous Eye */}
          <g
            style={{
              transform: `translate(var(--pupil-x, 0px), var(--pupil-y, 0px))`,
            }}
          >
            {/* Luminous Iris Aperture */}
            <rect
              x="-17"
              y="-28"
              width="34"
              height="56"
              rx="17"
              fill="url(#overseer-luminous-core-gradient)"
              filter="url(#eye-glow-filter)"
            />

            {/* Inner Electric Blue Luminous Core (Replaced Black Pupil with Pure Glow Aperture) */}
            <ellipse
              cx="0"
              cy="0"
              rx={10 * (pupilScale || 1)}
              ry={16 * (pupilScale || 1)}
              fill="url(#overseer-inner-glow)"
              opacity="0.9"
            />

            {/* Dynamic Aperture Ring */}
            <ellipse
              cx="0"
              cy="0"
              rx={11 * (pupilScale || 1)}
              ry={17 * (pupilScale || 1)}
              fill="none"
              stroke="#93C5FD"
              strokeWidth="1.2"
              strokeDasharray="4 2"
              opacity="0.75"
            />

            {/* Primary Specular Light Catch */}
            <ellipse
              cx="-5"
              cy="-10"
              rx="4.5"
              ry="6.5"
              fill="#FFFFFF"
              opacity="0.98"
            />

            {/* Secondary Specular Light Catch */}
            <circle
              cx="5"
              cy="9"
              r="2.2"
              fill="#FFFFFF"
              opacity="0.8"
            />
          </g>
        </g>
      </g>
    </g>
  );
});

OverseerEyeSystem.displayName = "OverseerEyeSystem";
