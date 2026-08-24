"use client";

import React, { useState, useEffect, memo } from "react";
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

function NotificationCenter({ onClose }: { onClose: () => void }) {
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
      case "success": return <CheckCircle className="w-4 h-4 text-[#19C37D]" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-[#F5B942]" />;
      case "alert": return <AlertTriangle className="w-4 h-4 text-[#FF5A67]" />;
      default: return <Info className="w-4 h-4 text-[#1677FF]" />;
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
    <div className="absolute right-0 mt-2 w-80 bg-[#0A1220] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in text-xs">
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-[#070D18]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#1677FF]" />
          <span className="font-bold text-[#F5F7FA]">Alert Center</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={markAllRead} 
            className="text-[10px] text-[#A8B2C1] hover:text-[#F5F7FA] font-semibold cursor-pointer"
          >
            Mark Read
          </button>
          <button 
            onClick={clearAll} 
            className="text-[10px] text-[#FF5A67] hover:opacity-80 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
          <button onClick={onClose} aria-label="Close Alert Center" className="text-[#667085] hover:text-[#F5F7FA] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="px-3 py-2 border-b border-white/[0.06] bg-[#070D18]/60 flex flex-wrap gap-1">
        {(["all", "System", "Uploads", "Publishing", "Alerts"] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
              activeFilter === filter 
                ? "bg-[#1677FF] text-white" 
                : "text-[#667085] hover:text-[#F5F7FA] hover:bg-[#121E32]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="max-h-64 overflow-y-auto terminal-scroll divide-y divide-white/[0.06]">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[#667085] font-medium font-mono">
            No notifications.
          </div>
        ) : (
          filtered.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-3 flex items-start gap-3 hover:bg-[#121E32]/50 transition-colors ${!notif.read ? "bg-[#1677FF]/5" : ""}`}
            >
              <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#F5F7FA] truncate">{notif.title}</span>
                  {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-[#1677FF] shrink-0" />}
                </div>
                <p className="text-[10px] text-[#A8B2C1] leading-relaxed mt-0.5">{notif.message}</p>
                <div className="flex items-center gap-1.5 text-[9px] text-[#667085] mt-1.5 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span>·</span>
                  <span className="uppercase text-[8px] font-bold text-[#667085]">{notif.category}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(NotificationCenter);
