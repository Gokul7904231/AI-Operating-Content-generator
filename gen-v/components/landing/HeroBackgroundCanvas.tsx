"use client";

import React, { useEffect, useRef, useState } from "react";

export default function HeroBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    // Production signal nodes
    const nodeCount = 18;
    const nodes: Array<{ x: number; y: number; radius: number; pulse: number; speed: number }> = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: (i + 0.5) * (width / nodeCount) + (Math.random() - 0.5) * 40,
        y: height * 0.2 + Math.random() * (height * 0.6),
        radius: Math.random() * 1.5 + 1,
        pulse: Math.random() * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.02,
      });
    }

    // Signals travelling through paths
    const signals: Array<{
      fromIndex: number;
      toIndex: number;
      progress: number;
      speed: number;
    }> = [
      { fromIndex: 0, toIndex: 2, progress: 0, speed: 0.003 },
      { fromIndex: 2, toIndex: 5, progress: 0.3, speed: 0.004 },
      { fromIndex: 5, toIndex: 8, progress: 0.6, speed: 0.002 },
      { fromIndex: 8, toIndex: 12, progress: 0.1, speed: 0.0035 },
      { fromIndex: 12, toIndex: 16, progress: 0.8, speed: 0.0045 },
    ];

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      time += 0.01;

      // Draw thin production grid lines (10% opacity)
      ctx.strokeStyle = "rgba(63, 63, 70, 0.12)";
      ctx.lineWidth = 1;

      // Horizontal lines
      for (let y = 100; y < height; y += 120) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw connections between nodes
      ctx.strokeStyle = "rgba(245, 158, 11, 0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      for (let i = 0; i < nodes.length - 1; i++) {
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Update and draw signal pulses travelling along paths
      signals.forEach((sig) => {
        sig.progress += sig.speed;
        if (sig.progress > 1) {
          sig.progress = 0;
          sig.fromIndex = Math.floor(Math.random() * (nodes.length - 2));
          sig.toIndex = sig.fromIndex + 1 + Math.floor(Math.random() * 3);
          if (sig.toIndex >= nodes.length) sig.toIndex = nodes.length - 1;
        }

        const from = nodes[sig.fromIndex];
        const to = nodes[sig.toIndex];
        if (from && to) {
          const sx = from.x + (to.x - from.x) * sig.progress;
          const sy = from.y + (to.y - from.y) * sig.progress;

          // Signal pulse glow
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8);
          grad.addColorStop(0, "rgba(245, 158, 11, 0.4)");
          grad.addColorStop(1, "rgba(245, 158, 11, 0)");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sx, sy, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw subtle nodes
      nodes.forEach((node) => {
        node.pulse += node.speed;
        const currentRadius = node.radius + Math.sin(node.pulse) * 0.5;

        ctx.fillStyle = "rgba(161, 161, 170, 0.3)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(1, currentRadius), 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="static-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#3f3f46" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#static-grid)" />
        </svg>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-80">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
