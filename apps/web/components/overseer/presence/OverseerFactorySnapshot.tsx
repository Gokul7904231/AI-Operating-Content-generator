"use client";

import React, { memo } from "react";
import { Layers, Users, ShieldAlert, Target, ArrowRight } from "lucide-react";
import type { FactoryMetrics } from "./OverseerMetricsHUD";
import type { DisclosurePanel } from "./OverseerProgressiveDisclosure";

interface OverseerFactorySnapshotProps {
  metrics: FactoryMetrics;
  onOpenPanel: (panel: DisclosurePanel) => void;
  accentColor?: string;
  className?: string;
}

export const OverseerFactorySnapshot: React.FC<OverseerFactorySnapshotProps> = memo(({
  metrics,
  onOpenPanel,
  accentColor = "#1677FF",
  className = "",
}) => {
  const isHealthy = metrics.activeCasesCount === 0 && metrics.factoryStatus === "ONLINE";

  return (
    <div
      className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-[#0A1220] border border-white/[0.08] shadow-sm select-none transition-all ${className}`}
      role="region"
      aria-label="Factory Status Overview"
    >
      {/* 1. Panel Header & Overall Health Score */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#667085] font-bold">
            FACTORY STATUS
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight ${
              isHealthy
                ? "bg-[#19C37D]/10 text-[#19C37D] border border-[#19C37D]/20"
                : "bg-[#F5B942]/10 text-[#F5B942] border border-[#F5B942]/20"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isHealthy ? "bg-[#19C37D] animate-pulse" : "bg-[#F5B942]"
              }`}
            />
            {isHealthy ? "HEALTHY" : metrics.factoryStatus}
          </span>
        </div>

        {/* Big Health Number */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-[#F5F7FA]">
            {metrics.factoryHealthPercent.toFixed(1)}%
          </span>
          <span className="text-xs text-[#A8B2C1] font-medium">
            System Integrity
          </span>
        </div>

        {/* 2. Structured Compact Telemetry Rows */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
          <div className="flex items-center justify-between text-[#F5F7FA]">
            <span className="flex items-center gap-1.5 text-[#A8B2C1]">
              <Layers className="w-3.5 h-3.5 text-[#667085]" />
              <span>Floors</span>
            </span>
            <span className="font-semibold text-[#F5F7FA]">
              {metrics.onlineFloorsCount} / {metrics.totalFloorsCount}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#F5F7FA]">
            <span className="flex items-center gap-1.5 text-[#A8B2C1]">
              <Users className="w-3.5 h-3.5 text-[#667085]" />
              <span>Workers</span>
            </span>
            <span className="font-semibold text-[#F5F7FA]">
              {metrics.healthyWorkersCount} / {metrics.totalWorkersCount}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#F5F7FA]">
            <span className="flex items-center gap-1.5 text-[#A8B2C1]">
              <ShieldAlert className="w-3.5 h-3.5 text-[#667085]" />
              <span>Cases</span>
            </span>
            <span className={metrics.activeCasesCount > 0 ? "font-bold text-[#F5B942]" : "font-semibold text-[#F5F7FA]"}>
              {metrics.activeCasesCount}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#F5F7FA]">
            <span className="flex items-center gap-1.5 text-[#A8B2C1]">
              <Target className="w-3.5 h-3.5 text-[#667085]" />
              <span>Missions</span>
            </span>
            <span className="font-semibold text-[#F5F7FA]">{metrics.activeMissionsCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Telemetry Drawer Action */}
      <button
        type="button"
        onClick={() => onOpenPanel("floors")}
        className="mt-3 w-full py-1.5 px-2.5 rounded-xl bg-[#0E1728] hover:bg-[#121E32] border border-white/[0.08] text-[11px] font-sans font-medium text-[#F5F7FA] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <span>Telemetry Details</span>
        <ArrowRight className="w-3 h-3 text-[#667085]" />
      </button>
    </div>
  );
});

OverseerFactorySnapshot.displayName = "OverseerFactorySnapshot";
