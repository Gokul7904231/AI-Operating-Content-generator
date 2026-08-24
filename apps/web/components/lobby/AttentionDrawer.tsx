"use client";

import React, { useState } from "react";
import { useLobbyStore } from "@/lib/lobby/mock-state";
import { X, AlertTriangle, ShieldAlert, CheckCircle2, Wrench, ArrowRight } from "lucide-react";

export default function AttentionDrawer() {
  const { factoryState, isAttentionDrawerOpen, setAttentionDrawerOpen, resolveAttentionItem } = useLobbyStore();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (!isAttentionDrawerOpen) return null;

  const activeAttentionItems = factoryState.attention.filter((a) => !a.resolved);

  const handleResolve = (id: string) => {
    setResolvingId(id);
    setTimeout(() => {
      resolveAttentionItem(id);
      setResolvingId(null);
      if (activeAttentionItems.length <= 1) {
        setAttentionDrawerOpen(false);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full p-6 overflow-y-auto flex flex-col justify-between shadow-2xl font-mono">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wide">
                  ATTENTION REQUIRED
                </h2>
                <p className="text-xs text-zinc-500">
                  {activeAttentionItems.length} active factory issue requires intervention
                </p>
              </div>
            </div>
            <button
              onClick={() => setAttentionDrawerOpen(false)}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {activeAttentionItems.length === 0 ? (
            <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-100">All Anomaly Alerts Resolved</h3>
              <p className="text-xs text-zinc-400">
                Factory status restored to NORMAL. Production pipelines are operating smoothly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAttentionItems.map((item) => (
                <div key={item.id} className="p-4 bg-red-950/20 border border-red-500/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold text-[10px] uppercase border border-red-500/40">
                      {item.priority} · {item.id}
                    </span>
                    <span className="text-[10px] text-zinc-500">{item.timestamp}</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{item.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1 font-sans">{item.description}</p>
                  </div>

                  <div className="p-2.5 bg-zinc-900/90 border border-zinc-850 rounded text-xs space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase">Suggested Action & Personnel</span>
                    <p className="text-amber-300 font-sans">{item.suggestedAction}</p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-400">
                      <span>Involved:</span>
                      {item.involvedRoles.map((r) => (
                        <span key={r} className="px-1.5 py-0.2 bg-zinc-950 rounded border border-zinc-800 text-zinc-300">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Resolve Prototype Action Button */}
                  <button
                    onClick={() => handleResolve(item.id)}
                    disabled={resolvingId === item.id}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    {resolvingId === item.id ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                        EXECUTING HEALER REPAIR ROUTINE...
                      </>
                    ) : (
                      <>
                        <Wrench className="w-3.5 h-3.5" />
                        AUTHORIZE REPAIR & RESUME PIPELINE
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={() => setAttentionDrawerOpen(false)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs text-zinc-300 font-mono transition-colors"
          >
            CLOSE INSPECTOR
          </button>
        </div>
      </div>
    </div>
  );
}
