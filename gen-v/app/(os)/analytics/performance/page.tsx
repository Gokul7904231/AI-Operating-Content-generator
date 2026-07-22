"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Gauge, Cpu, Hourglass, Zap, RefreshCw } from "lucide-react";

const PerformanceChart = dynamic(() => import("@/components/charts/PerformanceChart"), { ssr: false });

interface PerformanceStats {
  averageRenderMs: number;
  cpuBoundMs: number;
  gpuAcceleratedMs: number;
  cacheSavingsMinutes: number;
  chartData: { date: string; avgDuration: number; cacheHits: number }[];
}

export default function PerformancePage() {
  const { data, isLoading, refetch } = useQuery<PerformanceStats>({
    queryKey: ["analytics-performance"],
    queryFn: async () => {
      return {
        averageRenderMs: 42000,
        cpuBoundMs: 125000,
        gpuAcceleratedMs: 38000,
        cacheSavingsMinutes: 340,
        chartData: [
          { date: "07/06", avgDuration: 85, cacheHits: 12 },
          { date: "07/07", avgDuration: 78, cacheHits: 15 },
          { date: "07/08", avgDuration: 72, cacheHits: 18 },
          { date: "07/09", avgDuration: 55, cacheHits: 24 },
          { date: "07/10", avgDuration: 42, cacheHits: 35 },
          { date: "07/11", avgDuration: 39, cacheHits: 42 },
          { date: "07/12", avgDuration: 38, cacheHits: 48 },
        ]
      };
    }
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Render Performance</h1>
          <p className="text-sm text-zinc-500 mt-1">Track rendering pipeline speeds, hardware encoder utilization, and cache metrics</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Hourglass className="w-3.5 h-3.5 text-zinc-500" /> Avg Render Time
              </div>
              <div className="text-xl font-bold text-zinc-200">
                {((data?.averageRenderMs ?? 0) / 1000).toFixed(1)}s
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" /> CPU-Only Render
              </div>
              <div className="text-xl font-bold text-blue-400">
                {((data?.cpuBoundMs ?? 0) / 1000).toFixed(1)}s
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" /> GPU Accelerated
              </div>
              <div className="text-xl font-bold text-emerald-400">
                {((data?.gpuAcceleratedMs ?? 0) / 1000).toFixed(1)}s
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Render Cache Saved
              </div>
              <div className="text-xl font-bold text-amber-400 font-mono">
                {data?.cacheSavingsMinutes} mins
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" /> Historical Render Speeds (Seconds)
            </h3>
            <PerformanceChart data={data?.chartData ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
