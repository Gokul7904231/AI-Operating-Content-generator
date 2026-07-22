"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Video, CheckCircle2, XCircle, Clock, Link2, RefreshCw } from "lucide-react";

interface YoutubePost {
  id: string;
  title: string;
  description: string;
  status: "published" | "scheduled" | "failed";
  scheduledTime?: string;
  publishedTime?: string;
  youtubeId?: string;
  error?: string;
}

export default function YoutubePublishingPage() {
  const [connected, setConnected] = useState(true);

  const { data, isLoading, refetch } = useQuery<{ posts: YoutubePost[] }>({
    queryKey: ["youtube-posts"],
    queryFn: async () => {
      return {
        posts: [
          { id: "post_001", title: "Top 5 AI Secrets", description: "In this video, we explore the top 5 secrets of artificial intelligence.", status: "published", publishedTime: new Date().toISOString(), youtubeId: "dQw4w9WgXcQ" },
          { id: "post_002", title: "How to run local LLMs", description: "Setup and run large language models offline.", status: "scheduled", scheduledTime: new Date(Date.now() + 86400000).toISOString() },
          { id: "post_003", title: "Python decorators explained", description: "Master python decorators in 60 seconds.", status: "failed", error: "OAuth token expired. Please reconnect your account." },
        ]
      };
    }
  });

  const posts = data?.posts ?? [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">YouTube Publishing</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage scheduled posts, dynamic shorts queues, and channel analytics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => setConnected(!connected)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
              connected
                ? "bg-red-950/20 border-red-900/40 text-red-400"
                : "bg-emerald-600 hover:bg-emerald-500 text-zinc-950"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" /> {connected ? "Disconnect Account" : "Connect Account"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="w-8 h-8 text-red-500" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-150">ShortFactory Shorts Channel</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Status: {connected ? "Connected" : "Disconnected"}</p>
          </div>
        </div>
        {connected && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
            Linked
          </span>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/40">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-300">Publishing Queue</h2>
        </div>
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-center">
              <Video className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-zinc-500 text-xs">No posts scheduled or published yet</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border border-zinc-850 bg-zinc-900/60">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-zinc-200 truncate">{post.title}</h4>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{post.description}</p>
                  {post.error && (
                    <p className="text-[10px] text-red-400 font-mono mt-1">{post.error}</p>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs">
                  {post.status === "published" ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Published
                    </span>
                  ) : post.status === "failed" ? (
                    <span className="flex items-center gap-1.5 text-red-400 font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Scheduled
                    </span>
                  )}
                  <span className="block text-[10px] text-zinc-650 mt-1 font-mono">
                    {post.publishedTime ? new Date(post.publishedTime).toLocaleDateString() : post.scheduledTime ? new Date(post.scheduledTime).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
