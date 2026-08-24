"use client";

import React, { useEffect, useRef } from "react";

export default function HeroBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animId = 0;

    const nodeCount = 18;
    interface Node {
      x: number;
      y: number;
      radius: number;
      pulse: number;
      speed: number;
    }
    let nodes: Node[] = [];

    const signals = [
      { fromIndex: 0, toIndex: 2, progress: 0, speed: 0.003 },
      { fromIndex: 2, toIndex: 5, progress: 0.3, speed: 0.004 },
      { fromIndex: 5, toIndex: 8, progress: 0.6, speed: 0.002 },
      { fromIndex: 8, toIndex: 12, progress: 0.1, speed: 0.0035 },
      { fromIndex: 12, toIndex: 16, progress: 0.8, speed: 0.0045 },
    ];

    const glowSprite = document.createElement("canvas");
    glowSprite.width = 16;
    glowSprite.height = 16;
    const sg = glowSprite.getContext("2d");
    if (sg) {
      const sgGrad = sg.createRadialGradient(8, 8, 0, 8, 8, 8);
      sgGrad.addColorStop(0, "rgba(0, 113, 227, 0.5)");
      sgGrad.addColorStop(1, "rgba(0, 113, 227, 0)");
      sg.fillStyle = sgGrad;
      sg.fillRect(0, 0, 16, 16);
    }

    const resize = () => {
      const parent = canvas.parentElement;
      width = canvas.width = parent ? parent.clientWidth : window.innerWidth;
      height = canvas.height = parent ? parent.clientHeight : window.innerHeight;
      initNodes();
    };

    const initNodes = () => {
      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: (i + 0.5) * (width / nodeCount) + (Math.random() - 0.5) * 40,
          y: height * 0.2 + Math.random() * (height * 0.6),
          radius: Math.random() * 1.5 + 1,
          pulse: Math.random() * Math.PI * 2,
          speed: 0.015 + Math.random() * 0.02,
        });
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Horizontal production grid lines
      ctx.strokeStyle = "rgba(63, 63, 70, 0.08)";
      ctx.lineWidth = 1;
      for (let y = 80; y < height; y += 120) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Dashed node connections
      ctx.strokeStyle = "rgba(0, 113, 227, 0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < nodes.length - 1; i++) {
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Travelling signal pulses
      for (let s = 0; s < signals.length; s++) {
        const sig = signals[s];
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
          ctx.drawImage(glowSprite, sx - 8, sy - 8, 16, 16);
          ctx.fillStyle = "rgba(0, 113, 227, 0.9)";
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Nodes
      for (let n = 0; n < nodes.length; n++) {
        const node = nodes[n];
        node.pulse += node.speed;
        const r = node.radius + Math.sin(node.pulse) * 0.5;
        ctx.fillStyle = "rgba(161, 161, 170, 0.4)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(1, r), 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-80" aria-hidden="true">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
