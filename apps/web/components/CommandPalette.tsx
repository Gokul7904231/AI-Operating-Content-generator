"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Terminal, ArrowRight, Play, ListOrdered, HardDrive, Bot, HelpCircle, FileCode } from "lucide-react";
import { useOSStore } from "@/lib/os-store";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: React.ComponentType<any>;
  action: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const isOpen = useOSStore((state) => state.commandPaletteOpen);
  const setOpen = useOSStore((state) => state.setCommandPaletteOpen);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global Ctrl + K / Cmd + K key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!isOpen);
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setOpen]);

  // Define commands
  const commands: CommandItem[] = [
    // Navigation
    { id: "nav-dash", title: "Go to Mission Control", subtitle: "Open system dashboard", category: "Navigation", icon: Terminal, action: () => { router.push("/dashboard"); setOpen(false); } },
    { id: "nav-jobs", title: "Go to Job Board", subtitle: "View all history & running tasks", category: "Navigation", icon: ListOrdered, action: () => { router.push("/factory/jobs"); setOpen(false); } },
    { id: "nav-workers", title: "Go to Worker Status", subtitle: "Observe queues and dead letters", category: "Navigation", icon: Terminal, action: () => { router.push("/dashboard/workers"); setOpen(false); } },
    { id: "nav-drive", title: "Go to Google Drive Browser", subtitle: "Inspect files & cleanup status", category: "Navigation", icon: HardDrive, action: () => { router.push("/media/drive"); setOpen(false); } },
    { id: "nav-ai", title: "Go to AI Providers", subtitle: "Benchmark and model health", category: "Navigation", icon: Bot, action: () => { router.push("/ai/providers"); setOpen(false); } },

    // Engines
    { id: "eng-quiz", title: "Generate Quiz Video", subtitle: "Create quiz script & assets", category: "Engines", icon: HelpCircle, action: () => { router.push("/engines/quiz"); setOpen(false); } },
    { id: "eng-story", title: "Generate Story Video", subtitle: "Create visual stories", category: "Engines", icon: FileCode, action: () => { router.push("/engines/story"); setOpen(false); } },
    { id: "eng-news", title: "Generate News Video", subtitle: "Synthesize current updates", category: "Engines", icon: Play, action: () => { router.push("/engines/news"); setOpen(false); } },

    // System Settings
    { id: "sys-rotation", title: "Rotate Service Account Key", subtitle: "Zero-downtime hot swap", category: "System", icon: Bot, action: () => { router.push("/settings"); setOpen(false); } },
  ];

  // Filter commands
  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[50vh]"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 border-b border-zinc-800 h-12">
              <Search className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-0 outline-none text-zinc-200 text-xs placeholder-zinc-500"
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950 font-mono text-[9px] text-zinc-500">
                ESC
              </kbd>
            </div>

            {/* Suggestions list */}
            <div className="flex-1 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                  No commands found matching "{query}"
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-zinc-800 text-zinc-100"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-emerald-400" : "text-zinc-500"}`} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold leading-none">{item.title}</div>
                            <div className="text-[10px] text-zinc-500 mt-1 leading-none truncate">{item.subtitle}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-500 uppercase tracking-wider font-mono">
                            {item.category}
                          </span>
                          {isSelected && <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer help */}
            <div className="px-4 py-2 bg-zinc-950/60 border-t border-zinc-800/40 text-[9px] text-zinc-600 font-mono flex justify-between items-center select-none">
              <span>↑↓ to navigate • Enter to select • Esc to close</span>
              <span>ShortsFactory OS</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
