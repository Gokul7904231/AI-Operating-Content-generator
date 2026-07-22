"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, TrendingUp, Zap, DollarSign, RefreshCw } from "lucide-react";

const BenchmarksChart = dynamic(() => import("@/components/charts/BenchmarksChart"), { ssr: false });

interface BenchmarkRecord {
  id: string;
  task: string;
  provider: string;
  model: string;
  capability: string;
  executionTime: number;
  costUSD: number;
  jsonSuccess: boolean;
  retryCount: number;
  temperature: number;
  createdAt: string;
}

interface ProviderSummary {
  provider: string;
  avgLatency: number;
  totalRuns: number;
  successRate: number;
  avgCost: number;
  p95Latency: number;
}

function ProviderRankCard({ summary, rank }: { summary: ProviderSummary; rank: number }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{medals[rank] ?? `#${rank + 1}`}</span>
          <span className="text-sm font-semibold text-zinc-200 capitalize">{summary.provider}</span>
        </div>
        <span className={`text-xs font-mono px-2 py-0.5 rounded ${summary.successRate > 0.95 ? "bg-emerald-500/20 text-emerald-400" : summary.successRate > 0.80 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
          {(summary.successRate * 100).toFixed(1)}%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-zinc-600">Avg Latency</div>
          <div className="font-mono text-zinc-300">{summary.avgLatency.toFixed(0)}ms</div>
        </div>
        <div>
          <div className="text-zinc-600">P95 Latency</div>
          <div className="font-mono text-zinc-300">{summary.p95Latency.toFixed(0)}ms</div>
        </div>
        <div>
          <div className="text-zinc-600">Avg Cost</div>
          <div className="font-mono text-zinc-300">${summary.avgCost.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-zinc-600">Total Runs</div>
          <div className="font-mono text-zinc-300">{summary.totalRuns}</div>
        </div>
      </div>
    </div>
  );
}

export default function BenchmarksPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["benchmarks"],
    queryFn: async () => {
      const r = await fetch("/api/analytics/benchmarks");
      if (!r.ok) return { records: [], summaries: [] };
      return r.json();
    },
    refetchInterval: 60000,
  });

  const summaries: ProviderSummary[] = data?.summaries ?? [];
  const records: BenchmarkRecord[] = (data?.records ?? []).slice(0, 20);

  const chartData = summaries.map((s) => ({
    provider: s.provider,
    latency: Math.round(s.avgLatency),
    p95: Math.round(s.p95Latency),
  }));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Benchmarks</h1>
          <p className="text-sm text-zinc-500 mt-1">Provider latency, cost, quality, and success rate comparisons</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Provider Rankings */}
      {summaries.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 mb-3">Provider Rankings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {summaries.slice(0, 6).map((s, i) => (
              <ProviderRankCard key={s.provider} summary={s} rank={i} />
            ))}
          </div>
        </div>
      )}

      {/* Latency Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Latency Comparison (ms)</h2>
          <BenchmarksChart data={chartData} />
        </div>
      )}

      {/* Records Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-300">Recent Benchmark Records</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-6">
            <BarChart2 className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-zinc-500 text-sm">No benchmark data yet</p>
            <p className="text-zinc-700 text-xs mt-1">Run some generation jobs to populate this table</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-zinc-400">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-600">
                  {["Provider", "Model", "Capability", "Latency", "Cost", "Success", "Retries"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/40">
                    <td className="px-5 py-3 capitalize text-zinc-300">{r.provider}</td>
                    <td className="px-5 py-3 font-mono text-zinc-500 max-w-[140px] truncate">{r.model}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase text-[10px]">{r.capability}</span>
                    </td>
                    <td className="px-5 py-3 font-mono">{r.executionTime}ms</td>
                    <td className="px-5 py-3 font-mono">${r.costUSD.toFixed(4)}</td>
                    <td className="px-5 py-3">
                      {r.jsonSuccess
                        ? <span className="text-emerald-400">✓</span>
                        : <span className="text-red-400">✗</span>}
                    </td>
                    <td className="px-5 py-3 font-mono">{r.retryCount}</td>
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
