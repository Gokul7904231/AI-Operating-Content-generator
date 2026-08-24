"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { UserCheck, Eye, TrendingUp, RefreshCw } from "lucide-react";

const RetentionChart = dynamic(() => import("@/components/charts/RetentionChart"), { ssr: false });

interface RetentionStats {
  averageDuration: number;
  averageRetentionPct: number;
  totalSubscribers: number;
  retentionChart: { label: string; pct: number }[];
}

export default function RetentionPage() {
  const { data, isLoading, refetch } = useQuery<RetentionStats>({
    queryKey: ["analytics-retention"],
    queryFn: async () => {
      return {
        averageDuration: 48,
        averageRetentionPct: 78.5,
        totalSubscribers: 1250,
        retentionChart: [
          { label: "0s", pct: 100 },
          { label: "5s", pct: 92 },
          { label: "10s", pct: 86 },
          { label: "15s", pct: 81 },
          { label: "20s", pct: 79 },
          { label: "30s", pct: 74 },
          { label: "45s", pct: 68 },
          { label: "60s", pct: 62 },
        ]
      };
    }
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Audience Retention</h1>
          <p className="text-sm text-zinc-500 mt-1">Monitor long-term audience attention spans, retention rates, and subscribers</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex items-center gap-3">
              <Eye className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest">Avg Watch Duration</div>
                <div className="text-lg font-bold text-zinc-200 mt-0.5">{data?.averageDuration} Seconds</div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest">Avg Retention Rate</div>
                <div className="text-lg font-bold text-zinc-200 mt-0.5">{data?.averageRetentionPct}%</div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest">Subscriber Conversions</div>
                <div className="text-lg font-bold text-zinc-200 mt-0.5">+{data?.totalSubscribers} users</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Audience Retention Curve (Average)
            </h3>
            <RetentionChart data={data?.retentionChart ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
