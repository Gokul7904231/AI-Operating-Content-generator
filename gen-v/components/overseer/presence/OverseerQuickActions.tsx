"use client";

import React, { memo } from "react";
import type { OverseerMode } from "./OverseerChat";

interface QuickActionItem {
  label: string;
  prompt: string;
  mode: OverseerMode;
}

interface OverseerQuickActionsProps {
  currentMode: OverseerMode;
  factoryStatus?: string;
  hasActiveIncidents?: boolean;
  hasActiveMissions?: boolean;
  onSelectAction: (prompt: string, mode: OverseerMode) => void;
  isLoading?: boolean;
  className?: string;
}

export const OverseerQuickActions: React.FC<OverseerQuickActionsProps> = memo(({
  currentMode,
  factoryStatus = "ONLINE",
  hasActiveIncidents = false,
  hasActiveMissions = false,
  onSelectAction,
  isLoading = false,
  className = "",
}) => {
  const getModeActions = (): QuickActionItem[] => {
    switch (currentMode) {
      case "CHAT":
        return [
          { label: "How is the factory?", prompt: "How is the factory and current floor health?", mode: "CHAT" },
          { label: "Explain Floor 03", prompt: "Explain Floor 03 asset realization status", mode: "CHAT" },
          { label: "What changed?", prompt: "What recent changes and anomalies occurred?", mode: "CHAT" },
        ];
      case "OPERATE":
        return [
          { label: "Operate Factory", prompt: "Operate the factory and run autonomous pipeline", mode: "OPERATE" },
          { label: "Pause Mission", prompt: "Pause active production missions", mode: "OPERATE" },
          { label: "Inspect Workers", prompt: "Inspect all worker statuses and health metrics", mode: "OPERATE" },
        ];
      case "RESEARCH":
        return [
          { label: "Research Trends", prompt: "Research trending short-form topics and viral formats", mode: "RESEARCH" },
          { label: "Research RLM", prompt: "Research RLM architecture optimization for video retrieval", mode: "RESEARCH" },
          { label: "Analyze Competition", prompt: "Analyze competitor video retention patterns", mode: "RESEARCH" },
        ];
      case "CREATE":
        return [
          { label: "Create Quiz Short", prompt: "Make a 30s quiz short about World History and Science", mode: "CREATE" },
          { label: "Create Documentary", prompt: "Create a 30s documentary short about Space Exploration", mode: "CREATE" },
          { label: "Create Explainer", prompt: "Make an educational explainer short about Artificial Intelligence", mode: "CREATE" },
        ];
      case "MONITOR":
        return [
          { label: "Watch Factory", prompt: "Watch global factory operations and floor telemetry", mode: "MONITOR" },
          { label: "Watch Floor 03", prompt: "Watch Floor 03 rendering buffer and socket metrics", mode: "MONITOR" },
          { label: "Watch Mission", prompt: "Watch the active mission execution DAG", mode: "MONITOR" },
        ];
      case "AUTOPILOT":
        return [
          { label: "Start Autopilot", prompt: "Engage full autonomous factory supervision loop", mode: "AUTOPILOT" },
          { label: "Mission Status", prompt: "Check autonomous mission status and milestone targets", mode: "AUTOPILOT" },
          { label: "Replan", prompt: "Replan DAG dependencies and optimize worker allocation", mode: "AUTOPILOT" },
        ];
      default:
        return [
          { label: "How is the factory?", prompt: "How is the factory performing?", mode: "CHAT" },
          { label: "Create Quiz Short", prompt: "Make a quiz short about Space", mode: "CREATE" },
          { label: "Research Trends", prompt: "Research trending video formats", mode: "RESEARCH" },
        ];
    }
  };

  const actions = getModeActions();

  return (
    <div className={`flex items-center justify-center gap-2 flex-wrap ${className}`}>
      {actions.map((action, idx) => (
        <button
          key={idx}
          type="button"
          disabled={isLoading}
          onClick={() => onSelectAction(action.prompt, action.mode)}
          className="text-xs font-sans font-medium px-3 py-1.5 rounded-full bg-[#0E1728] hover:bg-[#121E32] border border-white/[0.08] text-[#A8B2C1] hover:text-[#1677FF] hover:border-[#1677FF]/40 transition-all duration-150 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
});

OverseerQuickActions.displayName = "OverseerQuickActions";
