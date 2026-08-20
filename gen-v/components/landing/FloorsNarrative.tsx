"use client";

import React from "react";
import { Layers } from "lucide-react";

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
    <section className="py-32 lg:py-40 bg-[#f5f5f7] border-t border-[#e8e8ed] select-none relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 space-y-12">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#e8e8ed] pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#e8e8ed] text-xs font-text text-[#0071e3] shadow-xs">
              <Layers className="w-3.5 h-3.5 text-[#0071e3]" />
              <span className="font-semibold tracking-wide uppercase">PRODUCTION PIPELINE FLOORS</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-apple-headline text-[#1d1d1f] font-display">
              7 Floor Architecture
            </h2>
          </div>
          <p className="text-sm font-text text-[#6e6e73] max-w-md leading-relaxed tracking-apple-body">
            Each floor performs specialized production tasks with independent automated verification gates.
          </p>
        </div>

        {/* Spatial Floor Cards Line */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {floors.map((fl) => (
            <div
              key={fl.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 apple-card-hover min-h-[190px] ${
                fl.isConceptual
                  ? "bg-white/60 border-[#e8e8ed] border-dashed opacity-80"
                  : "bg-white border-[#e8e8ed] shadow-xs hover:border-[#d2d2d7]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#86868b] font-bold mb-3 font-mono">
                  <span>FLOOR {fl.id}</span>
                  <span className="text-xs">{fl.isConceptual ? "◇" : "●"}</span>
                </div>
                <h3 className={`text-sm font-bold font-display tracking-tight ${fl.isConceptual ? "text-[#86868b]" : "text-[#1d1d1f]"}`}>
                  {fl.code}
                </h3>
                <p className="text-xs font-text text-[#6e6e73] mt-1.5 leading-relaxed">
                  {fl.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#f2f2f7]">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold font-text tracking-wider uppercase border ${
                  fl.isConceptual
                    ? "bg-[#f5f5f7] text-[#86868b] border-[#e8e8ed]"
                    : "bg-emerald-50 text-[#179E69] border-emerald-200"
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
