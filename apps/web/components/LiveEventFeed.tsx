"use client";

import React, { useEffect, useState, memo } from "react";
import { EventBus } from "@/ai/event-bus";
import { Terminal, Settings, Play, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

interface LogEvent {
  time: string;
  message: string;
  icon: React.ComponentType<any>;
  color: string;
  id: string;
}

function LiveEventFeed() {
  const [events, setEvents] = useState<LogEvent[]>([]);

  useEffect(() => {
    const getInitialTime = (offsetSec: number) => {
      const d = new Date(Date.now() - offsetSec * 1000);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    setEvents([
      { id: "1", time: getInitialTime(120), message: "Workflow Engine initialized on thread #2", icon: Settings, color: "text-[#667085]" },
      { id: "2", time: getInitialTime(90), message: "AI Router: capability SCRIPT routed to gemini-2.5-flash", icon: Play, color: "text-[#1677FF]" },
      { id: "3", time: getInitialTime(60), message: "Critic Score: 8.5/10 - SEO: 9.0/10 (Passed checks)", icon: CheckCircle2, color: "text-[#19C37D]" },
      { id: "4", time: getInitialTime(30), message: "Voice synthesized successfully via local ElevenLabs cache", icon: CheckCircle2, color: "text-[#19C37D]" },
      { id: "5", time: getInitialTime(10), message: "Video assembly renderer spawned subprocess CLI", icon: Settings, color: "text-[#A8B2C1]" },
    ]);

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
        ...prev.slice(0, 49),
      ]);
    };

    const subJobStarted = EventBus.subscribe<any>("job.started", (e) => {
      handleEvent(`Job ${e.payload.jobId} started for engine ${e.payload.engine}`, Play, "text-[#1677FF]");
    });
    const subJobCompleted = EventBus.subscribe<any>("job.completed", (e) => {
      handleEvent(`Job ${e.payload.jobId} completed rendering in ${e.payload.durationMs}ms`, CheckCircle2, "text-[#19C37D]");
    });
    const subJobFailed = EventBus.subscribe<any>("job.failed", (e) => {
      handleEvent(`Job failed: ${e.payload.error}`, ShieldAlert, "text-[#FF5A67]");
    });
    const subUploadStarted = EventBus.subscribe<any>("storage.upload.started", (e) => {
      handleEvent(`StorageQueue: started upload to Drive`, Settings, "text-purple-400");
    });
    const subUploadCompleted = EventBus.subscribe<any>("storage.upload.completed", (e) => {
      handleEvent(`StorageQueue: upload success. Drive File ID: ${e.payload.driveFileId?.slice(0, 10)}…`, CheckCircle2, "text-[#19C37D]");
    });
    const subUploadFailed = EventBus.subscribe<any>("storage.upload.failed", (e) => {
      handleEvent(`StorageQueue Retry: upload failed: ${e.payload.error}`, AlertTriangle, "text-[#F5B942]");
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
    <div className="bg-[#0A1220] border border-white/[0.08] rounded-2xl p-5 flex flex-col h-[320px]">
      <h3 className="text-xs font-bold text-[#F5F7FA] uppercase tracking-widest flex items-center gap-2 border-b border-white/[0.08] pb-3 shrink-0 select-none font-mono">
        <Terminal className="w-4 h-4 text-[#1677FF]" />
        Live Event Feed
      </h3>
      
      <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2.5 terminal-scroll">
        {events.map((evt) => {
          const Icon = evt.icon;
          return (
            <div key={evt.id} className="flex items-start gap-3 text-[11px] font-mono leading-relaxed animate-fade-in">
              <span className="text-[#667085] select-none shrink-0">{evt.time}</span>
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${evt.color}`} />
              <span className="text-[#A8B2C1]">{evt.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(LiveEventFeed);
