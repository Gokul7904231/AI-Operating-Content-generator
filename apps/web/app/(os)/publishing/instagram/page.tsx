"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Camera, CheckCircle2, Clock, XCircle, Link2, RefreshCw } from "lucide-react";

interface InstagramPost {
  id: string;
  caption: string;
  status: "published" | "scheduled" | "failed";
  publishTime?: string;
  error?: string;
}

export default function InstagramPublishingPage() {
  const [connected, setConnected] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ posts: InstagramPost[] }>({
    queryKey: ["instagram-posts"],
    queryFn: async () => {
      return {
        posts: [
          { id: "ig_001", caption: "SRE life be like... ☕💻 #developer #devops #sre #programming", status: "published", publishTime: new Date().toISOString() },
          { id: "ig_002", caption: "How to speed up video renders in 60s ⚡ #videoediting #ffmpeg", status: "scheduled", publishTime: new Date(Date.now() + 172800000).toISOString() },
        ]
      };
    }
  });

  const posts = data?.posts ?? [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Instagram Reels Publishing</h1>
          <p className="text-sm text-zinc-500 mt-1">Schedule uploads to your Instagram Reels, inspect post metrics, and link your Creator Account</p>
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
          <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center font-bold text-zinc-100 text-sm">
            📸
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-150">ShortFactory Instagram Reels</h3>
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
          <h2 className="text-sm font-semibold text-zinc-300">Instagram Queue & History</h2>
        </div>
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-center">
              <Camera className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-zinc-500 text-xs">No posts scheduled or published yet</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border border-zinc-850 bg-zinc-900/60">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-zinc-200 truncate">{post.caption}</h4>
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
                      <Clock className="w-3.5 h-3.5 animate-pulse" /> Scheduled
                    </span>
                  )}
                  <span className="block text-[10px] text-zinc-650 mt-1 font-mono">
                    {post.publishTime ? new Date(post.publishTime).toLocaleDateString() : "Pending"}
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
