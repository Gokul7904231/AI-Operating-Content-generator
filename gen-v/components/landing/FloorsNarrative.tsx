"use client";

import React from "react";
import { Layers, HelpCircle, CheckCircle2, Play, Pause } from "lucide-react";

export default function FloorsNarrative() {
  const floors = [
    { id: "01", code: "STRATEGY", name: "Strategy & Intelligence", status: "OPERATIONAL", desc: "Niche vectors & hook planning" },
    { id: "02", code: "SCRIPT", name: "Scripting & Narrative", status: "OPERATIONAL", desc: "Script synthesis & pacing" },
    { id: "03", code: "ASSETS", name: "Asset Realization", status: "OPERATIONAL", desc: "Visual prompts & voice models" },
    { id: "04", code: "MEDIA", name: "Physical Media Synthesis", status: "OPERATIONAL", desc: "GPU rendering & audio sync" },
    { id: "05", code: "ASSEMBLY", name: "Timeline Composition", status: "OPERATIONAL", desc: "Remotion stitching & subtitles" },
    { id: "06", code: "DISTRIBUTION", name: "Distribution & Posting", status: "CONCEPTUAL", desc: "Not Operational (Design Spec)", isConceptual: true },
    { id: "07", code: "COMPLIANCE", name: "Content Integrity", status: "OPERATIONAL", desc: "Copyright & safety microservice" },
  ];

  return (
    <section className="py-24 bg-zinc-950 border-t border-zinc-900 select-none relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-bold tracking-wider text-zinc-100 font-mono uppercase">
                PRODUCTION PIPELINE FLOORS
              </h2>
            </div>
            <p className="text-2xl font-bold text-zinc-100 font-sans mt-1">
              7 Floor Architecture
            </p>
          </div>
          <p className="text-xs font-mono text-zinc-400 max-w-md">
            Each floor performs specialized production tasks with independent verification.
          </p>
        </div>

        {/* Spatial Floor Cards Line */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 font-mono">
          {floors.map((fl) => (
            <div
              key={fl.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                fl.isConceptual
                  ? "bg-zinc-950/40 border-zinc-800/80 border-dashed opacity-75"
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-bold mb-2">
                  <span>FLOOR {fl.id}</span>
                  <span>{fl.isConceptual ? "◇" : "▲"}</span>
                </div>
                <h3 className={`text-xs font-bold ${fl.isConceptual ? "text-zinc-500" : "text-zinc-100"}`}>
                  {fl.code}
                </h3>
                <p className="text-[10px] font-sans text-zinc-400 mt-1 line-clamp-2">
                  {fl.desc}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-zinc-850">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  fl.isConceptual
                    ? "bg-zinc-950 text-zinc-500 border-zinc-800"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}>
                  {fl.status}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
