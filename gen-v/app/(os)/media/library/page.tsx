"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Film, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  Cloud, 
  HardDrive, 
  RefreshCw,
  Play,
  Share2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface VideoAsset {
  publicId: string;
  url: string;
  displayName: string;
  bytes: number;
  format: string;
  duration?: number;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDuration(s?: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function MediaLibraryPage() {
  const [prefix, setPrefix] = useState("geo_quiz_factory");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "quiz" | "history" | "facts">("all");

  // Fetch Cloudinary Assets via Query
  const { data, isLoading, error, refetch } = useQuery<{ videos: VideoAsset[]; total: number }>({
    queryKey: ["media-library", prefix],
    queryFn: async () => {
      const res = await fetch(`/api/library?prefix=${encodeURIComponent(prefix)}&max=20`);
      if (!res.ok) throw new Error("Failed to load library assets");
      return res.json();
    },
  });

  const videos = data?.videos ?? [];

  // Filter videos based on tab and search query
  const filteredVideos = videos.filter((v) => {
    const matchesSearch = v.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "quiz" && v.displayName.toLowerCase().includes("quiz")) ||
      (activeTab === "history" && v.displayName.toLowerCase().includes("history")) ||
      (activeTab === "facts" && v.displayName.toLowerCase().includes("facts"));
    
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-900">
        <div>
          <h2 className="text-sm font-bold text-zinc-50 tracking-tight">Studio Media Library</h2>
          <p className="text-xs text-zinc-500 mt-1">Manage, download, and publish your generated short-form assets.</p>
        </div>

        {/* Filter Selection */}
        <div className="flex gap-2 items-center">
          <select
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="geo_quiz_factory">geo_quiz_factory/</option>
            <option value="ai_shorts">ai_shorts/</option>
            <option value="ai_shorts/quizzes">ai_shorts/quizzes/</option>
          </select>
          <button 
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 hover:text-emerald-400 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-150 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-900/50 border border-zinc-900 rounded-lg shrink-0">
          {(["all", "quiz", "history", "facts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors ${
                activeTab === tab ? "bg-zinc-950 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400">
          ⚠️ {(error as Error).message}
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-900 rounded-xl overflow-hidden animate-pulse h-64" />
          ))
        ) : filteredVideos.length === 0 ? (
          <div className="col-span-full text-center py-20 text-zinc-500">
            <Film className="w-10 h-10 mx-auto opacity-30 mb-3" />
            <div className="text-xs font-bold text-zinc-400">No assets found</div>
            <div className="text-[10px] text-zinc-500 mt-1">Generate videos or change your active directory prefix search filters.</div>
          </div>
        ) : (
          filteredVideos.map((v) => (
            <div key={v.publicId} className="group bg-zinc-900 border border-zinc-900 rounded-xl overflow-hidden hover:border-zinc-800 transition-all duration-300 flex flex-col">
              {/* Thumbnail Frame */}
              <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
                <video
                  src={v.url}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  muted
                  preload="metadata"
                  onMouseEnter={(e: any) => e.target.play()}
                  onMouseLeave={(e: any) => { e.target.pause(); e.target.currentTime = 0; }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                  <Play className="w-8 h-8 text-zinc-50 fill-zinc-50" />
                </div>
                {v.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400">
                    {formatDuration(v.duration)}
                  </div>
                )}
              </div>

              {/* Asset Meta */}
              <div className="p-4 flex flex-col flex-grow gap-3">
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 truncate">{v.displayName || "Generated Output"}</h4>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Size: {formatBytes(v.bytes)} • {v.format?.toUpperCase()}</div>
                </div>

                {/* Cloud Sync Status */}
                <div className="flex items-center gap-3 border-t border-zinc-850 pt-3 text-[10px] font-semibold text-zinc-500 select-none">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Cloudinary</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Google Drive</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <a 
                    href={v.url}
                    download
                    className="flex items-center justify-center gap-1.5 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 py-2 rounded-lg transition-colors text-[10px] font-bold border border-zinc-850"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                  <button 
                    className="flex items-center justify-center gap-1.5 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 py-2 rounded-lg transition-colors text-[10px] font-bold border border-zinc-850"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Publish</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
