"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, BarChart2, CheckCircle2, RefreshCw } from "lucide-react";

const HooksChart = dynamic(() => import("@/components/charts/HooksChart"), { ssr: false });

interface HookPerformance {
  hookText: string;
  engine: string;
  ctrPct: number;
  retentionFirst3sPct: number;
  averageCost: number;
}

export default function HooksPage() {
  const { data, isLoading, refetch } = useQuery<{ hooks: HookPerformance[] }>({
    queryKey: ["analytics-hooks"],
    queryFn: async () => {
      return {
        hooks: [
          { hookText: "This single Javascript method will blow your mind...", engine: "coding", ctrPct: 14.8, retentionFirst3sPct: 92.1, averageCost: 0.002 },
          { hookText: "Why do SREs wake up at 3 AM? Here's the truth...", engine: "motivation", ctrPct: 12.2, retentionFirst3sPct: 88.5, averageCost: 0.003 },
          { hookText: "Test your general knowledge with these 3 questions...", engine: "gk", ctrPct: 9.5, retentionFirst3sPct: 81.4, averageCost: 0.001 },
          { hookText: "Did you know that in 1983, a single computer glitch...", engine: "history", ctrPct: 11.1, retentionFirst3sPct: 85.0, averageCost: 0.002 },
        ]
      };
    }
  });

  const hooks = data?.hooks ?? [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Hook Performance</h1>
          <p className="text-sm text-zinc-500 mt-1">Track CTR and 3-second retention metrics for generated hooks</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" /> Hook CTR Comparison (%)
            </h2>
            <HooksChart data={hooks} />
          </div>

          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/40">
            <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-sm font-semibold text-zinc-300">Hook Effectiveness Directory</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-600">
                    <th className="text-left px-5 py-3">Hook Text</th>
                    <th className="text-left px-5 py-3">Engine</th>
                    <th className="text-left px-5 py-3">CTR (Estimated)</th>
                    <th className="text-left px-5 py-3">3s Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {hooks.map(item => (
                    <tr key={item.hookText} className="border-b border-zinc-800/50 hover:bg-zinc-900/40">
                      <td className="px-5 py-3 font-medium text-zinc-200 max-w-[300px] truncate" title={item.hookText}>{item.hookText}</td>
                      <td className="px-5 py-3 capitalize text-zinc-550">{item.engine}</td>
                      <td className="px-5 py-3 font-mono text-pink-400 font-bold">{item.ctrPct}%</td>
                      <td className="px-5 py-3 font-mono">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">
                          {item.retentionFirst3sPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
