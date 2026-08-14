"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Film, Settings, BarChart3, X } from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open triggered externally or by state
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigate = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4 select-none">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-[6px] shadow-2xl overflow-hidden nle-glass-edge">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-zinc-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search workspace..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="p-2 space-y-1 max-h-80 overflow-y-auto nle-scroll">
          <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Quick Actions
          </div>
          <button
            onClick={() => navigate("/new-ui/factory")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-amber-400 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Create New Short Video
            </span>
            <kbd className="text-[10px] font-mono text-zinc-600">N</kbd>
          </button>
          <button
            onClick={() => navigate("/new-ui/dashboard")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-amber-400 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <Film className="w-4 h-4 text-zinc-500" /> Open Factory Command Center
            </span>
            <kbd className="text-[10px] font-mono text-zinc-600">D</kbd>
          </button>
          <button
            onClick={() => navigate("/new-ui/analytics")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-amber-400 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-zinc-500" /> View Render Telemetry
            </span>
            <kbd className="text-[10px] font-mono text-zinc-600">A</kbd>
          </button>
          <button
            onClick={() => navigate("/new-ui/settings")}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-amber-400 rounded transition-colors"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-500" /> System Integration Settings
            </span>
            <kbd className="text-[10px] font-mono text-zinc-600">S</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
