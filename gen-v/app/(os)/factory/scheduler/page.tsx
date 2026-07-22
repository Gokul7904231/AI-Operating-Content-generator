"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Play, Pause, Trash2, Plus, Clock, RefreshCw, X } from "lucide-react";

interface ScheduledJob {
  id: string;
  engine: string;
  topic: string;
  cronExpr: string;
  nextRun: string;
  lastRun?: string;
  enabled: boolean;
  platform?: string[];
  createdAt: string;
}

function CronBadge({ expr }: { expr: string }) {
  const labels: Record<string, string> = {
    "0 */6 * * *": "Every 6h",
    "0 */12 * * *": "Every 12h",
    "0 8 * * *": "Daily 8am",
    "0 8 * * 1": "Weekly Mon",
    "*/30 * * * *": "Every 30m",
  };
  return (
    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
      {labels[expr] ?? expr}
    </span>
  );
}

export default function SchedulerPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [localSchedules, setLocalSchedules] = useState<ScheduledJob[]>([
    { id: "sched_001", engine: "quiz", topic: "SRE Interview Trivia", cronExpr: "0 */6 * * *", nextRun: new Date(Date.now() + 3 * 3600 * 1000).toISOString(), enabled: true, createdAt: new Date().toISOString() },
    { id: "sched_002", engine: "story", topic: "Sci-Fi Short Narratives", cronExpr: "0 8 * * *", nextRun: new Date(Date.now() + 10 * 3600 * 1000).toISOString(), enabled: true, createdAt: new Date().toISOString() },
  ]);

  // Form Fields
  const [engine, setEngine] = useState("quiz");
  const [topic, setTopic] = useState("");
  const [cronExpr, setCronExpr] = useState("0 */6 * * *");
  const [timezone, setTimezone] = useState("UTC");
  const [provider, setProvider] = useState("google");
  const [autopublish, setAutopublish] = useState(true);
  const [approval, setApproval] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newSchedule: ScheduledJob = {
      id: `sched_${Math.random().toString(36).slice(2, 9)}`,
      engine,
      topic: topic || `${engine.toUpperCase()} Auto Job`,
      cronExpr,
      nextRun: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    setLocalSchedules((prev) => [newSchedule, ...prev]);
    setShowNew(false);
    // Reset Form
    setTopic("");
  };

  const toggleStatus = (id: string) => {
    setLocalSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const deleteSchedule = (id: string) => {
    setLocalSchedules(prev => prev.filter(s => s.id !== id));
  };

  const enabled = localSchedules.filter((j) => j.enabled).length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">OS Scheduler</h1>
          <p className="text-xs text-zinc-500 mt-1">Manage recurring content generation jobs with cron expressions</p>
        </div>
        <button 
          onClick={() => setShowNew(true)} 
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Schedule
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Total Schedules</div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{localSchedules.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Active</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{enabled}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Paused</div>
          <div className="text-2xl font-bold font-mono text-amber-400">{localSchedules.length - enabled}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Next Run</div>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {localSchedules.length > 0 ? new Date(localSchedules[0].nextRun).toLocaleTimeString() : "—"}
          </div>
        </div>
      </div>

      {localSchedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center rounded-xl border border-dashed border-zinc-800">
          <Calendar className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-zinc-400 text-sm font-medium">No scheduled jobs</p>
          <p className="text-zinc-650 text-xs mt-1">Create a recurring job to automate content generation</p>
          <button onClick={() => setShowNew(true)} className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors">
            + New Schedule
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/40">
          <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Scheduled Jobs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-zinc-400">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-650">
                  <th className="text-left px-5 py-3">Engine</th>
                  <th className="text-left px-5 py-3">Topic</th>
                  <th className="text-left px-5 py-3">Schedule</th>
                  <th className="text-left px-5 py-3">Next Run</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {localSchedules.map((job) => (
                  <tr key={job.id} className="border-b border-zinc-850 hover:bg-zinc-900/40">
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 capitalize font-mono">{job.engine}</span>
                    </td>
                    <td className="px-5 py-3 text-zinc-300 max-w-[180px] truncate font-semibold">{job.topic}</td>
                    <td className="px-5 py-3"><CronBadge expr={job.cronExpr} /></td>
                    <td className="px-5 py-3 font-mono text-zinc-550">
                      {new Date(job.nextRun).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      {job.enabled
                        ? <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">Active</span>
                        : <span className="px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-500 text-[10px]">Paused</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => toggleStatus(job.id)} className="p-1 rounded hover:bg-zinc-800 text-zinc-550 hover:text-amber-400 transition-colors" title={job.enabled ? "Pause" : "Resume"}>
                          {job.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteSchedule(job.id)} className="p-1 rounded hover:bg-zinc-800 text-zinc-550 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Schedule Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-xs">
          <div 
            onClick={() => setShowNew(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in cursor-pointer" 
          />
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-modal-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-950/40">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Create Automation Schedule</h3>
              </div>
              <button 
                onClick={() => setShowNew(false)}
                className="p-1 rounded hover:bg-zinc-850 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Engine Template</label>
                  <select
                    value={engine}
                    onChange={(e) => setEngine(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="quiz">Quiz Engine</option>
                    <option value="story">Story Engine</option>
                    <option value="motivation">Motivation Engine</option>
                    <option value="gk">General Knowledge</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Cron Expression</label>
                  <select
                    value={cronExpr}
                    onChange={(e) => setCronExpr(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700 font-mono"
                  >
                    <option value="0 */6 * * *">0 */6 * * * (Every 6h)</option>
                    <option value="0 */12 * * *">0 */12 * * * (Every 12h)</option>
                    <option value="0 8 * * *">0 8 * * * (Daily 8 AM)</option>
                    <option value="*/30 * * * *">*/30 * * * * (Every 30m)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Topic / Script Context Seed</label>
                <input
                  type="text"
                  placeholder="e.g. 5 Weird Space Trivia Facts (optional — auto-generated if blank)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-350 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-350 focus:outline-none focus:border-zinc-700"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">AI Routing Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="google">Google Gemini</option>
                    <option value="groq">Groq Llama 3</option>
                    <option value="openrouter">OpenRouter (Sonnet)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autopublish"
                    checked={autopublish}
                    onChange={(e) => setAutopublish(e.target.checked)}
                    className="rounded border-zinc-850 bg-zinc-950 focus:ring-emerald-500"
                  />
                  <label htmlFor="autopublish" className="text-zinc-400 font-semibold cursor-pointer">
                    Auto-publish to YT
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="approval"
                    checked={approval}
                    onChange={(e) => setApproval(e.target.checked)}
                    className="rounded border-zinc-850 bg-zinc-950 focus:ring-emerald-500"
                  />
                  <label htmlFor="approval" className="text-zinc-400 font-semibold cursor-pointer">
                    Require approval
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-850 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-semibold transition-colors"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
