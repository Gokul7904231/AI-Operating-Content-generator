"use client";

import React, { useRef, useEffect } from "react";
import type {
  OverseerIntent,
  OverseerAffectState,
  VisualEffectLevel,
} from "@/factoryos/core/overseer/presence";
import { OverseerEffectController } from "@/factoryos/core/overseer/presence/OverseerEffectController";

interface OverseerParticlesProps {
  intent: OverseerIntent;
  affect: OverseerAffectState;
  accentColor?: string;
  effectLevel?: VisualEffectLevel;
  width?: number;
  height?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export const OverseerParticles: React.FC<OverseerParticlesProps> = ({
  intent,
  affect,
  accentColor = "#00e5ff",
  effectLevel = 3,
  width = 600,
  height = 500,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const effectController = useRef(new OverseerEffectController({ effectLevel })).current;

  useEffect(() => {
    effectController.setEffectLevel(effectLevel);
  }, [effectLevel, effectController]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const config = effectController.getParticleConfig(intent, affect, accentColor);

    // Initialize particles if count changed
    if (particlesRef.current.length === 0 && config.count > 0) {
      for (let i = 0; i < config.count; i++) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * config.speed,
          vy: (Math.random() - 0.5) * config.speed,
          size: config.size * (0.6 + Math.random() * 0.8),
          alpha: config.opacity * (0.3 + Math.random() * 0.7),
          life: Math.random() * 100,
          maxLife: 80 + Math.random() * 120,
        });
      }
    }

    const centerX = width / 2;
    const centerY = height / 2;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (config.count === 0) {
        return;
      }

      // Adjust particle array size to target count
      while (particlesRef.current.length < config.count) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * config.speed,
          vy: (Math.random() - 0.5) * config.speed,
          size: config.size * (0.6 + Math.random() * 0.8),
          alpha: config.opacity * (0.3 + Math.random() * 0.7),
          life: 0,
          maxLife: 80 + Math.random() * 120,
        });
      }
      if (particlesRef.current.length > config.count) {
        particlesRef.current.splice(config.count);
      }

      ctx.fillStyle = config.color;

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.life += 1;

        if (p.life > p.maxLife) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
          p.life = 0;
        }

        // Convergence or Radiation force toward/away from center
        if (config.convergenceForce !== 0) {
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (config.convergenceForce * config.speed * 0.8) / dist;
          p.vx += dx * force * 0.05;
          p.vy += dy * force * 0.05;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const lifeAlpha = Math.sin((p.life / p.maxLife) * Math.PI);
        ctx.globalAlpha = p.alpha * lifeAlpha;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [intent, affect, accentColor, effectLevel, width, height, effectController]);

  if (effectLevel < 3) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
};
