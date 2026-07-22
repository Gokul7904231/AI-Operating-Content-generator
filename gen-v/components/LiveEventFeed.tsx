"use client";

import React, { useEffect, useState } from "react";
import { EventBus } from "@/ai/event-bus";
import { Terminal, Settings, Play, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

interface LogEvent {
  time: string;
  message: string;
  icon: React.ComponentType<any>;
  color: string;
  id: string;
}

export default function LiveEventFeed() {
  const [events, setEvents] = useState<LogEvent[]>([]);

  useEffect(() => {
    // Initial feed mock items
    const getInitialTime = (offsetSec: number) => {
      const d = new Date(Date.now() - offsetSec * 1000);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    setEvents([
      { id: "1", time: getInitialTime(120), message: "Workflow Engine initialized on thread #2", icon: Settings, color: "text-zinc-500" },
      { id: "2", time: getInitialTime(90), message: "AI Router: capability SCRIPT routed to gemini-2.5-flash", icon: Play, color: "text-blue-400" },
      { id: "3", time: getInitialTime(60), message: "Critic Score: 8.5/10 - SEO: 9.0/10 (Passed checks)", icon: CheckCircle2, color: "text-emerald-400" },
      { id: "4", time: getInitialTime(30), message: "Voice synthesized successfully via local ElevenLabs cache", icon: CheckCircle2, color: "text-emerald-400" },
      { id: "5", time: getInitialTime(10), message: "Video assembly renderer spawned subprocess CLI", icon: Settings, color: "text-zinc-400" },
    ]);

    // Subscribe to EventBus events dynamically
    const handleEvent = (message: string, icon: any, color: string) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setEvents((prev) => [
        {
          id: String(Date.now() + Math.random()),
          time: timeStr,
          message,
          icon,
          color,
        },
        ...prev.slice(0, 49), // cap at 50 events
      ]);
    };

    // Subscriptions
    const subJobStarted = EventBus.subscribe<any>("job.started", (e) => {
      handleEvent(`Job ${e.payload.jobId} started for engine ${e.payload.engine}`, Play, "text-blue-400");
    });
    const subJobCompleted = EventBus.subscribe<any>("job.completed", (e) => {
      handleEvent(`Job ${e.payload.jobId} completed rendering in ${e.payload.durationMs}ms`, CheckCircle2, "text-emerald-400");
    });
    const subJobFailed = EventBus.subscribe<any>("job.failed", (e) => {
      handleEvent(`Job failed: ${e.payload.error}`, ShieldAlert, "text-rose-400");
    });
    const subUploadStarted = EventBus.subscribe<any>("storage.upload.started", (e) => {
      handleEvent(`StorageQueue: started upload to Drive`, Settings, "text-purple-400");
    });
    const subUploadCompleted = EventBus.subscribe<any>("storage.upload.completed", (e) => {
      handleEvent(`StorageQueue: upload success. Drive File ID: ${e.payload.driveFileId?.slice(0, 10)}…`, CheckCircle2, "text-emerald-400");
    });
    const subUploadFailed = EventBus.subscribe<any>("storage.upload.failed", (e) => {
      handleEvent(`StorageQueue Retry: upload failed: ${e.payload.error}`, AlertTriangle, "text-amber-400");
    });

    return () => {
      EventBus.unsubscribe(subJobStarted);
      EventBus.unsubscribe(subJobCompleted);
      EventBus.unsubscribe(subJobFailed);
      EventBus.unsubscribe(subUploadStarted);
      EventBus.unsubscribe(subUploadCompleted);
      EventBus.unsubscribe(subUploadFailed);
    };
  }, []);

  return (
    <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 flex flex-col h-[320px]">
      <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 shrink-0 select-none">
        <Terminal className="w-4 h-4 text-emerald-400" />
        Live Event Feed
      </h3>
      
      <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2.5 terminal-scroll">
        {events.map((evt) => {
          const Icon = evt.icon;
          return (
            <div key={evt.id} className="flex items-start gap-3 text-[11px] font-mono leading-relaxed">
              <span className="text-zinc-650 select-none shrink-0">{evt.time}</span>
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${evt.color}`} />
              <span className="text-zinc-400">{evt.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
