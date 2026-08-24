"use client";

import React, { useEffect } from "react";
import { useFactoryStore } from "@/lib/factory-store";
import { Activity, Database, AlertCircle, Clock, CheckCircle2, RefreshCw } from "lucide-react";

export default function FactoryQueuePage() {
  const { queues, jobsSummary, jobs, fetchState, isLoading, initSSE } = useFactoryStore();

  useEffect(() => {
    initSSE();
  }, [initSSE]);

  // Combine jobs into pipelines
  const kanbanJobs = jobs.map((job) => {
    let column: "waiting" | "running" | "rendering" | "uploading" | "publishing" | "completed" | "failed" = "waiting";
    let progress = 10;
    let details = "Initialized";

    if (job.status === "queued") {
      column = "waiting";
      progress = 15;
      details = "Waiting in DB";
    } else if (job.status === "processing") {
      column = "running";
      progress = 40;
      details = "Running Script/Voice";
    } else if (job.status === "completed") {
      column = "completed";
      progress = 100;
      details = "Workflow Complete";
    } else if (job.status === "failed") {
      column = "failed";
      progress = 100;
      details = "Workflow Failed";
    }

    // Override based on storage queues
    const storageJob = queues.storageQueue.find(q => q.jobId === job.jobId);
    const storageDead = queues.storageDead.find(q => q.jobId === job.jobId);
    const publishJob = queues.publisherQueue.find(q => q.jobId === job.jobId);
    const publishDead = queues.publisherDead.find(q => q.jobId === job.jobId);

    if (storageJob) {
      column = "uploading";
      progress = 75;
      details = `Drive Sync (Attempt ${storageJob.attempts})`;
    } else if (storageDead) {
      column = "failed";
      progress = 80;
      details = "Drive Upload Dead";
    }

    if (publishJob) {
      column = "publishing";
      progress = 90;
      details = `Auto-publishing (Attempt ${publishJob.attempts})`;
    } else if (publishDead) {
      column = "failed";
      progress = 95;
      details = "Publish Dead";
    }

    return {
      id: job.id,
      jobId: job.jobId,
      topic: job.topic,
      column,
      progress,
      details,
    };
  });

  const getJobsByColumn = (col: string) => {
    return kanbanJobs.filter(j => j.column === col);
  };

  const columns = [
    { title: "Waiting", id: "waiting" as const, color: "border-zinc-800 text-zinc-400 bg-zinc-950/20" },
    { title: "Running", id: "running" as const, color: "border-blue-500/20 text-blue-400 bg-blue-500/5 animate-pulse" },
    { title: "Uploading", id: "uploading" as const, color: "border-purple-500/20 text-purple-400 bg-purple-500/5" },
    { title: "Publishing", id: "publishing" as const, color: "border-indigo-500/20 text-indigo-400 bg-indigo-500/5" },
    { title: "Completed", id: "completed" as const, color: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" },
    { title: "Failed", id: "failed" as const, color: "border-rose-500/20 text-rose-400 bg-rose-500/5" },
  ];

  const totalActive = queues.storageQueue.length + queues.publisherQueue.length;
  const totalDead = queues.storageDead.length + queues.publisherDead.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Factory Pipeline Board</h1>
          <p className="text-xs text-zinc-500 mt-1">Live tracking of render, upload, and publish tasks across the pipeline.</p>
        </div>
        <button 
          onClick={() => fetchState()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
        </button>
      </div>

      {/* Queue Stats block — honest: only real queue counters, no fake workers/throughput */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: "Queue Health", value: totalDead > 0 ? "Degraded" : "Healthy", color: totalDead > 0 ? "text-amber-400" : "text-emerald-400" },
          { label: "Running", value: String(jobsSummary.running), color: "text-zinc-150" },
          { label: "Queued", value: String(jobsSummary.queued), color: "text-zinc-150" },
          { label: "Completed", value: String(jobsSummary.completed), color: "text-zinc-150" },
          { label: "Retries Count", value: queues.storageQueue.reduce((sum, j) => sum + j.attempts, 0), color: "text-zinc-150" },
          { label: "Dead Letters", value: totalDead, color: totalDead > 0 ? "text-red-400" : "text-zinc-550" },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-mono">{stat.label}</span>
            <span className={`text-base font-bold font-mono tracking-tight mt-1.5 block ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Kanban Board columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {columns.map((col) => {
          const colJobs = getJobsByColumn(col.id);

          return (
            <div key={col.id} className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 flex flex-col gap-3 min-h-[50vh] max-h-[75vh] overflow-y-auto">
              <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-semibold select-none ${col.color}`}>
                <span>{col.title}</span>
                <span className="font-mono text-[10px]">{colJobs.length}</span>
              </div>

              <div className="space-y-3 flex-1">
                {colJobs.length === 0 ? (
                  <div className="h-20 flex items-center justify-center text-[10px] text-zinc-700 font-mono border border-dashed border-zinc-900 rounded-lg">
                    Stage empty
                  </div>
                ) : (
                  colJobs.map((job) => (
                    <div 
                      key={job.id} 
                      className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex flex-col gap-3 transition-all hover:border-zinc-700 select-none cursor-pointer"
                    >
                      <div>
                        <div className="text-[10px] font-bold text-zinc-200 truncate">{job.topic}</div>
                        <div className="text-[8px] text-zinc-500 font-mono mt-1 flex justify-between">
                          <span>{job.jobId.slice(0, 8)}…</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-zinc-950 rounded-full h-1">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              job.column === "failed" ? "bg-rose-500" :
                              job.column === "completed" ? "bg-emerald-500" : "bg-blue-500"
                            }`} 
                            style={{ width: `${job.progress}%` }} 
                          />
                        </div>
                        <div className="text-[8px] text-zinc-500 font-mono flex justify-between">
                          <span className="truncate max-w-[100px]">{job.details}</span>
                          <span>{job.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
