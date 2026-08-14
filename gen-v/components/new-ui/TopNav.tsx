"use client";

import React from "react";
import Link from "next/link";
import { Command, Film, Sparkles, User, Bell } from "lucide-react";
import { Button } from "./Button";

interface TopNavProps {
  title?: string;
  onOpenCommand?: () => void;
}

export function TopNav({
  title = "FactoryOS Command Center",
  onOpenCommand,
}: TopNavProps) {
  return (
    <header className="h-14 w-full bg-zinc-950/85 border-b border-zinc-800/80 px-4 md:px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-40 nle-glass-edge select-none">
      {/* Brand Identity & Title */}
      <div className="flex items-center gap-3">
        <Link href="/new-ui" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 transition-colors">
            <Film className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-zinc-100 tracking-tight font-sans">
            Factory<span className="text-amber-500">OS</span>
          </span>
        </Link>
        <span className="text-zinc-700 font-mono text-sm">/</span>
        <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-wider hidden sm:inline-block">
          {title}
        </h2>
      </div>

      {/* Center Command Palette Search Trigger */}
      <button
        onClick={onOpenCommand}
        className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-[4px] text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors btn-press-chip"
      >
        <div className="flex items-center gap-1.5">
          <Command className="w-3.5 h-3.5 text-zinc-500" />
          <span>Quick Command Palette...</span>
        </div>
        <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-500 rounded">
          ⌘K
        </kbd>
      </button>

      {/* Right User & Utility Controls */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
        </Button>
        <Link href="/new-ui/factory">
          <Button variant="primary" size="sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Short</span>
          </Button>
        </Link>
        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
