"use client";

import React from "react";
import { useLobbyStore } from "@/lib/lobby/mock-state";
import { X, ShieldCheck, Radio, FileText, CheckCircle2, AlertTriangle, Layers } from "lucide-react";

export default function OverseerDrawer() {
  const { factoryState, isOverseerDrawerOpen, setOverseerDrawerOpen } = useLobbyStore();

  if (!isOverseerDrawerOpen) return null;

  const overseer = factoryState.overseer;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg bg-zinc-950 border-l border-zinc-800 h-full p-6 overflow-y-auto flex flex-col justify-between shadow-2xl font-mono">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wide">
                  OVERSEER REPORT & DECISION ENGINE
                </h2>
                <p className="text-xs text-zinc-500">
                  Audit Synchronized: {overseer.lastAuditTimestamp}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOverseerDrawerOpen(false)}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Operational Headline */}
          <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              OVERSEER STATUS BRIEFING
            </span>
            <p className="text-sm font-bold text-zinc-100">
              "{overseer.headline}"
            </p>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 text-xs">
              <span className="text-zinc-500">Governance Posture:</span>
              <span className="text-emerald-400 font-bold">AUTOMATED FAIL-SAFE ACTIVE</span>
            </div>
          </div>

          {/* Factory Governance Personnel Roles */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-850 pb-1.5">
              Factory-Wide Personnel Roles
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { role: "Overseer", status: "ONLINE", note: "Central Intelligence" },
                { role: "Comms Bus", status: "ACTIVE", note: "Inter-floor messaging" },
                { role: "Slayer", status: "MONITORING", note: "Anomaly detection" },
                { role: "Healer", status: "STANDBY", note: "Auto-repair routines" },
                { role: "ReMaker", status: "ACTIVE", note: "Render frame recovery" },
                { role: "Treasurer", status: "ONLINE", note: "Token/cost tracking" },
              ].map((p) => (
                <div key={p.role} className="p-2 bg-zinc-900/60 border border-zinc-850 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">{p.role}</span>
                    <span className="text-[9px] text-emerald-400 font-bold">{p.status}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{p.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Decisions Log */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-850 pb-1.5">
              Overseer Automated Decisions
            </h3>
            <div className="space-y-2">
              {overseer.recentDecisions.map((dec) => (
                <div key={dec.id} className="p-3 bg-zinc-900/50 border border-zinc-850 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{dec.id}</span>
                    <span>{dec.timestamp} · Actor: {dec.actor}</span>
                  </div>
                  <p className="text-zinc-200 font-sans">{dec.decision}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={() => setOverseerDrawerOpen(false)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs text-zinc-300 font-mono transition-colors"
          >
            DISMISS REPORT
          </button>
        </div>
      </div>
    </div>
  );
}
