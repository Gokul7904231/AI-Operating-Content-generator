"use client";

import React, { useState, useEffect } from "react";
import { Cpu, DollarSign, Clock, ShieldAlert, CheckCircle2 } from "lucide-react";

interface CapabilityRow {
  capability: string;
  provider: string;
  model: string;
  latencyMs: number;
  costUSD: number;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  fallback: string;
}

export default function CapabilitiesInspectorPage() {
  const [capabilities, setCapabilities] = useState<CapabilityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // High-fidelity stub resolution mapping
    setTimeout(() => {
      setCapabilities([
        {
          capability: "SCRIPT (Creativity)",
          provider: "Groq",
          model: "llama-3.3-70b-versatile",
          latencyMs: 140,
          costUSD: 0.0007,
          status: "ONLINE",
          fallback: "Google Gemini 2.5 Flash",
        },
        {
          capability: "CRITIC (JSON parsing)",
          provider: "Google AI",
          model: "gemini-2.5-flash",
          latencyMs: 380,
          costUSD: 0.0012,
          status: "ONLINE",
          fallback: "Groq Llama 3.1 8B",
        },
        {
          capability: "SCENE (Stitch layout breakdown)",
          provider: "Google AI",
          model: "gemini-2.5-pro",
          latencyMs: 820,
          costUSD: 0.0045,
          status: "ONLINE",
          fallback: "Gemini 2.5 Flash fallback",
        },
        {
          capability: "SPEECH (TTS Synthesis)",
          provider: "ElevenLabs",
          model: "eleven_multilingual_v2",
          latencyMs: 950,
          costUSD: 0.015,
          status: "ONLINE",
          fallback: "OpenAI Audio TTS",
        },
        {
          capability: "IMAGE (Visual Frame generation)",
          provider: "NVIDIA NIM",
          model: "stabilityai/sdxl-turbo",
          latencyMs: 1200,
          costUSD: 0.005,
          status: "ONLINE",
          fallback: "Local SDXL stub",
        }
      ]);
      setLoading(false);
    }, 400);
  }, []);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-zinc-950 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-50 font-display tracking-tight flex items-center gap-3">
            <Cpu className="text-blue-400 w-8 h-8 animate-pulse" />
            Capabilities Routing Matrix
          </h1>
          <p className="text-zinc-400 mt-2">
            Inspect capability endpoints, latencies, model weights, and automatic failover mappings.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-zinc-400">
            Resolving active capability pipelines...
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-sm font-semibold">
                  <th className="p-4">CAPABILITY / WORKSPACE</th>
                  <th className="p-4">ROUTED PROVIDER</th>
                  <th className="p-4">MODEL KEY</th>
                  <th className="p-4">LATENCY</th>
                  <th className="p-4">EST. COST</th>
                  <th className="p-4">HEALTH</th>
                  <th className="p-4">FAILOVER PATH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {capabilities.map((c) => (
                  <tr key={c.capability} className="hover:bg-zinc-950/40 transition-colors">
                    <td className="p-4 font-medium text-zinc-200">{c.capability}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800/40">
                        {c.provider}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-zinc-400 text-xs">{c.model}</td>
                    <td className="p-4 text-zinc-300 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        {c.latencyMs}ms
                      </span>
                    </td>
                    <td className="p-4 text-zinc-300 font-mono">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                        ${c.costUSD.toFixed(4)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-xs italic">{c.fallback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
