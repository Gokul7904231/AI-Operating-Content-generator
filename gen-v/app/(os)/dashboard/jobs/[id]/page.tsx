"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  Pause,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Zap,
  Activity,
  RotateCcw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepTimeline {
  step: string;
  status: "running" | "completed" | "failed" | "suspended" | "pending";
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  error?: string;
}

interface RawEvent {
  id: number;
  type: string;
  payload: Record<string, any>;
  timestamp: string;
}

interface TimelineResponse {
  success: boolean;
  jobId: string;
  checkpoint: { currentStep: string; status: string; updatedAt: string } | null;
  steps: StepTimeline[];
  events: RawEvent[];
}

// ─── Step graph definition ───────────────────────────────────────────────────

const STEP_ORDER = ["script", "critic", "scene", "voice", "image", "render", "upload", "publish"];
const STEP_ICONS: Record<string, string> = {
  script: "✍️", critic: "🧠", scene: "🎬", voice: "🎙️",
  image: "🖼️", render: "⚙️", upload: "☁️", publish: "📢",
};

const STATUS_COLOR: Record<string, string> = {
  completed:  "border-emerald-500 bg-emerald-500/10 text-emerald-400",
  running:    "border-blue-400 bg-blue-500/10 text-blue-300 shadow-blue-500/20",
  failed:     "border-red-500 bg-red-500/10 text-red-400",
  suspended:  "border-amber-500 bg-amber-500/10 text-amber-400",
  pending:    "border-zinc-700 bg-zinc-900 text-zinc-500",
};

const STATUS_GLOW: Record<string, string> = {
  running:   "shadow-lg shadow-blue-500/30",
  failed:    "shadow-lg shadow-red-500/20",
  completed: "",
  suspended: "shadow-lg shadow-amber-500/20",
  pending:   "",
};

// ─── Step Node ───────────────────────────────────────────────────────────────

function StepNode({
  step,
  timeline,
  active,
  onClick,
}: {
  step: string;
  timeline?: StepTimeline;
  active: boolean;
  onClick: () => void;
}) {
  const status = timeline?.status ?? "pending";
  const color = STATUS_COLOR[status];
  const glow = STATUS_GLOW[status];

  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: active ? 1.08 : 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 min-w-[80px] cursor-pointer transition-all ${color} ${glow}`}
    >
      {status === "running" && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
      )}
      <span className="text-xl">{STEP_ICONS[step] ?? "🔧"}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest">{step}</span>
      {timeline?.durationMs !== undefined && status === "completed" && (
        <span className="text-[9px] font-mono text-emerald-500">
          {timeline.durationMs > 1000
            ? `${(timeline.durationMs / 1000).toFixed(1)}s`
            : `${timeline.durationMs}ms`}
        </span>
      )}
      {status === "failed" && <XCircle className="w-3 h-3 text-red-500" />}
      {status === "suspended" && <Pause className="w-3 h-3 text-amber-400" />}
    </motion.button>
  );
}

// ─── Connector arrow ─────────────────────────────────────────────────────────

function Arrow({ done }: { done: boolean }) {
  return (
    <div className={`flex items-center shrink-0 mx-1 transition-colors ${done ? "text-emerald-500" : "text-zinc-700"}`}>
      <ChevronRight className="w-4 h-4" />
    </div>
  );
}

// ─── Waterfall timeline bar ───────────────────────────────────────────────────

function WaterfallRow({ step, timeline, totalMs }: { step: StepTimeline; timeline: StepTimeline[]; totalMs: number }) {
  const color: Record<string, string> = {
    script:  "#4edea3", critic: "#c0c1ff", scene: "#fbbf24",
    voice:   "#60a5fa", image:  "#f472b6", render: "#f87171",
    upload:  "#a78bfa", publish:"#34d399",
  };
  const pct = totalMs > 0 && step.durationMs ? (step.durationMs / totalMs) * 100 : 5;

  return (
    <div className="flex items-center gap-3 text-[11px] font-mono">
      <div className="w-16 text-right text-zinc-400 shrink-0">{step.step}</div>
      <div className="flex-1 h-5 bg-zinc-900 rounded overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 1)}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute h-full rounded flex items-center px-2 text-zinc-950 font-bold text-[9px]"
          style={{ backgroundColor: color[step.step] ?? "#6b7280" }}
        >
          {step.durationMs
            ? step.durationMs > 1000
              ? `${(step.durationMs / 1000).toFixed(1)}s`
              : `${step.durationMs}ms`
            : "..."}
        </motion.div>
      </div>
      <div className="w-20 text-right shrink-0">
        {step.status === "completed" && <span className="text-emerald-400">✓</span>}
        {step.status === "failed" && <span className="text-red-400">✕ {step.error?.slice(0, 20)}</span>}
        {step.status === "running" && <span className="text-blue-400 animate-pulse">running…</span>}
        {step.status === "pending" && <span className="text-zinc-600">—</span>}
        {step.status === "suspended" && <span className="text-amber-400">⏸</span>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobDAGPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replayStep, setReplayStep] = useState("");
  const [replaying, setReplaying] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/timeline`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch {}
    finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => {
    fetchTimeline();
    const t = setInterval(fetchTimeline, 3000);
    return () => clearInterval(t);
  }, [fetchTimeline]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.events?.length]);

  const handleReplay = async () => {
    if (!replayStep) return;
    setReplaying(true);
    try {
      await fetch(`/api/jobs/${jobId}/replay?step=${replayStep}`, { method: "POST" });
      setTimeout(fetchTimeline, 500);
    } catch {}
    finally { setReplaying(false); }
  };

  // Build a map of step → timeline entry
  const stepMap = Object.fromEntries((data?.steps ?? []).map((s) => [s.step, s]));
  const totalMs = (data?.steps ?? []).reduce((acc, s) => acc + (s.durationMs ?? 0), 0);

  const jobStatus = data?.checkpoint?.status ?? "unknown";
  const statusBadge: Record<string, { label: string; cls: string }> = {
    completed: { label: "Completed", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    processing: { label: "Running", cls: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
    failed: { label: "Failed", cls: "text-red-400 bg-red-500/10 border-red-500/30" },
    suspended: { label: "Awaiting Approval", cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    unknown: { label: "Unknown", cls: "text-zinc-400 bg-zinc-800 border-zinc-700" },
  };
  const badge = statusBadge[jobStatus] ?? statusBadge.unknown;

  const selectedStep = selected ? stepMap[selected] : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            Live Job DAG
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">{jobId}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${badge.cls}`}>
            {badge.label}
          </span>
          <button
            onClick={fetchTimeline}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* DAG Flow Graph */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 overflow-x-auto">
            <div className="flex items-center gap-0 min-w-max">
              {STEP_ORDER.map((step, idx) => (
                <div key={step} className="flex items-center">
                  <StepNode
                    step={step}
                    timeline={stepMap[step]}
                    active={selected === step}
                    onClick={() => setSelected(selected === step ? null : step)}
                  />
                  {idx < STEP_ORDER.length - 1 && (
                    <Arrow done={stepMap[step]?.status === "completed"} />
                  )}
                </div>
              ))}
            </div>

            {/* Summary row */}
            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{(data?.steps ?? []).filter((s) => s.status === "completed").length}/{STEP_ORDER.length} steps complete</span>
              <span className="font-mono">Total: {totalMs > 0 ? `${(totalMs / 1000).toFixed(1)}s` : "—"}</span>
            </div>
          </div>

          {/* Step Detail Panel */}
          <AnimatePresence>
            {selectedStep && (
              <motion.div
                key={selectedStep.step}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2"
              >
                <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  {STEP_ICONS[selectedStep.step]} {selectedStep.step}
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[selectedStep.status]}`}>
                    {selectedStep.status}
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <div className="text-zinc-500">Started</div>
                    <div className="font-mono text-zinc-300">{new Date(selectedStep.startedAt).toLocaleTimeString()}</div>
                  </div>
                  {selectedStep.finishedAt && (
                    <div>
                      <div className="text-zinc-500">Finished</div>
                      <div className="font-mono text-zinc-300">{new Date(selectedStep.finishedAt).toLocaleTimeString()}</div>
                    </div>
                  )}
                  {selectedStep.durationMs !== undefined && (
                    <div>
                      <div className="text-zinc-500">Duration</div>
                      <div className="font-mono text-zinc-300">
                        {selectedStep.durationMs > 1000
                          ? `${(selectedStep.durationMs / 1000).toFixed(2)}s`
                          : `${selectedStep.durationMs}ms`}
                      </div>
                    </div>
                  )}
                  {selectedStep.error && (
                    <div className="col-span-2">
                      <div className="text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Error</div>
                      <div className="font-mono text-red-400 text-[10px] mt-0.5">{selectedStep.error}</div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2-column layout: Waterfall + Event Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Waterfall Timeline */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Step Waterfall
              </h2>
              <div className="space-y-1.5 mt-3">
                {STEP_ORDER.map((step) => {
                  const s = stepMap[step];
                  if (!s) return null;
                  return <WaterfallRow key={step} step={s} timeline={data?.steps ?? []} totalMs={totalMs} />;
                })}
                {Object.keys(stepMap).length === 0 && (
                  <p className="text-zinc-600 text-xs">No steps executed yet.</p>
                )}
              </div>
            </div>

            {/* Live Event Feed */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-blue-400" /> Event Log
              </h2>
              <div className="flex-1 overflow-y-auto max-h-72 space-y-1.5 terminal-scroll font-mono text-[10px]">
                {(data?.events ?? []).map((ev) => (
                  <div
                    key={ev.id}
                    className={`flex items-start gap-2 border-b border-zinc-800/50 pb-1 ${
                      ev.type.includes("failed") ? "text-red-400" :
                      ev.type.includes("completed") ? "text-emerald-400" :
                      ev.type.includes("started") ? "text-blue-300" :
                      "text-zinc-400"
                    }`}
                  >
                    <span className="text-zinc-600 shrink-0">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    <span>{ev.type}</span>
                    {ev.payload?.stepId && (
                      <span className="text-zinc-500">→ {ev.payload.stepId}</span>
                    )}
                    {ev.payload?.error && (
                      <span className="text-red-400 ml-1 truncate max-w-[180px]">{ev.payload.error}</span>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
                {(data?.events ?? []).length === 0 && (
                  <p className="text-zinc-600">Waiting for events…</p>
                )}
              </div>
            </div>
          </div>

          {/* Replay Panel */}
          {(jobStatus === "failed" || jobStatus === "processing") && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
                <RotateCcw className="w-4 h-4 text-purple-400" /> Replay from Step
              </h2>
              <div className="flex items-center gap-3">
                <select
                  value={replayStep}
                  onChange={(e) => setReplayStep(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:border-zinc-600"
                >
                  <option value="">— Select step to resume from —</option>
                  {STEP_ORDER.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button
                  onClick={handleReplay}
                  disabled={!replayStep || replaying}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 text-sm font-medium hover:bg-purple-600/30 disabled:opacity-50 transition-colors"
                >
                  {replaying ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scheduling…</>
                  ) : (
                    <><RotateCcw className="w-3.5 h-3.5" /> Replay</>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-zinc-600 mt-2">
                Replay resumes execution from the selected step, loading all prior outputs from the SQLite checkpoint.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
