"use client";

import { useEffect, useState, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type JobStatus = "pending" | "processing" | "retrying" | "dead" | "completed";

interface UploadJob {
  id: string; jobId: string; engine?: string; status: JobStatus;
  attempts: number; maxAttempts: number; nextRetryAt: string | null;
  lastError?: string; createdAt: string; sha256?: string;
}
interface PublishJob {
  id: string; jobId: string; platform: string; status: JobStatus;
  attempts: number; nextRetryAt: string | null; lastError?: string; createdAt: string;
}
interface MetricsData {
  storage: {
    pending: number; processing: number; retrying: number; dead: number; total: number;
    successCount: number; failureCount: number; retryCount: number;
    failureRate: number; retryRate: number; avgUploadMs: number; avgFileSizeKB: number;
    queue: UploadJob[]; deadLetter: UploadJob[];
  };
  publisher: {
    pending: number; processing: number; retrying: number; dead: number;
    successCount: number; failureCount: number; failureRate: number; avgPublishMs: number;
    queue: PublishJob[]; deadLetter: PublishJob[];
  };
  charts: {
    uploadDuration: Array<{ hour: string; avg: number; count: number }>;
    publishDuration: Array<{ hour: string; avg: number; count: number }>;
    failures: Array<{ hour: string; avg: number; count: number }>;
    retries: Array<{ hour: string; avg: number; count: number }>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  pending:    "bg-zinc-700 text-zinc-200",
  processing: "bg-blue-500/20 text-blue-300 animate-pulse",
  retrying:   "bg-amber-500/20 text-amber-300",
  dead:       "bg-red-500/20 text-red-400",
  completed:  "bg-emerald-500/20 text-emerald-400",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold ${STATUS_STYLE[status] ?? "bg-zinc-700 text-zinc-400"}`}>
      {status === "processing" && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />}
      {status === "retrying"   && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
      {status === "dead"       && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "zinc" }: {
  label: string; value: string | number; sub?: string; color?: "zinc" | "emerald" | "amber" | "red" | "blue";
}) {
  const ring: Record<string, string> = {
    zinc: "border-zinc-800", emerald: "border-emerald-500/30",
    amber: "border-amber-500/30", red: "border-red-500/30", blue: "border-blue-500/30",
  };
  const text: Record<string, string> = {
    zinc: "text-zinc-100", emerald: "text-emerald-400",
    amber: "text-amber-400", red: "text-red-400", blue: "text-blue-400",
  };
  return (
    <div className={`rounded-xl border ${ring[color]} bg-zinc-900/60 backdrop-blur px-5 py-4 flex flex-col gap-1`}>
      <span className="text-xs text-zinc-500 uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-bold font-mono ${text[color]}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Icon
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_EMOJI: Record<string, string> = {
  youtube: "▶️", tiktok: "🎵", instagram: "📸", x: "✖️", facebook: "🔵",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkersDashboard() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"storage" | "publisher">("storage");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/workers/metrics");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [fetchMetrics, autoRefresh]);

  const handleRetryDead = async (id: string, queue: "storage" | "publisher") => {
    setRetrying(id);
    try {
      const endpoint = queue === "storage" ? "/api/storage/queue" : "/api/publish/queue";
      await fetch(`${endpoint}?id=${id}`, { method: "DELETE" });
      await fetchMetrics();
    } finally {
      setRetrying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400 text-sm">
        {error ?? "Failed to load metrics"}
      </div>
    );
  }

  const { storage, publisher, charts } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Worker Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Real-time queue monitoring — auto-refreshes every 5s</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh((a) => !a)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              autoRefresh
                ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}
          >
            {autoRefresh ? "🟢 Live" : "⏸ Paused"}
          </button>
          <button
            onClick={fetchMetrics}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Top-level Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Upload Queue"   value={storage.pending}    sub="pending" color="zinc" />
        <StatCard label="Processing"     value={storage.processing} sub="active workers" color="blue" />
        <StatCard label="Retrying"       value={storage.retrying}   sub="storage" color="amber" />
        <StatCard label="Dead Letters"   value={storage.dead + publisher.dead} sub="combined" color="red" />
        <StatCard label="Avg Upload"     value={`${storage.avgUploadMs}ms`}  sub="last 24h" color="emerald" />
        <StatCard label="Failure Rate"   value={`${storage.failureRate}%`}   sub="storage 24h" color={storage.failureRate > 10 ? "red" : "emerald"} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard
          title="Upload Duration (ms)"
          data={charts.uploadDuration}
          dataKey="avg"
          color="#60a5fa"
          unit="ms"
        />
        <ChartCard
          title="Failures (24h)"
          data={charts.failures}
          dataKey="count"
          color="#f87171"
          unit=""
        />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-zinc-800 pb-0">
        {(["storage", "publisher"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
              activeTab === tab
                ? "border-blue-500 text-blue-300 bg-blue-500/10"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab === "storage" ? "📦 Storage Queue" : "📣 Publisher Queue"}
            {tab === "storage" && storage.pending + storage.retrying > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs">
                {storage.pending + storage.retrying}
              </span>
            )}
            {tab === "publisher" && publisher.pending + publisher.retrying > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs">
                {publisher.pending + publisher.retrying}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Storage Tab */}
      {activeTab === "storage" && (
        <div className="space-y-6">
          {/* Active Queue */}
          <Section title="Active Queue" count={storage.queue.length}>
            {storage.queue.length === 0 ? (
              <EmptyState label="Queue is empty" />
            ) : (
              <QueueTable>
                {storage.queue.map((job) => (
                  <UploadJobRow key={job.id} job={job} />
                ))}
              </QueueTable>
            )}
          </Section>

          {/* Dead Letter Queue */}
          <Section title="Dead Letter Queue" count={storage.deadLetter.length} danger>
            {storage.deadLetter.length === 0 ? (
              <EmptyState label="No dead letters" />
            ) : (
              <QueueTable>
                {storage.deadLetter.map((job) => (
                  <UploadJobRow
                    key={job.id}
                    job={job}
                    onRetry={() => handleRetryDead(job.id, "storage")}
                    retrying={retrying === job.id}
                  />
                ))}
              </QueueTable>
            )}
          </Section>
        </div>
      )}

      {/* Publisher Tab */}
      {activeTab === "publisher" && (
        <div className="space-y-6">
          {/* Per-platform stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["youtube", "tiktok", "instagram", "x", "facebook"].map((p) => (
              <div key={p} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-center">
                <div className="text-2xl mb-1">{PLATFORM_EMOJI[p] ?? "🔵"}</div>
                <div className="text-xs text-zinc-500 capitalize">{p}</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {publisher.queue.filter((j) => j.platform === p).length} queued
                </div>
              </div>
            ))}
          </div>

          {/* Active Queue */}
          <Section title="Active Queue" count={publisher.queue.length}>
            {publisher.queue.length === 0 ? (
              <EmptyState label="Queue is empty" />
            ) : (
              <QueueTable publishMode>
                {publisher.queue.map((job) => (
                  <PublishJobRow key={job.id} job={job} />
                ))}
              </QueueTable>
            )}
          </Section>

          {/* Dead Letter Queue */}
          <Section title="Dead Letter Queue" count={publisher.deadLetter.length} danger>
            {publisher.deadLetter.length === 0 ? (
              <EmptyState label="No dead letters" />
            ) : (
              <QueueTable publishMode>
                {publisher.deadLetter.map((job) => (
                  <PublishJobRow
                    key={job.id}
                    job={job}
                    onRetry={() => handleRetryDead(job.id, "publisher")}
                    retrying={retrying === job.id}
                  />
                ))}
              </QueueTable>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, count, children, danger }: {
  title: string; count: number; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className={`rounded-xl border ${danger && count > 0 ? "border-red-500/30" : "border-zinc-800"} bg-zinc-900/40 overflow-hidden`}>
      <div className={`flex items-center justify-between px-5 py-3 border-b ${danger && count > 0 ? "border-red-500/20 bg-red-500/5" : "border-zinc-800"}`}>
        <h2 className={`text-sm font-semibold ${danger && count > 0 ? "text-red-400" : "text-zinc-300"}`}>
          {danger && count > 0 && "🔴 "}{title}
        </h2>
        <span className={`text-xs font-mono px-2 py-0.5 rounded ${danger && count > 0 ? "bg-red-500/20 text-red-300" : "bg-zinc-800 text-zinc-400"}`}>
          {count}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-16 text-zinc-600 text-sm">
      ✓ {label}
    </div>
  );
}

function QueueTable({ children, publishMode }: { children: React.ReactNode; publishMode?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-zinc-400 border-collapse">
        <thead>
          <tr className="text-zinc-600 border-b border-zinc-800">
            <th className="text-left py-2 pr-4 font-medium">ID</th>
            <th className="text-left py-2 pr-4 font-medium">Job ID</th>
            {publishMode
              ? <th className="text-left py-2 pr-4 font-medium">Platform</th>
              : <th className="text-left py-2 pr-4 font-medium">Engine</th>
            }
            <th className="text-left py-2 pr-4 font-medium">Status</th>
            <th className="text-left py-2 pr-4 font-medium">Attempts</th>
            <th className="text-left py-2 pr-4 font-medium">Next Retry</th>
            <th className="text-left py-2 pr-4 font-medium">Error</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function UploadJobRow({ job, onRetry, retrying }: {
  job: UploadJob; onRetry?: () => void; retrying?: boolean;
}) {
  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
      <td className="py-2 pr-4 font-mono text-zinc-500">{job.id.slice(0, 12)}</td>
      <td className="py-2 pr-4 font-mono text-zinc-400 truncate max-w-[120px]">{job.jobId.slice(0, 14)}…</td>
      <td className="py-2 pr-4">
        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{job.engine ?? "—"}</span>
      </td>
      <td className="py-2 pr-4"><Badge status={job.status} /></td>
      <td className="py-2 pr-4 font-mono text-zinc-500">{job.attempts}/{job.maxAttempts}</td>
      <td className="py-2 pr-4 text-zinc-500">
        {job.nextRetryAt ? new Date(job.nextRetryAt).toLocaleTimeString() : "—"}
      </td>
      <td className="py-2 pr-4 text-red-400 truncate max-w-[180px]">{job.lastError ?? "—"}</td>
      <td className="py-2 text-right">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
          >
            {retrying ? "…" : "↺ Retry"}
          </button>
        )}
      </td>
    </tr>
  );
}

function PublishJobRow({ job, onRetry, retrying }: {
  job: PublishJob; onRetry?: () => void; retrying?: boolean;
}) {
  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
      <td className="py-2 pr-4 font-mono text-zinc-500">{job.id.slice(0, 12)}</td>
      <td className="py-2 pr-4 font-mono text-zinc-400 truncate max-w-[120px]">{job.jobId.slice(0, 14)}…</td>
      <td className="py-2 pr-4">
        <span className="flex items-center gap-1">
          {PLATFORM_EMOJI[job.platform] ?? "🔵"}
          <span className="text-zinc-400 capitalize">{job.platform}</span>
        </span>
      </td>
      <td className="py-2 pr-4"><Badge status={job.status} /></td>
      <td className="py-2 pr-4 font-mono text-zinc-500">{job.attempts}</td>
      <td className="py-2 pr-4 text-zinc-500">
        {job.nextRetryAt ? new Date(job.nextRetryAt).toLocaleTimeString() : "—"}
      </td>
      <td className="py-2 pr-4 text-red-400 truncate max-w-[180px]">{job.lastError ?? "—"}</td>
      <td className="py-2 text-right">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
          >
            {retrying ? "…" : "↺ Retry"}
          </button>
        )}
      </td>
    </tr>
  );
}

function ChartCard({ title, data, dataKey, color, unit }: {
  title: string;
  data: Array<{ hour: string; avg?: number; count?: number }>;
  dataKey: "avg" | "count";
  color: string;
  unit: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-sm font-semibold text-zinc-400 mb-4">{title}</h3>
        <div className="h-32 flex items-center justify-center text-zinc-600 text-sm">No data yet</div>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: d.hour ? new Date(d.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#52525b" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#52525b" }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(v: number) => [`${Math.round(v)}${unit}`, title]}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${dataKey})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
