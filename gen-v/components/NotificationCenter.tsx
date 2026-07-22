"use client";

import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertTriangle, Info, Clock, Trash2 } from "lucide-react";
import { useOSStore } from "@/lib/os-store";

interface NotificationItem {
  id: string;
  type: "info" | "success" | "warning" | "alert";
  title: string;
  message: string;
  timestamp: string;
  category: "System" | "Uploads" | "Publishing" | "Alerts";
  read: boolean;
}

export default function NotificationCenter({ onClose }: { onClose: () => void }) {
  const [activeFilter, setActiveFilter] = useState<"all" | "System" | "Uploads" | "Publishing" | "Alerts">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const setNotificationsCount = useOSStore((state) => state.setNotificationsCount);

  useEffect(() => {
    setNotifications([
      { id: "1", type: "success", title: "Render Completed", message: "Rendered scene-by-scene output for topic SRE Tips.", timestamp: new Date(Date.now() - 3 * 60000).toISOString(), category: "System", read: false },
      { id: "2", type: "success", title: "Publish Completed", message: "Successfully pushed Llama Tips short to YouTube.", timestamp: new Date(Date.now() - 10 * 60000).toISOString(), category: "Publishing", read: false },
      { id: "3", type: "alert", title: "Provider Offline", message: "Universal AI Router detected Gemini API is unresponsive.", timestamp: new Date(Date.now() - 35 * 60000).toISOString(), category: "Alerts", read: false },
      { id: "4", type: "warning", title: "Quota Exceeded Limit", message: "Cloudinary transform quota exceeds 75% threshold.", timestamp: new Date(Date.now() - 60 * 60000).toISOString(), category: "Alerts", read: false },
      { id: "5", type: "info", title: "Workflow Started", message: "Initiated DAG scheduler flow for Quiz Engine.", timestamp: new Date(Date.now() - 120 * 60000).toISOString(), category: "System", read: true },
      { id: "6", type: "alert", title: "Workflow Failed", message: "Scene Renderer failed rendering Scene 3.", timestamp: new Date(Date.now() - 180 * 60000).toISOString(), category: "System", read: false },
    ]);
  }, []);

  const filtered = notifications.filter(
    (n) => activeFilter === "all" || n.category === activeFilter
  );

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "alert": return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotificationsCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setNotificationsCount(0);
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in text-xs">
      <div className="px-4 py-3 border-b border-zinc-850 flex items-center justify-between bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-zinc-200">Alert Center</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={markAllRead} 
            className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold"
          >
            Mark Read
          </button>
          <button 
            onClick={clearAll} 
            className="text-[10px] text-zinc-550 hover:text-rose-400 font-semibold flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
          <button onClick={onClose} className="text-zinc-550 hover:text-zinc-350">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="px-3 py-2 border-b border-zinc-850 bg-zinc-950/20 flex flex-wrap gap-1">
        {(["all", "System", "Uploads", "Publishing", "Alerts"] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${activeFilter === filter ? "bg-zinc-850 text-emerald-400" : "text-zinc-500 hover:text-zinc-350"}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="max-h-64 overflow-y-auto terminal-scroll divide-y divide-zinc-850">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 font-medium font-mono">
            No notifications.
          </div>
        ) : (
          filtered.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-3 flex items-start gap-3 hover:bg-zinc-850/30 transition-colors ${!notif.read ? "bg-zinc-950/20" : ""}`}
            >
              <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-200 truncate">{notif.title}</span>
                  {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5">{notif.message}</p>
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 mt-1.5 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span>·</span>
                  <span className="uppercase text-[8px] font-bold text-zinc-650">{notif.category}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
