"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Map, Users, RefreshCw } from "lucide-react";

const HeatmapsChart = dynamic(() => import("@/components/charts/HeatmapsChart"), { ssr: false });

interface HeatmapData {
  sceneId: string;
  narrativeSnippet: string;
  retentionPct: number;
  averageWatchSeconds: number;
}

export default function HeatmapsPage() {
  const { data, isLoading, refetch } = useQuery<{ heatmaps: HeatmapData[] }>({
    queryKey: ["analytics-heatmaps"],
    queryFn: async () => {
      return {
        heatmaps: [
          { sceneId: "Scene 1 (Hook)", narrativeSnippet: "Would you believe that...", retentionPct: 98.4, averageWatchSeconds: 4.8 },
          { sceneId: "Scene 2", narrativeSnippet: "Deep in the ocean...", retentionPct: 84.1, averageWatchSeconds: 4.2 },
          { sceneId: "Scene 3", narrativeSnippet: "This is where SREs...", retentionPct: 79.8, averageWatchSeconds: 3.9 },
          { sceneId: "Scene 4", narrativeSnippet: "But then everything...", retentionPct: 76.5, averageWatchSeconds: 3.8 },
          { sceneId: "Scene 5 (CTA)", narrativeSnippet: "Subscribe to see...", retentionPct: 62.0, averageWatchSeconds: 3.1 },
        ]
      };
    }
  });

  const heatmap = data?.heatmaps ?? [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Retention Heatmaps</h1>
          <p className="text-sm text-zinc-500 mt-1">Inspect scene-level audience drop-off to optimize your hooks and story pacing</p>
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
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Retention Percentage by Video Scene
            </h2>
            <HeatmapsChart data={heatmap} />
          </div>

          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/40">
            <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
              <h2 className="text-sm font-semibold text-zinc-300">Scene Drop-off Metrics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-600">
                    <th className="text-left px-5 py-3">Scene</th>
                    <th className="text-left px-5 py-3">Script Snippet</th>
                    <th className="text-left px-5 py-3">Avg Watch Time</th>
                    <th className="text-left px-5 py-3">Retention Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map(item => (
                    <tr key={item.sceneId} className="border-b border-zinc-800/50 hover:bg-zinc-900/40">
                      <td className="px-5 py-3 font-semibold text-zinc-300">{item.sceneId}</td>
                      <td className="px-5 py-3 italic text-zinc-550 truncate max-w-[200px]" title={item.narrativeSnippet}>{item.narrativeSnippet}</td>
                      <td className="px-5 py-3 font-mono">{item.averageWatchSeconds}s</td>
                      <td className="px-5 py-3 font-mono">
                        <span className={`px-2 py-0.5 rounded ${item.retentionPct > 80 ? "bg-emerald-500/20 text-emerald-400" : item.retentionPct > 70 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                          {item.retentionPct}%
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
