"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Boxes, Search, Zap, DollarSign, Activity } from "lucide-react";

interface ModelMeta {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  costInput: number; // USD per 1M tokens
  costOutput: number; // USD per 1M tokens
  speed: number; // tokens/sec
  availability: boolean;
  health: number; // success rate (0.0 to 1.0)
  isLocal: boolean;
}

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState("all");

  const { data, isLoading } = useQuery<{ success: boolean; providers: any[] }>({
    queryKey: ["ai-providers-models-dynamic"],
    queryFn: async () => {
      const r = await fetch("/api/providers");
      if (!r.ok) return { success: false, providers: [] };
      return r.json();
    }
  });

  const providers = data?.providers ?? [];
  // Gather all models from active dynamic providers
  const models: ModelMeta[] = providers.flatMap((p) => {
    const providerModels = p.models ?? [];
    return providerModels.map((m: any) => ({
      id: m.id || `${p.id}/model`,
      name: m.name || m.id || "Unknown Model",
      provider: p.id,
      contextWindow: m.contextWindow ?? 32768,
      costInput: m.costInput ?? 0.15,
      costOutput: m.costOutput ?? 0.60,
      speed: m.speed ?? 80,
      availability: m.availability ?? true,
      health: m.health ?? 1.0,
      isLocal: p.id.includes("local") || p.id.includes("ollama"),
    }));
  });

  const providerNames = ["all", ...new Set(providers.map(p => p.id))];

  const filtered = models.filter(m => {
    const matchesSearch = m.id.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase());
    const matchesProvider = filterProvider === "all" || m.provider === filterProvider;
    return matchesSearch && matchesProvider;
  });

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-zinc-50">AI Models Directory</h1>
        <p className="text-xs text-zinc-500 mt-1">Discovered models automatically query active providers via standard listModels endpoints.</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-650" />
          <input
            type="text"
            placeholder="Search models by name or identifier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
        <select
          value={filterProvider}
          onChange={(e) => setFilterProvider(e.target.value)}
          className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-semibold"
        >
          {providerNames.map(p => (
            <option key={p} value={p}>{p === "all" ? "All Providers" : p.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center border border-dashed border-zinc-800 rounded-xl">
          <Boxes className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-xs">No models discovered yet. Verify provider settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(model => (
            <div key={model.id} className="rounded-xl border border-zinc-850 bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-zinc-150 truncate">{model.name}</h3>
                  <p className="text-[9px] font-mono text-zinc-500 truncate mt-0.5">{model.id}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-850 text-[9px] font-mono text-zinc-400 capitalize shrink-0 font-semibold">
                  {model.provider}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-850/60 text-[10px] font-mono">
                <div className="flex flex-col">
                  <span className="text-zinc-650 text-[8px] uppercase">Context Window</span>
                  <span className="text-zinc-300 mt-0.5">{(model.contextWindow / 1000).toFixed(0)}k tokens</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-zinc-650 text-[8px] uppercase">Speed Index</span>
                  <span className="text-zinc-300 mt-0.5 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> {model.speed} t/s
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-zinc-650 text-[8px] uppercase">Input/Output 1M</span>
                  <span className="text-zinc-300 mt-0.5 flex items-center gap-0.5">
                    <DollarSign className="w-3 h-3 text-emerald-500" />${model.costInput}/${model.costOutput}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-zinc-650 text-[8px] uppercase">Avg Reliability</span>
                  <span className="text-zinc-300 mt-0.5 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" /> {(model.health * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 text-[8px] text-zinc-500 font-mono">
                {model.isLocal ? (
                  <span className="px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-900/40 font-semibold">Local Offline</span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-zinc-950/40 text-zinc-400 border border-zinc-900/40">Cloud API</span>
                )}
                {model.availability ? (
                  <span className="text-emerald-500 font-semibold">Active</span>
                ) : (
                  <span className="text-red-500 font-semibold">Offline</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
