"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface StepMetric {
  step: string;
  startedAt: string;
  finishedAt: string;
  duration: number;
  provider: string;
  model: string;
  cost: number;
  tokens: number;
  cacheHit: boolean;
  worker: string;
  gpu: string;
  cpu: string;
  memory: string;
  attempt: number;
  success: boolean;
  error?: string;
}

interface JobRun {
  jobId: string;
  topic: string;
  status: string;
  renderDurationSeconds: number;
  telemetry: Record<string, StepMetric>;
  createdAt: string;
}

const STEP_COLORS: Record<string, string> = {
  script:  "#4edea3",
  critic:  "#c0c1ff",
  scene:   "#fbbf24",
  voice:   "#60a5fa",
  image:   "#f472b6",
  render:  "#f87171",
  upload:  "#a78bfa",
  publish: "#34d399",
};

const STEP_ORDER = ["script", "critic", "scene", "voice", "image", "render", "upload", "publish"];

function WaterfallBar({ metric, offsetMs, totalMs }: { metric: StepMetric; offsetMs: number; totalMs: number }) {
  const left = totalMs > 0 ? (offsetMs / totalMs) * 100 : 0;
  const width = totalMs > 0 ? (metric.duration / totalMs) * 100 : 0;
  const color = STEP_COLORS[metric.step] ?? "#6b7280";

  return (
    <div className="flex items-center gap-3 text-[11px] font-mono group">
      <div className="w-16 text-right text-zinc-400 shrink-0">{metric.step}</div>
      <div className="flex-1 relative h-6 bg-zinc-900 rounded overflow-hidden">
        <div
          className="absolute h-full rounded flex items-center px-2 text-zinc-950 font-bold text-[10px] overflow-hidden whitespace-nowrap"
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 0.8)}%`,
            backgroundColor: color,
            opacity: metric.success ? 1 : 0.5,
          }}
        >
          {metric.duration > 500 ? `${(metric.duration / 1000).toFixed(1)}s` : `${metric.duration}ms`}
        </div>
      </div>
      <div className="w-24 flex items-center gap-1.5 shrink-0">
        {metric.cacheHit && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-900/60 text-emerald-400 border border-emerald-800/50">CACHE</span>
        )}
        {!metric.success && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-900/60 text-rose-400 border border-rose-800/50">FAILED</span>
        )}
        {metric.attempt > 1 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-900/60 text-amber-400 border border-amber-800/50">×{metric.attempt}</span>
        )}
      </div>
      <div className="w-20 text-zinc-500 shrink-0">{metric.gpu !== "none" ? metric.gpu.split(" ")[0] : "CPU"}</div>
    </div>
  );
}

function JobProfilerCard({ job }: { job: JobRun }) {
  const [expanded, setExpanded] = useState(false);
  const metrics = job.telemetry ?? {};
  const steps = STEP_ORDER.filter((s) => metrics[s]);
  const totalMs = Object.values(metrics).reduce((acc, m) => acc + m.duration, 0);

  // Compute offsets based on startedAt timestamps
  const jobStart = steps.length > 0
    ? new Date(metrics[steps[0]]?.startedAt ?? job.createdAt).getTime()
    : 0;

  const totalCost = Object.values(metrics).reduce((acc, m) => acc + (m.cost ?? 0), 0);
  const cacheHits = Object.values(metrics).filter((m) => m.cacheHit).length;

  return (
    <div className="glass-panel rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          job.status === "completed" ? "bg-emerald-500" :
          job.status === "failed" ? "bg-rose-500" :
          "bg-amber-400 animate-pulse"
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-100 truncate">{job.topic}</span>
            <span className="text-[10px] font-mono text-zinc-600">{job.jobId.slice(-12)}</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {new Date(job.createdAt).toLocaleString()} · {job.renderDurationSeconds ?? "—"}s total
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-[11px]">
          {cacheHits > 0 && (
            <span className="text-emerald-400">{cacheHits} cache hits</span>
          )}
          <span className="text-zinc-400">${totalCost.toFixed(4)}</span>
          <span className="text-zinc-400">{(totalMs / 1000).toFixed(1)}s</span>
          <Link
            href={`/dashboard/jobs/${job.jobId}`}
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-medium hover:bg-blue-500/20 transition-colors"
          >
            Live DAG →
          </Link>
          <span className="text-zinc-600 material-symbols-outlined text-base">{expanded ? "expand_less" : "expand_more"}</span>
        </div>
      </button>

      {/* Waterfall */}
      {expanded && (
        <div className="border-t border-zinc-800 p-4 space-y-2">
          {/* Timeline ruler */}
          <div className="flex items-center gap-3 text-[10px] text-zinc-600 mb-3">
            <div className="w-16 text-right">step</div>
            <div className="flex-1 flex justify-between px-0.5">
              <span>0ms</span>
              <span>{Math.round(totalMs / 2)}ms</span>
              <span>{totalMs}ms</span>
            </div>
            <div className="w-24" />
            <div className="w-20">gpu/cpu</div>
          </div>

          {/* Bars */}
          <div className="space-y-1.5">
            {steps.map((stepId) => {
              const m = metrics[stepId];
              const offsetMs = m.startedAt
                ? new Date(m.startedAt).getTime() - jobStart
                : 0;
              return (
                <WaterfallBar key={stepId} metric={m} offsetMs={Math.max(0, offsetMs)} totalMs={totalMs} />
              );
            })}
          </div>

          {/* Step details table */}
          <div className="mt-4 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left px-3 py-2 text-zinc-500 font-medium">Step</th>
                  <th className="text-right px-3 py-2 text-zinc-500 font-medium">Duration</th>
                  <th className="text-right px-3 py-2 text-zinc-500 font-medium">Provider</th>
                  <th className="text-right px-3 py-2 text-zinc-500 font-medium">Model</th>
                  <th className="text-right px-3 py-2 text-zinc-500 font-medium">Cost</th>
                  <th className="text-right px-3 py-2 text-zinc-500 font-medium">Attempts</th>
                  <th className="text-right px-3 py-2 text-zinc-500 font-medium">Cache</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((stepId) => {
                  const m = metrics[stepId];
                  return (
                    <tr key={stepId} className="border-b border-zinc-800/50 hover:bg-white/5">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STEP_COLORS[stepId] ?? "#6b7280" }} />
                          {stepId}
                          {!m.success && <span className="text-rose-400">✕</span>}
                        </span>
                      </td>
                      <td className="text-right px-3 py-2 text-zinc-300">
                        {m.duration > 1000 ? `${(m.duration / 1000).toFixed(2)}s` : `${m.duration}ms`}
                      </td>
                      <td className="text-right px-3 py-2 text-zinc-400">{m.provider || "—"}</td>
                      <td className="text-right px-3 py-2 text-zinc-400">{m.model || "—"}</td>
                      <td className="text-right px-3 py-2 text-zinc-400">${(m.cost ?? 0).toFixed(4)}</td>
                      <td className="text-right px-3 py-2 text-zinc-400">{m.attempt}</td>
                      <td className="text-right px-3 py-2">
                        {m.cacheHit
                          ? <span className="text-emerald-400">HIT</span>
                          : <span className="text-zinc-600">MISS</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Error if any */}
          {steps.some((s) => metrics[s]?.error) && (
            <div className="mt-3 p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 text-[11px] font-mono text-rose-400">
              {steps.filter((s) => metrics[s]?.error).map((s) => (
                <div key={s}><span className="text-rose-600">[{s}]</span> {metrics[s].error}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilerPage() {
  const [jobs, setJobs] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "failed">("all");

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs/list?limit=20");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? []);
      }
    } catch {
      // If API doesn't exist yet, show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 8000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const filtered = jobs.filter((j) => filter === "all" || j.status === filter);

  // Summary stats
  const avgDuration = jobs.length > 0
    ? jobs.reduce((acc, j) => acc + (j.renderDurationSeconds ?? 0), 0) / jobs.length
    : 0;
  const cacheHitJobs = jobs.filter((j) => Object.values(j.telemetry ?? {}).some((m) => m.cacheHit)).length;
  const failedJobs = jobs.filter((j) => j.status === "failed").length;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Render Profiler</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Waterfall timeline for every pipeline run. Spot bottlenecks, verify parallelism, and measure cache impact.
          </p>
        </div>
        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Runs", value: jobs.length, icon: "movie", color: "text-primary" },
          { label: "Avg Duration", value: `${avgDuration.toFixed(1)}s`, icon: "timer", color: "text-blue-400" },
          { label: "Cache Hit Runs", value: cacheHitJobs, icon: "cached", color: "text-emerald-400" },
          { label: "Failed Runs", value: failedJobs, icon: "error", color: "text-rose-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel rounded-xl p-4 border border-zinc-800 flex items-center gap-3">
            <span className={`material-symbols-outlined text-xl ${stat.color}`}>{stat.icon}</span>
            <div>
              <div className="text-lg font-bold text-zinc-100">{stat.value}</div>
              <div className="text-[11px] text-zinc-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(["all", "completed", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-zinc-950"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Job list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-zinc-400">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm">Loading profiler data...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <span className="material-symbols-outlined text-4xl text-zinc-700 mb-3">analytics</span>
          <p className="text-zinc-400 text-sm font-medium">No runs found</p>
          <p className="text-zinc-600 text-xs mt-1">Start a workflow job to see profiling data here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <JobProfilerCard key={job.jobId} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
