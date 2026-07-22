"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpFromLine, Cloud, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface SyncJob {
  id: string;
  jobId: string;
  videoTitle: string;
  fileSizeMb: number;
  status: "queued" | "completed" | "failed";
  attempts: number;
  lastError?: string;
  createdAt: string;
}

export default function DriveSyncPage() {
  const { data, isLoading } = useQuery<{ jobs: SyncJob[] }>({
    queryKey: ["drive-sync-jobs"],
    queryFn: async () => {
      // Stub to show upload queue and completed sync actions
      return {
        jobs: [
          { id: "sync_001", jobId: "job_001", videoTitle: "How to Build AI SaaS", fileSizeMb: 14.5, status: "completed", attempts: 1, createdAt: new Date().toISOString() },
          { id: "sync_002", jobId: "job_002", videoTitle: "5 Javascript Secrets", fileSizeMb: 18.2, status: "completed", attempts: 1, createdAt: new Date().toISOString() },
          { id: "sync_003", jobId: "job_003", videoTitle: "Python SRE Crash Course", fileSizeMb: 24.1, status: "queued", attempts: 0, createdAt: new Date().toISOString() },
        ]
      };
    }
  });

  const jobs = data?.jobs ?? [];
  const completed = jobs.filter(j => j.status === "completed").length;
  const queued = jobs.filter(j => j.status === "queued").length;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Google Drive Sync</h1>
        <p className="text-sm text-zinc-500 mt-1">Monitor the Google Drive upload pipeline, sync queues, and active quotas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex items-center gap-3">
          <Cloud className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest">Completed Uploads</div>
            <div className="text-lg font-bold text-zinc-200 mt-0.5">{completed} jobs</div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest">Pending in Queue</div>
            <div className="text-lg font-bold text-zinc-200 mt-0.5">{queued} jobs</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/40">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-300">Sync History & Queue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-zinc-400">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-600">
                <th className="text-left px-5 py-3">Video Title</th>
                <th className="text-left px-5 py-3">File Size</th>
                <th className="text-left px-5 py-3">Job ID</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Attempts</th>
                <th className="text-left px-5 py-3">Synced At</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/40">
                  <td className="px-5 py-3 text-zinc-300 font-medium">{job.videoTitle}</td>
                  <td className="px-5 py-3 font-mono">{job.fileSizeMb} MB</td>
                  <td className="px-5 py-3 font-mono text-zinc-550">{job.jobId}</td>
                  <td className="px-5 py-3">
                    {job.status === "completed" ? (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : job.status === "failed" ? (
                      <span className="flex items-center gap-1.5 text-red-400">
                        <AlertCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <Clock className="w-3.5 h-3.5 animate-pulse" /> Queued
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-zinc-500">{job.attempts}</td>
                  <td className="px-5 py-3 text-zinc-500 font-mono">
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
