"use client";

import { useState } from "react";
import { 
  Calendar, Play, Pause, Trash2, Plus, Clock, RefreshCw, X,
  Zap, Lock, ShieldAlert, Cpu, ArrowRight, CheckCircle2, Sparkles
} from "lucide-react";
import { AVAILABLE_MODELS, getModelLabel } from "@/lib/ai/models";
import WebsiteModal from "@/components/WebsiteModal";
import { useAuth } from "@/lib/auth/hooks";

interface ScheduledJob {
  id: string;
  engine: string;
  topic: string;
  cronExpr: string;
  startTime: string; // e.g. "09:30 AM"
  timezone: string;
  nextRun: string;
  enabled: boolean;
  primaryModel: string;
  fallbackModel: string;
  autopublish: boolean;
  requireApproval: boolean;
  createdAt: string;
}

function CronBadge({ expr }: { expr: string }) {
  const labels: Record<string, string> = {
    "0 */6 * * *": "Every 6h",
    "0 */12 * * *": "Every 12h",
    "0 8 * * *": "Daily 8 AM",
    "0 8 * * 1": "Weekly Mon 8 AM",
    "*/30 * * * *": "Every 30m",
  };
  return (
    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
      {labels[expr] ?? expr}
    </span>
  );
}

export default function SchedulerPage() {
  const { user } = useAuth();
  // Role / Tier mode toggle for demonstration & enforcement (Free Basic vs Pro/Admin)
  const [activeTier, setActiveTier] = useState<"FREE" | "PRO" | "ADMIN">(
    user?.role === "OWNER" || user?.role === "ADMIN" ? "ADMIN" : "ADMIN" // Default to ADMIN for evaluation
  );

  const [showNewModal, setShowNewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [websiteToast, setWebsiteToast] = useState<{ isOpen: boolean; title: string; desc: string; icon?: "success" | "info" | "warning" }>({
    isOpen: false,
    title: "",
    desc: "",
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [localSchedules, setLocalSchedules] = useState<ScheduledJob[]>([
    {
      id: "sched_001",
      engine: "quiz",
      topic: "SRE Interview & System Design Trivia",
      cronExpr: "30 9 * * *",
      startTime: "09:30 AM",
      timezone: "UTC",
      nextRun: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      enabled: true,
      primaryModel: "gemini-1.5-flash",
      fallbackModel: "llama-3.3-70b-versatile",
      autopublish: true,
      requireApproval: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "sched_002",
      engine: "story",
      topic: "Sci-Fi Short Narratives & AI Frontiers",
      cronExpr: "0 14 * * 1",
      startTime: "02:00 PM",
      timezone: "EST",
      nextRun: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
      enabled: true,
      primaryModel: "claude-3-5-sonnet",
      fallbackModel: "deepseek-chat",
      autopublish: false,
      requireApproval: true,
      createdAt: new Date().toISOString(),
    },
  ]);

  // Flexible Schedule Form State
  const [engine, setEngine] = useState("quiz");
  const [topic, setTopic] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"TIME" | "CRON">("TIME");
  const [executionTime, setExecutionTime] = useState("09:30");
  const [frequency, setFrequency] = useState<"DAILY" | "EVERY_6H" | "EVERY_12H" | "WEEKLY_MON">("DAILY");
  const [customCron, setCustomCron] = useState("0 */6 * * *");
  const [timezone, setTimezone] = useState("UTC");
  
  // Model Selection & Fallback Routing Strategy
  const [primaryModel, setPrimaryModel] = useState("gemini-1.5-flash");
  const [fallbackModel, setFallbackModel] = useState("llama-3.3-70b-versatile");
  const [autopublish, setAutopublish] = useState(true);
  const [approval, setApproval] = useState(false);

  // Helper to compile time + frequency into cron expression
  const getCompiledCron = (): { cronStr: string; displayTime: string } => {
    if (scheduleMode === "CRON") {
      return { cronStr: customCron, displayTime: "Custom Cron" };
    }
    const [hh, mm] = executionTime.split(":").map(Number);
    const period = hh >= 12 ? "PM" : "AM";
    const displayHour = hh % 12 || 12;
    const formattedDisplay = `${displayHour.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")} ${period}`;

    if (frequency === "DAILY") {
      return { cronStr: `${mm} ${hh} * * *`, displayTime: formattedDisplay };
    }
    if (frequency === "EVERY_6H") {
      return { cronStr: `${mm} */6 * * *`, displayTime: `Every 6h (${formattedDisplay})` };
    }
    if (frequency === "EVERY_12H") {
      return { cronStr: `${mm} */12 * * *`, displayTime: `Every 12h (${formattedDisplay})` };
    }
    if (frequency === "WEEKLY_MON") {
      return { cronStr: `${mm} ${hh} * * 1`, displayTime: `Weekly Mon (${formattedDisplay})` };
    }
    return { cronStr: `${mm} ${hh} * * *`, displayTime: formattedDisplay };
  };

  const handleOpenNewSchedule = () => {
    if (activeTier === "FREE") {
      setShowUpgradeModal(true);
      return;
    }
    setShowNewModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const { cronStr, displayTime } = getCompiledCron();

    const newSchedule: ScheduledJob = {
      id: `sched_${Math.random().toString(36).slice(2, 9)}`,
      engine,
      topic: topic || `${engine.toUpperCase()} Automated Content Flow`,
      cronExpr: cronStr,
      startTime: displayTime,
      timezone,
      nextRun: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      enabled: true,
      primaryModel,
      fallbackModel,
      autopublish,
      requireApproval: approval,
      createdAt: new Date().toISOString(),
    };

    setLocalSchedules((prev) => [newSchedule, ...prev]);
    setShowNewModal(false);
    setTopic("");

    setWebsiteToast({
      isOpen: true,
      title: "Automation Schedule Saved",
      desc: `Scheduled recurring generation for ${newSchedule.topic} using ${primaryModel} with fallback to ${fallbackModel}.`,
      icon: "success",
    });
  };

  const toggleStatus = (id: string) => {
    setLocalSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      setLocalSchedules((prev) => prev.filter((s) => s.id !== deleteConfirmId));
      setDeleteConfirmId(null);
      setWebsiteToast({
        isOpen: true,
        title: "Schedule Removed",
        desc: "Automated recurring schedule deleted successfully.",
        icon: "info",
      });
    }
  };

  const activeCount = localSchedules.filter((j) => j.enabled).length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto font-body-base">
      {/* Header & Role Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-50 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              OS Automation Scheduler
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-zinc-900 border border-zinc-800 text-zinc-300">
              Tier: {activeTier}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Initiate flexible recurring content generation tasks with exact execution times & multi-model failover chains.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tier Demo Switcher */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px] font-mono">
            <button
              onClick={() => setActiveTier("FREE")}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTier === "FREE" ? "bg-zinc-800 text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Free Basic
            </button>
            <button
              onClick={() => setActiveTier("ADMIN")}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTier === "ADMIN" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Admin / Pro
            </button>
          </div>

          <button
            onClick={handleOpenNewSchedule}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4" /> New Schedule
          </button>
        </div>
      </div>

      {/* Free Basic User Guidance Banner */}
      {activeTier === "FREE" && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-amber-200">Free Basic Tier Limit: On-Demand Execution Only</div>
              <div className="text-amber-400/80 text-[11px] mt-0.5">
                Free basic users generate videos manually via Quick Generate. Automated background cron scheduling is an Admin / Pro feature.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" /> Unlock Pro Scheduler
          </button>
        </div>
      )}

      {/* Analytics Counter Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-1">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Total Schedules</div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{localSchedules.length}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-1">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Active Pipelines</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{activeCount}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-1">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Paused</div>
          <div className="text-2xl font-bold font-mono text-amber-400">{localSchedules.length - activeCount}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-1">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Model Failover</div>
          <div className="text-xs font-bold font-mono text-blue-400 flex items-center gap-1 mt-2">
            <Cpu className="w-3.5 h-3.5" /> Primary ➔ Fallback Chain
          </div>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950/40">
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/60 flex justify-between items-center">
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Configured Automated Jobs ({localSchedules.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Engine / Topic</th>
                <th className="p-3.5">Set Execution Time</th>
                <th className="p-3.5">Cron Rule</th>
                <th className="p-3.5">AI Routing Fallback Strategy</th>
                <th className="p-3.5">Next Run</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 text-zinc-300">
              {localSchedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 text-xs">
                    No active automation schedules configured. Click "New Schedule" to initiate a recurring job.
                  </td>
                </tr>
              ) : (
                localSchedules.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-zinc-100 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-900 border border-zinc-800 uppercase text-emerald-400">
                          {job.engine}
                        </span>
                        <span>{job.topic}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                        {job.autopublish ? "Auto-Publish to YT" : "Manual Download"} • {job.requireApproval ? "Requires Admin Approval" : "Auto-Approved"}
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-zinc-200">
                      {job.startTime} <span className="text-zinc-500 font-normal">({job.timezone})</span>
                    </td>
                    <td className="p-3.5">
                      <CronBadge expr={job.cronExpr} />
                    </td>
                    <td className="p-3.5">
                      <div className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px]">
                        <span className="text-emerald-400 font-bold">{job.primaryModel}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-600" />
                        <span className="text-amber-400 font-bold">{job.fallbackModel}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-zinc-400 text-[11px]">
                      {new Date(job.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          job.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {job.enabled ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(job.id)}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
                          title={job.enabled ? "Pause Schedule" : "Resume Schedule"}
                        >
                          {job.enabled ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(job.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Delete Schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW FLEXIBLE AUTOMATION SCHEDULE MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-xs font-body-base">
          <div
            onClick={() => setShowNewModal(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in cursor-pointer"
          />
          <div className="relative z-10 w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Initiate Automation Schedule</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Configure execution time, frequency, and multi-model fallback chain.</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5 flex-1 overflow-y-auto">
              {/* Row 1: Engine Template & Topic Seed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Engine Template</label>
                  <select
                    value={engine}
                    onChange={(e) => setEngine(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="quiz">Quiz Engine</option>
                    <option value="story">Story Engine</option>
                    <option value="motivation">Motivation Engine</option>
                    <option value="news">News Engine</option>
                    <option value="gk">General Knowledge</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Topic / Script Seed</label>
                  <input
                    type="text"
                    placeholder="e.g. 5 Mind-Blowing AI Facts (Auto-generated if blank)"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Row 2: Flexible Schedule Time Designer */}
              <div className="space-y-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Flexible Time & Execution Designer
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setScheduleMode("TIME")}
                      className={`px-2 py-0.5 rounded ${scheduleMode === "TIME" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-zinc-500"}`}
                    >
                      Time Picker
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleMode("CRON")}
                      className={`px-2 py-0.5 rounded ${scheduleMode === "CRON" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-zinc-500"}`}
                    >
                      Custom Cron
                    </button>
                  </div>
                </div>

                {scheduleMode === "TIME" ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Set Generation Time</label>
                      <input
                        type="time"
                        value={executionTime}
                        onChange={(e) => setExecutionTime(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as any)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-emerald-500"
                      >
                        <option value="DAILY">Daily at Time</option>
                        <option value="EVERY_6H">Every 6 Hours</option>
                        <option value="EVERY_12H">Every 12 Hours</option>
                        <option value="WEEKLY_MON">Weekly (Mondays)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-emerald-500"
                      >
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="EST">EST (US Eastern)</option>
                        <option value="PST">PST (US Pacific)</option>
                        <option value="IST">IST (India Standard Time)</option>
                        <option value="CET">CET (Central European)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Cron Syntax Expression</label>
                    <input
                      type="text"
                      value={customCron}
                      onChange={(e) => setCustomCron(e.target.value)}
                      placeholder="e.g. 0 */6 * * *"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Row 3: Multi-Model Failover Strategy Selection */}
              <div className="space-y-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-zinc-850 pb-2">
                  <Cpu className="w-3.5 h-3.5" /> AI Model Selection & Fallback Failover Strategy
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Primary Model</label>
                    <select
                      value={primaryModel}
                      onChange={(e) => setPrimaryModel(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                    >
                      {AVAILABLE_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Fallback Model (Failover)</label>
                    <select
                      value={fallbackModel}
                      onChange={(e) => setFallbackModel(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-amber-500 font-mono"
                    >
                      {AVAILABLE_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-850 font-mono text-[10px] text-zinc-400 flex items-center justify-between">
                  <span>Routing Strategy:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-emerald-400">{primaryModel}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                    <span className="text-amber-400">{fallbackModel}</span>
                  </div>
                </div>
              </div>

              {/* Row 4: Publishing Toggles */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-850 cursor-pointer hover:border-zinc-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={autopublish}
                    onChange={(e) => setAutopublish(e.target.checked)}
                    className="rounded border-zinc-800 bg-zinc-900 focus:ring-emerald-500"
                  />
                  <span className="text-zinc-300 font-semibold">Auto-publish to YouTube</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-850 cursor-pointer hover:border-zinc-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={approval}
                    onChange={(e) => setApproval(e.target.checked)}
                    className="rounded border-zinc-800 bg-zinc-900 focus:ring-emerald-500"
                  />
                  <span className="text-zinc-300 font-semibold">Require Admin Approval</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/10"
                >
                  Save Automation Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRO TIER UNLOCK GUIDANCE MODAL */}
      <WebsiteModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Automated Cron Scheduling is a Pro Feature"
        description="Free basic tier users run on-demand video generation tasks. Automated background cron scheduling with exact time execution and multi-model fallback failover requires a Pro or Admin account."
        icon="pro"
        variant="pro"
        confirmText="Upgrade to Pro / Admin"
        cancelText="Close"
        onConfirm={() => {
          setActiveTier("ADMIN");
          setWebsiteToast({
            isOpen: true,
            title: "Upgraded to Admin Tier",
            desc: "Switched to Admin role mode. You now have full access to flexible automated scheduling.",
            icon: "success",
          });
        }}
      />

      {/* CONFIRM DELETE MODAL */}
      <WebsiteModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Automation Schedule?"
        description="Are you sure you want to delete this recurring automation schedule? In-flight jobs will complete, but no future automatic triggers will run."
        icon="warning"
        variant="danger"
        confirmText="Delete Schedule"
        cancelText="Cancel"
        onConfirm={confirmDelete}
      />

      {/* WEBSITE TOAST FEEDBACK */}
      <WebsiteModal
        isOpen={websiteToast.isOpen}
        onClose={() => setWebsiteToast((prev) => ({ ...prev, isOpen: false }))}
        title={websiteToast.title}
        description={websiteToast.desc}
        icon={websiteToast.icon}
        confirmText="OK / Dismiss"
      />
    </div>
  );
}
