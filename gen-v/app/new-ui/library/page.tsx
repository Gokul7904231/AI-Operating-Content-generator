"use client";

import React, { useState } from "react";
import { TopNav } from "@/components/new-ui/TopNav";
import { Sidebar } from "@/components/new-ui/Sidebar";
import { Panel } from "@/components/new-ui/Panel";
import { Button } from "@/components/new-ui/Button";
import { CommandPalette } from "@/components/new-ui/CommandPalette";
import { Folder, Play, Download, Trash2, Search } from "lucide-react";

export default function LibraryPage() {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#070708] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav title="Rendered Media Asset Library" onOpenCommand={() => setCmdOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 nle-scroll">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold">Rendered Video Assets</h3>
            <span className="text-xs font-mono text-zinc-500">3 Total Videos • 48.2 MB Storage</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id: 1, title: "The 3-Second Brain Hack", timecode: "00:00:15:00", size: "14.2 MB", date: "Today" },
              { id: 2, title: "Why AI Workflows Are Exploding", timecode: "00:00:18:12", size: "18.6 MB", date: "Yesterday" },
              { id: 3, title: "Space Startups Build Fast", timecode: "00:00:12:24", size: "15.4 MB", date: "3 days ago" },
            ].map((video) => (
              <Panel key={video.id} className="p-3 group">
                <div className="w-full aspect-[9/16] max-h-64 bg-black rounded border border-zinc-800 relative overflow-hidden mb-3 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform cursor-pointer">
                    <Play className="w-4 h-4 fill-amber-400 ml-0.5" />
                  </div>
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-zinc-950/80 text-[10px] font-mono text-zinc-400 rounded">
                    {video.timecode}
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-zinc-200 truncate mb-1">{video.title}</h4>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mb-3">
                  <span>{video.size}</span>
                  <span>{video.date}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" className="w-full text-xs">
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                  <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
