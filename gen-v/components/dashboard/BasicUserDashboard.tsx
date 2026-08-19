"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, Video, Play, CheckCircle2, Clock, 
  Film, ArrowUpFromLine, RefreshCw, Eye,
  AlertCircle, ChevronRight, ArrowRight, Shield,
  Sun, Moon
} from "lucide-react";
import Link from "next/link";
import { useFactoryStore } from "@/lib/factory-store";
import { useOSStore } from "@/lib/os-store";
import { useThemeStore } from "@/lib/theme-store";

interface BasicUserDashboardProps {
  userRole: string;
  userEmail?: string;
}

export default function BasicUserDashboard({ userRole, userEmail }: BasicUserDashboardProps) {
  const { jobs, jobsSummary, fetchState, isLoading, queues } = useFactoryStore();
  const toggleQuickGenerate = useOSStore((state) => state.toggleQuickGenerate);
  const { theme, toggleTheme } = useThemeStore();

  const [activeTab, setActiveTab] = useState<"all" | "completed" | "processing">("all");
  const isViewer = userRole === "VIEWER";

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const activeJobs = jobs.filter((j) => (j.status as string) === "running" || (j.status as string) === "processing" || (j.status as string) === "queued");
  const completedJobs = jobs.filter((j) => (j.status as string) === "completed" || (j.status as string) === "rendered");
  const failedJobs = jobs.filter((j) => (j.status as string) === "failed");

  const filteredJobs = jobs.filter((job) => {
    if (activeTab === "completed") return (job.status as string) === "completed" || (job.status as string) === "rendered";
    if (activeTab === "processing") return (job.status as string) === "running" || (job.status as string) === "processing" || (job.status as string) === "queued";
    return true;
  });

  const activeOutboxCount = (queues?.storageQueue?.length ?? 0) + (queues?.publisherQueue?.length ?? 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 select-none font-sans text-[#F5F7FA]">
      
      {/* 1. 🌟 Hero Header & Primary Action */}
      <div className="bg-[#0A1220] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#1677FF]/10 text-[#1677FF] font-semibold text-xs rounded-full border border-[#1677FF]/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Short-Form Production Workspace
            </span>
            {isViewer && (
              <span className="px-2.5 py-0.5 bg-[#F5B942]/10 text-[#F5B942] font-semibold text-[10px] rounded-md border border-[#F5B942]/20 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Read-Only Mode
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display text-[#F5F7FA]">
            Create High-Performing Short Videos
          </h1>
          <p className="text-sm text-[#A8B2C1] leading-relaxed">
            Generate, preview, and publish automated YouTube Shorts & vertical video assets with quality validation.
          </p>
        </div>

        {/* Action Controls & Theme Switcher */}
        <div className="relative z-10 flex-shrink-0 w-full sm:w-auto flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-3.5 rounded-2xl bg-[#0E1728] hover:bg-[#121E32] border border-white/[0.08] text-[#A8B2C1] hover:text-[#F5F7FA] transition-colors shadow-xs cursor-pointer"
            title="Toggle Light/Dark Theme"
          >
            {theme === "light" ? <Moon className="w-4.5 h-4.5 text-[#1677FF]" /> : <Sun className="w-4.5 h-4.5 text-[#F5B942]" />}
          </button>

          {isViewer ? (
            <button
              disabled
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#0E1728] text-[#667085] font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-80 border border-white/[0.08]"
              title="VIEWER role has read-only access."
            >
              <Shield className="w-4 h-4" />
              <span>Creation Restricted (Read-Only)</span>
            </button>
          ) : (
            <button
              onClick={toggleQuickGenerate}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#1677FF] hover:bg-[#0F63D8] active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4.5 h-4.5 text-white" />
              <span>+ Create New Short</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* 2. 📊 Production Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { 
            label: "Total Projects", 
            value: jobs.length, 
            sub: "Personal pipeline jobs", 
            icon: Film, 
            color: "text-[#F5F7FA]", 
            bg: "bg-[#0A1220]" 
          },
          { 
            label: "Active Generations", 
            value: activeJobs.length, 
            sub: activeJobs.length > 0 ? "Rendering in progress" : "No active jobs", 
            icon: Clock, 
            color: activeJobs.length > 0 ? "text-[#1677FF] animate-pulse" : "text-[#667085]", 
            bg: "bg-[#0A1220]" 
          },
          { 
            label: "Renders Completed", 
            value: completedJobs.length, 
            sub: "Ready for delivery", 
            icon: CheckCircle2, 
            color: "text-[#19C37D]", 
            bg: "bg-[#0A1220]" 
          },
          { 
            label: "Delivery Outbox", 
            value: activeOutboxCount, 
            sub: "Queued for Drive/Publish", 
            icon: ArrowUpFromLine, 
            color: "text-[#1677FF]", 
            bg: "bg-[#0A1220]" 
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${stat.bg} border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#A8B2C1]">{stat.label}</span>
                <div className="w-8 h-8 rounded-xl bg-[#0E1728] border border-white/[0.08] flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div>
                <span className={`text-3xl sm:text-4xl font-bold font-display tracking-tight block ${stat.color}`}>{stat.value}</span>
                <span className="text-[11px] text-[#667085] font-medium block mt-1">{stat.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. ⚡ Active Generations Section */}
      {activeJobs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-[#F5F7FA] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1677FF] animate-ping" />
              Active Video Generations ({activeJobs.length})
            </h2>
            <button 
              onClick={() => fetchState()} 
              className="text-xs font-medium text-[#1677FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh State
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeJobs.map((job) => (
              <div key={job.id} className="bg-[#0A1220] border border-[#1677FF]/30 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#1677FF]/10 text-[#1677FF] text-[10px] font-semibold uppercase tracking-wider border border-[#1677FF]/20">
                      {(job as any).contentType || "QUIZ_SHORTS"}
                    </span>
                    <h3 className="text-sm font-bold text-[#F5F7FA] mt-1.5 truncate max-w-xs">{job.topic}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#1677FF]/10 text-[#1677FF] text-xs font-semibold flex items-center gap-1.5 border border-[#1677FF]/20">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Processing
                  </span>
                </div>

                {/* Pipeline Progress Indicator */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#A8B2C1]">
                    <span>Current Stage: <strong className="text-[#F5F7FA]">{(job as any).stage || "Rendering"}</strong></span>
                    <span>{(job as any).progress ? `${(job as any).progress}%` : "In Progress"}</span>
                  </div>
                  <div className="w-full bg-[#070D18] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#1677FF] h-full rounded-full transition-all duration-300"
                      style={{ width: `${(job as any).progress || 60}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 🎬 Recent Projects & Renders Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#F5F7FA]">My Video Projects</h2>
            <p className="text-xs text-[#667085] mt-0.5">Manage and inspect your short video production assets</p>
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: "all", label: `All (${jobs.length})` },
              { id: "completed", label: `Completed (${completedJobs.length})` },
              { id: "processing", label: `In Progress (${activeJobs.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#1677FF] text-white"
                    : "bg-[#0E1728] text-[#A8B2C1] hover:text-[#F5F7FA] hover:bg-[#121E32] border border-white/[0.08]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredJobs.length === 0 ? (
          <div className="bg-[#0A1220] border border-white/[0.08] rounded-3xl p-10 sm:p-14 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#1677FF]/10 border border-[#1677FF]/20 flex items-center justify-center mx-auto text-[#1677FF]">
              <Video className="w-8 h-8" />
            </div>
            <div className="max-w-sm mx-auto space-y-1">
              <h3 className="text-lg font-bold text-[#F5F7FA]">No video projects yet</h3>
              <p className="text-xs text-[#A8B2C1]">
                Start by creating your first automated short video with AI topic brief and quality validation.
              </p>
            </div>
            {!isViewer && (
              <button
                onClick={toggleQuickGenerate}
                className="px-6 py-2.5 rounded-xl bg-[#1677FF] hover:bg-[#0F63D8] text-white text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>+ Create Your First Short</span>
              </button>
            )}
          </div>
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredJobs.map((job) => {
              const isCompleted = (job.status as string) === "completed" || (job.status as string) === "rendered";
              const isFailed = (job.status as string) === "failed";

              return (
                <div key={job.id} className="bg-[#0A1220] border border-white/[0.08] rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#0E1728] border border-white/[0.08] text-[#A8B2C1] text-[10px] font-semibold uppercase tracking-wider">
                        {(job as any).contentType || "QUIZ_SHORTS"}
                      </span>
                      {isCompleted && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#19C37D]/10 text-[#19C37D] text-[10px] font-semibold flex items-center gap-1 border border-[#19C37D]/20">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                      {isFailed && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FF5A67]/10 text-[#FF5A67] text-[10px] font-semibold flex items-center gap-1 border border-[#FF5A67]/20">
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                      {!isCompleted && !isFailed && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#1677FF]/10 text-[#1677FF] text-[10px] font-semibold flex items-center gap-1 border border-[#1677FF]/20">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-[#F5F7FA] leading-snug line-clamp-2">{job.topic}</h3>
                    <p className="text-xs text-[#667085] flex items-center gap-2 font-mono">
                      <span>ID: {job.id.slice(0, 12)}...</span>
                      <span>•</span>
                      <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Recent"}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-[#667085] font-medium text-[11px] font-mono">
                      {(job as any).renderProfile || "FAST_QUIZ"}
                    </span>
                    <Link
                      href={`/library`}
                      className="text-[#1677FF] font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>View Asset</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
