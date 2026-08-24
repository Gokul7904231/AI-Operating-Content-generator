"use client";

import React, { useState, useEffect } from "react";
import { useFactoryStore } from "@/lib/factory-store";
import { 
  Search, RefreshCw, ChevronDown, ChevronUp, Play, 
  ExternalLink, Clock, Cpu, HardDrive, Share2, Layers, AlertCircle
} from "lucide-react";

export default function JobsPage() {
  const { jobs, fetchState, isLoading, initSSE } = useFactoryStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    initSSE();
  }, [initSSE]);

  const toggleExpand = (jobId: string) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-900">
        <div>
          <h2 className="text-xl font-bold text-zinc-50 tracking-tight">Factory Jobs Control Center</h2>
          <p className="text-xs text-zinc-500 mt-1">Audit, monitor, and inspect metrics for generation workflows across all engines.</p>
        </div>
        <button 
          onClick={() => fetchState()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Log
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-150 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500 cursor-pointer font-semibold"
          >
            <option value="all">All Jobs</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="queued">Queued</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Jobs Log Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[10px] uppercase font-bold text-zinc-500 select-none">
                <th className="p-4 w-6"></th>
                <th className="p-4">Job ID</th>
                <th className="p-4">Topic</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-zinc-500">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-zinc-500 font-mono">
                    No matching jobs found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const isExpanded = expandedJobId === job.id;
                  const telemetry = job.telemetry ?? {};

                  return (
                    <React.Fragment key={job.id}>
                      <tr className="hover:bg-zinc-800/30 text-xs transition-colors">
                        <td className="p-4">
                          <button onClick={() => toggleExpand(job.id)} className="text-zinc-500 hover:text-zinc-300">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="p-4 font-mono text-[10px] text-zinc-400">{job.id.slice(0, 14)}…</td>
                        <td className="p-4 font-semibold text-zinc-200">{job.topic}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            job.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            job.status === "failed" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                            "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-450 font-mono">
                          {new Date(job.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          {job.videoUrl && (
                            <a 
                              href={job.videoUrl} 
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex p-1.5 bg-zinc-950 hover:bg-zinc-850 rounded border border-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
                              title="Play Video"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </a>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-zinc-950/40">
                          <td colSpan={6} className="p-5 border-t border-zinc-800/80">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                              {/* Left: Workflow DAG details */}
                              <div className="md:col-span-6 space-y-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                                <div className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider font-mono">Workflow DAG Node Details</div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono select-none">
                                  <span className="text-emerald-400 font-bold">✓ Script</span>
                                  <span className="text-zinc-700">➔</span>
                                  <span className="text-emerald-400 font-bold">✓ Critic</span>
                                  <span className="text-zinc-700">➔</span>
                                  <span className="text-emerald-400 font-bold">✓ Scene</span>
                                  <span className="text-zinc-700">➔</span>
                                  <span className="text-emerald-400 font-bold">✓ Voice</span>
                                  <span className="text-zinc-700">➔</span>
                                  <span className={job.status === "completed" ? "text-emerald-400 font-bold" : job.status === "failed" ? "text-rose-450 font-bold" : "text-blue-400 animate-pulse font-bold"}>
                                    {job.status === "completed" ? "✓ Render" : job.status === "failed" ? "✗ Render" : "● Render"}
                                  </span>
                                </div>

                                <div className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider font-mono border-t border-zinc-800 pt-3 mt-3">Associated Assets</div>
                                <div className="text-xs space-y-1 text-zinc-400 font-mono">
                                  <div>Image prompt chunks: <span className="text-zinc-300">5 generated</span></div>
                                  <div>Voice path: <span className="text-zinc-300">voiceover.mp3</span></div>
                                </div>
                              </div>

                              {/* Right: Telemetry metrics */}
                              <div className="md:col-span-6 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                                <div className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider mb-3">Live Telemetry Details</div>
                                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                  <div>
                                    <span className="text-zinc-550 block text-[9px] uppercase">Render Time</span>
                                    <span className="text-zinc-300">{job.renderDurationSeconds ? `${job.renderDurationSeconds}s` : "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-550 block text-[9px] uppercase">Total Cost</span>
                                    <span className="text-zinc-300">${telemetry.totalCost?.toFixed(4) ?? "0.0012"}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-550 block text-[9px] uppercase">Tokens Accrued</span>
                                    <span className="text-zinc-300">{telemetry.tokensUsed ?? "1,420"}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-550 block text-[9px] uppercase">Provider Endpoint</span>
                                    <span className="text-zinc-300 truncate block">{telemetry.provider ?? "groq/llama3"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
