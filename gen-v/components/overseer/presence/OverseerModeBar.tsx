"use client";

import React, { memo } from "react";
import { MessageSquare, Bot, Search, Video, Eye, Zap } from "lucide-react";
import type { OverseerMode } from "./OverseerChat";

interface OverseerModeBarProps {
  currentMode: OverseerMode;
  onModeChange: (mode: OverseerMode) => void;
  className?: string;
}

export const OVERSEER_MODES: {
  id: OverseerMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "CHAT", label: "Chat", description: "Operational questions & explanations", icon: MessageSquare },
  { id: "OPERATE", label: "Operate", description: "Factory swarm orchestration", icon: Bot },
  { id: "RESEARCH", label: "Research", description: "Agent-Reach intelligence analysis", icon: Search },
  { id: "CREATE", label: "Create", description: "Quiz & short-form video pipelines", icon: Video },
  { id: "MONITOR", label: "Monitor", description: "Live telemetry stream", icon: Eye },
  { id: "AUTOPILOT", label: "Autopilot", description: "Autonomous background supervision", icon: Zap },
];

export const OverseerModeBar: React.FC<OverseerModeBarProps> = memo(({
  currentMode,
  onModeChange,
  className = "",
}) => {
  return (
    <div
      role="tablist"
      aria-label="Overseer Operating Modes"
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-[#070D18] border border-white/[0.08] shadow-xs select-none max-w-full overflow-x-auto ${className}`}
    >
      {OVERSEER_MODES.map((m) => {
        const Icon = m.icon;
        const isActive = currentMode === m.id;
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onModeChange(m.id)}
            title={`${m.label}: ${m.description}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold transition-all duration-150 cursor-pointer select-none ${
              isActive
                ? "bg-[#1677FF] text-white shadow-xs"
                : "text-[#A8B2C1] hover:text-[#F5F7FA] hover:bg-[#121E32]"
            }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
});

OverseerModeBar.displayName = "OverseerModeBar";
