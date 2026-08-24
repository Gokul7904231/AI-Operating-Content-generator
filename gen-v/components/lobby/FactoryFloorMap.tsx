"use client";

import React from "react";
import { useLobbyStore } from "@/lib/lobby/mock-state";
import { FloorStatus, FloorState } from "@/lib/lobby/types";
import { 
  CheckCircle2, Play, Pause, AlertTriangle, AlertOctagon, 
  HelpCircle, ChevronRight, Layers, Lock, Activity
} from "lucide-react";

export default function FactoryFloorMap() {
  const { factoryState, selectedFloorId, selectFloor } = useLobbyStore();

  const getStateBadge = (floor: FloorStatus) => {
    if (floor.isConceptual) {
      return {
        label: "CONCEPTUAL",
        icon: <HelpCircle className="w-3 h-3 text-zinc-500" />,
        badgeStyle: "bg-zinc-950 border-zinc-800 text-zinc-500 border-dashed",
        shape: "◇",
      };
    }

    switch (floor.state) {
      case "WORKING":
        return {
          label: "WORKING",
          icon: <Play className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />,
          badgeStyle: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold",
          shape: "▲",
        };
      case "ERROR":
      case "BLOCKED":
        return {
          label: floor.state,
          icon: <AlertOctagon className="w-3 h-3 text-red-400" />,
          badgeStyle: "bg-red-500/10 border-red-500/40 text-red-400 font-bold animate-pulse",
          shape: "✖",
        };
      case "STANDBY":
        return {
          label: "STANDBY",
          icon: <Pause className="w-3 h-3 text-amber-400" />,
          badgeStyle: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          shape: "■",
        };
      case "READY":
      default:
        return {
          label: "READY",
          icon: <CheckCircle2 className="w-3 h-3 text-zinc-400" />,
          badgeStyle: "bg-zinc-900 border-zinc-700 text-zinc-300",
          shape: "●",
        };
    }
  };

  return (
    <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 relative overflow-hidden select-none">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-bold tracking-wider text-zinc-100 font-mono uppercase">
              LIVE FACTORY FLOOR MAP
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Spatial production line architecture (Floors 01 – 07)
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-zinc-500">Click any floor to inspect personnel & logs</span>
        </div>
      </div>

      {/* Spatial Factory Line (Horizontal Layout on Desktop / Scrollable on Mobile) */}
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800">
        <div className="min-w-[980px] flex items-stretch gap-2 py-2">
          {factoryState.floors.map((floor, idx) => {
            const badge = getStateBadge(floor);
            const isSelected = selectedFloorId === floor.id;
            const isLast = idx === factoryState.floors.length - 1;

            return (
              <React.Fragment key={floor.id}>
                {/* Floor Card */}
                {/* Recipe: RECIPES.md #SelectionScaleHighlight - transform: scale(1.015) + border-color transition */}
                <div
                  onClick={() => selectFloor(floor.id)}
                  className={`flex-1 flex flex-col justify-between p-3.5 rounded-lg border transition-[transform,background-color,border-color] duration-180 ease-out cursor-pointer relative group ${
                    floor.isConceptual
                      ? "bg-zinc-950/40 border-zinc-800/60 border-dashed hover:border-zinc-700 opacity-75"
                      : isSelected
                      ? "bg-zinc-850 border-amber-500/60 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/20 scale-[1.015]"
                      : floor.hasAttention
                      ? "bg-red-950/20 border-red-500/40 hover:border-red-500/70"
                      : "bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80"
                  }`}
                >
                  {/* Top: Floor Number & Shape indicator */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[11px] font-mono font-bold text-zinc-400 tracking-wider">
                      FLOOR {floor.id}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {badge.shape}
                    </span>
                  </div>

                  {/* Middle: Short Name */}
                  <div className="my-1.5">
                    <h3 className={`text-xs font-mono font-bold tracking-tight line-clamp-2 ${
                      floor.isConceptual ? "text-zinc-500" : "text-zinc-100"
                    }`}>
                      {floor.shortCode}
                    </h3>
                    <p className="text-[10px] font-sans text-zinc-400 truncate mt-0.5" title={floor.name}>
                      {floor.name}
                    </p>
                  </div>

                  {/* Conceptual Overlay Notice for Floor 06 */}
                  {floor.isConceptual && (
                    <div className="my-1 py-1 px-1.5 bg-zinc-900/90 border border-zinc-800 rounded text-[9px] font-mono text-zinc-400 text-center">
                      NOT OPERATIONAL
                    </div>
                  )}

                  {/* Bottom: State Badge & Active Jobs */}
                  <div className="mt-3 pt-2 border-t border-zinc-850/60 flex items-center justify-between gap-1">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${badge.badgeStyle}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    {!floor.isConceptual && (
                      <span className="text-[10px] font-mono text-zinc-400">
                        {floor.activeJobCount} {floor.activeJobCount === 1 ? "job" : "jobs"}
                      </span>
                    )}
                  </div>

                  {/* Attention pulse badge */}
                  {floor.hasAttention && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-950 animate-ping" />
                  )}
                </div>

                {/* Spatial Connector Line */}
                {!isLast && (
                  <div className="flex items-center justify-center px-1 text-zinc-700 font-mono text-xs">
                    {idx === 4 ? (
                      <span className="text-zinc-600 tracking-tighter font-mono" title="Conceptual Boundary">
                        ┄►
                      </span>
                    ) : (
                      <span className="text-zinc-600 font-mono">
                        ─►
                      </span>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
