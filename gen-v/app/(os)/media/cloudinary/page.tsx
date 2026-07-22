"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { HardDrive, Cloud, Layers, RefreshCw, BarChart2 } from "lucide-react";

const CloudinaryChart = dynamic(() => import("@/components/charts/CloudinaryChart"), { ssr: false });

interface CloudinaryUsage {
  plan: string;
  storage: { used: number; limit: number; pct: number };
  bandwidth: { used: number; limit: number; pct: number };
  transformations: { used: number; limit: number; pct: number };
  charts: { date: string; bandwidthMb: number; transforms: number }[];
}

export default function CloudinaryPage() {
  const { data, isLoading, refetch } = useQuery<CloudinaryUsage>({
    queryKey: ["cloudinary-usage"],
    queryFn: async () => {
      // Mock metrics for Cloudinary page integration
      return {
        plan: "Advanced 1",
        storage: { used: 12.4, limit: 50.0, pct: 24.8 },
        bandwidth: { used: 34.2, limit: 100.0, pct: 34.2 },
        transformations: { used: 8900, limit: 25000, pct: 35.6 },
        charts: [
          { date: "07/06", bandwidthMb: 1200, transforms: 450 },
          { date: "07/07", bandwidthMb: 1800, transforms: 510 },
          { date: "07/08", bandwidthMb: 1400, transforms: 480 },
          { date: "07/09", bandwidthMb: 2300, transforms: 720 },
          { date: "07/10", bandwidthMb: 3100, transforms: 890 },
          { date: "07/11", bandwidthMb: 2800, transforms: 790 },
          { date: "07/12", bandwidthMb: 3400, transforms: 950 },
        ]
      };
    }
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Cloudinary Integration</h1>
          <p className="text-sm text-zinc-500 mt-1">Monitor asset delivery bandwidth, dynamic image transformations, and CDN usage</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Storage</span>
                <HardDrive className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="text-xl font-bold text-zinc-200">
                {data?.storage.used} GB / {data?.storage.limit} GB
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${data?.storage.pct}%` }} />
              </div>
              <div className="text-[10px] text-zinc-550 text-right">{data?.storage.pct}% utilization</div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Bandwidth</span>
                <Cloud className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="text-xl font-bold text-zinc-200">
                {data?.bandwidth.used} GB / {data?.bandwidth.limit} GB
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${data?.bandwidth.pct}%` }} />
              </div>
              <div className="text-[10px] text-zinc-550 text-right">{data?.bandwidth.pct}% utilization</div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Transformations</span>
                <Layers className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="text-xl font-bold text-zinc-200">
                {data?.transformations.used.toLocaleString()} / {data?.transformations.limit.toLocaleString()}
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${data?.transformations.pct}%` }} />
              </div>
              <div className="text-[10px] text-zinc-550 text-right">{data?.transformations.pct}% utilization</div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-400" /> Daily Bandwidth Usage Trend (MB)
            </h3>
            <CloudinaryChart data={data?.charts ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
