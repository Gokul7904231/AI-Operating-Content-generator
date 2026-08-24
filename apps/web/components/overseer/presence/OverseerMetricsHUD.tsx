"use client";

import React, { memo } from "react";
import { Activity, Target, ShieldAlert, Users, Layers } from "lucide-react";
import type { DisclosurePanel } from "./OverseerProgressiveDisclosure";

export interface FactoryMetrics {
  factoryHealthPercent: number;
  factoryStatus: "ONLINE" | "DEGRADED" | "CRITICAL" | "MAINTENANCE";
  activeMissionsCount: number;
  activeCasesCount: number;
  criticalCasesCount: number;
  healthyWorkersCount: number;
  totalWorkersCount: number;
  onlineFloorsCount: number;
  totalFloorsCount: number;
  activeRepairsCount: number;
}

interface OverseerMetricsHUDProps {
  metrics: FactoryMetrics;
  onOpenPanel: (panel: DisclosurePanel) => void;
  accentColor?: string;
  className?: string;
}

export const OverseerMetricsHUD: React.FC<OverseerMetricsHUDProps> = memo(({
  metrics,
  onOpenPanel,
  accentColor = "#1677FF",
  className = "",
}) => {
  const isHealthy = metrics.activeCasesCount === 0 && metrics.factoryStatus === "ONLINE";

  return (
    <div
      className={`w-full max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 p-2 rounded-2xl bg-[#0A1220] border border-white/[0.08] shadow-md transition-all ${className}`}
      role="region"
      aria-label="Factory Operational Telemetry HUD"
    >
      {/* 1. Factory Health */}
      <button
        type="button"
        onClick={() => onOpenPanel("floors")}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#070D18] hover:bg-[#121E32] border border-white/[0.06] transition-colors text-left cursor-pointer"
      >
        <div
          className={`p-1.5 rounded-lg ${
            isHealthy ? "bg-[#19C37D]/10 text-[#19C37D]" : "bg-[#F5B942]/10 text-[#F5B942]"
          }`}
        >
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#667085] block font-bold">
            Health
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-[#F5F7FA]">
              {metrics.factoryHealthPercent.toFixed(1)}%
            </span>
            <span
              className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${
                isHealthy
                  ? "bg-[#19C37D]/10 text-[#19C37D] border border-[#19C37D]/30"
                  : "bg-[#F5B942]/10 text-[#F5B942] border border-[#F5B942]/30"
              }`}
            >
              {metrics.factoryStatus}
            </span>
          </div>
        </div>
      </button>

      {/* 2. Missions */}
      <button
        type="button"
        onClick={() => onOpenPanel("missions")}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#070D18] hover:bg-[#121E32] border border-white/[0.06] transition-colors text-left cursor-pointer"
      >
        <div className="p-1.5 rounded-lg bg-[#1677FF]/10 text-[#1677FF]">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#667085] block font-bold">
            Missions
          </span>
          <span className="text-xs font-mono font-bold text-[#F5F7FA]">
            {metrics.activeMissionsCount} Active
          </span>
        </div>
      </button>

      {/* 3. Cases */}
      <button
        type="button"
        onClick={() => onOpenPanel("cases")}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#070D18] hover:bg-[#121E32] border border-white/[0.06] transition-colors text-left cursor-pointer"
      >
        <div
          className={`p-1.5 rounded-lg ${
            metrics.criticalCasesCount > 0
              ? "bg-[#FF5A67]/10 text-[#FF5A67]"
              : metrics.activeCasesCount > 0
              ? "bg-[#F5B942]/10 text-[#F5B942]"
              : "bg-[#19C37D]/10 text-[#19C37D]"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#667085] block font-bold">
            Cases
          </span>
          <span className="text-xs font-mono font-bold text-[#F5F7FA]">
            {metrics.activeCasesCount} Open
          </span>
        </div>
      </button>

      {/* 4. Workers */}
      <button
        type="button"
        onClick={() => onOpenPanel("floors")}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#070D18] hover:bg-[#121E32] border border-white/[0.06] transition-colors text-left cursor-pointer"
      >
        <div className="p-1.5 rounded-lg bg-[#4D8DFF]/10 text-[#4D8DFF]">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#667085] block font-bold">
            Workers
          </span>
          <span className="text-xs font-mono font-bold text-[#F5F7FA]">
            {metrics.healthyWorkersCount} / {metrics.totalWorkersCount}
          </span>
        </div>
      </button>

      {/* 5. Production Floors */}
      <button
        type="button"
        onClick={() => onOpenPanel("floors")}
        className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#070D18] hover:bg-[#121E32] border border-white/[0.06] transition-colors text-left cursor-pointer"
      >
        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#667085] block font-bold">
            Floors
          </span>
          <span className="text-xs font-mono font-bold text-[#F5F7FA]">
            {metrics.onlineFloorsCount} / {metrics.totalFloorsCount}
          </span>
        </div>
      </button>
    </div>
  );
});

OverseerMetricsHUD.displayName = "OverseerMetricsHUD";
