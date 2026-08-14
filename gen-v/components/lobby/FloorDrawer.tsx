"use client";

import React from "react";
import { useLobbyStore } from "@/lib/lobby/mock-state";
import { X, Layers, Shield, Users, Activity, CheckCircle2, AlertOctagon, Pause, HelpCircle } from "lucide-react";

export default function FloorDrawer() {
  const { factoryState, selectedFloorId, selectFloor } = useLobbyStore();

  if (!selectedFloorId) return null;

  const floor = factoryState.floors.find((f) => f.id === selectedFloorId);
  if (!floor) return null;

  /* Recipe: RECIPES.md #AppleDrawerCurve - transform: translateX(100%->0) with cubic-bezier(0.32,0.72,0,1) */
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end transition-opacity duration-300 ease-out">
      <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full p-6 overflow-y-auto flex flex-col justify-between shadow-2xl font-mono transition-transform duration-320 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in slide-in-from-right">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
                  FLOOR {floor.id}
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  {floor.shortCode}
                </span>
              </div>
              <h2 className="text-lg font-bold text-zinc-100 mt-1">
                {floor.name}
              </h2>
            </div>
            <button
              onClick={() => selectFloor(null)}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conceptual Floor Special Notice */}
          {floor.isConceptual ? (
            <div className="p-4 bg-zinc-900 border border-zinc-800 border-dashed rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs uppercase">
                <HelpCircle className="w-4 h-4 text-zinc-500" />
                <span>ARCHITECTURAL STATUS: CONCEPTUAL</span>
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Floor 06 (Distribution & Publishing Preparation) is defined in the FactoryOS architectural spec, but its production worker routines are currently conceptual and not yet implemented.
              </p>
            </div>
          ) : (
            <>
              {/* Floor Overview */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-lg text-xs space-y-1">
                <span className="text-zinc-500 uppercase text-[10px]">Description</span>
                <p className="text-zinc-300 font-sans">{floor.description}</p>
              </div>

              {/* Contextual Personnel Hierarchy */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-850 pb-1.5">
                  Floor Personnel ({floor.personnel.workersCount + 3} Personnel)
                </h3>

                <div className="space-y-2 text-xs">
                  {/* Guardian */}
                  <div className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase">Guardian</span>
                      <p className="font-bold text-zinc-200">{floor.personnel.guardian.name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${
                      floor.personnel.guardian.status === "ERROR"
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    }`}>
                      {floor.personnel.guardian.status}
                    </span>
                  </div>

                  {/* Workers Count */}
                  <div className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase">Production Workers</span>
                      <p className="font-bold text-zinc-200">{floor.personnel.workersCount} active workers</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] border border-zinc-700 bg-zinc-950 text-zinc-400 font-bold">
                      ACTIVE
                    </span>
                  </div>

                  {/* Advisor */}
                  {floor.personnel.advisor && (
                    <div className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-md flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase">Advisor</span>
                        <p className="font-bold text-zinc-200">{floor.personnel.advisor.name}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] border border-zinc-700 bg-zinc-950 text-zinc-400 font-bold">
                        {floor.personnel.advisor.status}
                      </span>
                    </div>
                  )}

                  {/* Auditor */}
                  {floor.personnel.auditor && (
                    <div className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-md flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase">Auditor</span>
                        <p className="font-bold text-zinc-200">{floor.personnel.auditor.name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${
                        floor.personnel.auditor.status === "ERROR"
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}>
                        {floor.personnel.auditor.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Floor Activity */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-850 pb-1.5">
                  Recent Floor Activity
                </h3>
                <div className="space-y-1.5 text-xs text-zinc-400 font-mono">
                  {floor.recentActivity.map((log, idx) => (
                    <div key={idx} className="p-2 bg-zinc-900/40 border border-zinc-850 rounded text-[11px]">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={() => selectFloor(null)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs text-zinc-300 font-mono transition-colors"
          >
            CLOSE FLOOR INSPECTOR
          </button>
        </div>
      </div>
    </div>
  );
}
