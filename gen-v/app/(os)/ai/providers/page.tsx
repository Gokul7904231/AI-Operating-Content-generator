"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NewProviderForm from "@/components/NewProviderForm";
import { 
  Network, Cpu, Activity, Zap, ShieldCheck, DollarSign, Database,
  Plus, X, RefreshCw, Layers
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  modelEndpoint: string;
  enabled: boolean;
  metrics: {
    state: string;
    latency: number;
    avgResponseTime: number;
    errorRate: number;
    totalCost: {
      tokensInput: number;
      tokensOutput: number;
      estimatedUSD: number;
      currency: string;
    };
    retries: number;
    retryRate: number;
    quotaRemaining: number;
    rateLimitLimit: number;
    rateLimitRemaining: number;
    rateLimitReset: number;
  };
}

export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const [showNewProviderModal, setShowNewProviderModal] = useState(false);
  // Query handlers and mutations

  const { data, isLoading, refetch, error, isError } = useQuery<{ success: boolean; providers: Provider[] }>({
    queryKey: ["ai-providers-dynamic"],
    queryFn: async () => {
      const res = await fetch("/api/providers");
      if (!res.ok) throw new Error("Failed to fetch providers");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const providers = data?.providers ?? [];


  const getProviderIcon = (id: string) => {
    if (id.includes("google") || id.includes("gemini")) return ShieldCheck;
    if (id.includes("groq")) return Zap;
    if (id.includes("local") || id.includes("ollama")) return Database;
    return Network;
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-50 tracking-tight">AI Providers Board</h2>
          <p className="text-xs text-zinc-500 mt-1">Configure dynamically registered AI provider plugins, manage credentials, and inspect reliability metrics.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => refetch()} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        <button
          onClick={() => setShowNewProviderModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Register Provider
        </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="p-5 border border-rose-900/40 bg-rose-950/10 rounded-xl text-center text-rose-450">
          <div className="text-xs font-bold font-mono">Error Loading Providers</div>
          <div className="text-[11px] text-rose-500 mt-1">{(error as any)?.message || "Internal server error occurred."}</div>
        </div>
      ) : providers.length === 0 ? (
        <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-550 font-mono">
          No AI providers found. Please register a provider credentials block above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => {
            const Icon = getProviderIcon(p.id);
            const m = p.metrics;
            const healthState = m.state || "ONLINE";

            return (
              <div 
                key={p.id} 
                className="bg-zinc-900 border rounded-xl overflow-hidden flex flex-col justify-between border-zinc-800/80 hover:border-zinc-700 transition-all shadow-lg"
              >
                <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-950/40">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-zinc-200">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${healthState === "ONLINE" ? "bg-emerald-500 animate-pulse" : healthState === "RATE LIMITED" ? "bg-amber-500 animate-pulse" : "bg-red-500"}`} />
                    <span className={`text-[8px] font-bold uppercase tracking-wider font-mono ${healthState === "ONLINE" ? "text-emerald-400" : "text-amber-400"}`}>
                      {healthState}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-4 flex-1">
                  {/* Stats Panel */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-zinc-950/30 rounded-lg p-2 border border-zinc-800/50">
                    <div>
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono">Latency</span>
                      <span className="text-[11px] text-zinc-300 font-bold font-mono">{m.latency ? `${m.latency.toFixed(0)}ms` : "—"}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono">Error Rate</span>
                      <span className={`text-[11px] font-bold font-mono ${m.errorRate > 0.1 ? "text-red-400" : "text-emerald-400"}`}>
                        {(m.errorRate * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-zinc-500 block uppercase font-mono">Retries</span>
                      <span className="text-[11px] text-zinc-300 font-bold font-mono">{m.retries}</span>
                    </div>
                  </div>

                  {/* Settings / Config Summary */}
                  <div className="text-[10px] space-y-1 font-mono text-zinc-400 bg-zinc-950/20 p-2 rounded border border-zinc-850/50">
                    <div className="truncate"><span className="text-zinc-600">Base URL:</span> {p.baseUrl}</div>
                    <div className="truncate"><span className="text-zinc-600">Endpoint:</span> {p.modelEndpoint}</div>
                  </div>

                  {/* Discovered Models */}
                  {((p as any).models ?? []).length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-zinc-550 block text-[9px] uppercase tracking-widest font-mono">Discovered Models</span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {((p as any).models).map((model: any) => (
                          <span key={model.id} className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-850 text-[9px] font-mono text-zinc-350">
                            {model.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accrued Cost */}
                  <div className="flex justify-between items-center text-[10px] font-mono border-t border-zinc-850/50 pt-2.5">
                    <span className="text-zinc-550 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-zinc-650" /> Accrued Spend:</span>
                    <span className="text-zinc-300 font-bold">${m.totalCost.estimatedUSD.toFixed(4)}</span>
                  </div>
                </div>

                <div className="px-4 py-2 bg-zinc-950/60 border-t border-zinc-850 flex justify-between items-center text-[9px] font-mono text-zinc-500 select-none">
                  <span>Scope: Dynamic API</span>
                  <span className="text-zinc-400 font-bold">{p.enabled ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showNewProviderModal && (
        <NewProviderForm isModal={true} onDismiss={() => setShowNewProviderModal(false)} />
      )}
    </div>
  );
}
