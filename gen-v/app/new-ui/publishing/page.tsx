"use client";

import React, { useState } from "react";
import { TopNav } from "@/components/new-ui/TopNav";
import { Sidebar } from "@/components/new-ui/Sidebar";
import { Panel } from "@/components/new-ui/Panel";
import { Button } from "@/components/new-ui/Button";
import { CommandPalette } from "@/components/new-ui/CommandPalette";
import { Share2, CheckCircle2, Play, Video, Camera, Clock } from "lucide-react";

export default function PublishingPage() {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#070708] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav title="Multi-Platform Publisher" onOpenCommand={() => setCmdOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 nle-scroll">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Panel className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                  <Play className="w-5 h-5 fill-red-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">YouTube Shorts</h4>
                  <span className="text-xs font-mono text-emerald-400">Connected</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">Manage</Button>
            </Panel>

            <Panel className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">TikTok Queue</h4>
                  <span className="text-xs font-mono text-emerald-400">Connected</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">Manage</Button>
            </Panel>

            <Panel className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-500">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Instagram Reels</h4>
                  <span className="text-xs font-mono text-emerald-400">Connected</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">Manage</Button>
            </Panel>
          </div>

          <Panel title="Publishing Pipeline Queue">
            <div className="space-y-3">
              {[
                { title: "Why AI Workflows Are Exploding", dest: "YouTube Shorts • TikTok", status: "SCHEDULED", time: "Today @ 18:00 EST" },
                { title: "The 3-Second Brain Hack", dest: "Instagram Reels", status: "PUBLISHED", time: "Yesterday @ 14:30 EST" },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-zinc-950/80 border border-zinc-800 rounded flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-semibold text-zinc-200">{item.title}</h5>
                    <span className="text-zinc-500 font-mono text-[11px]">{item.dest}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-amber-400 text-[11px]">{item.status}</span>
                    <span className="text-zinc-500 text-[11px]">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
