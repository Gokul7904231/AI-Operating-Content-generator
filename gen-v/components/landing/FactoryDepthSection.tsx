"use client";

import React from "react";
import { ShieldCheck, Cpu, Layers, CheckCircle2, Wrench, Activity } from "lucide-react";

export default function FactoryDepthSection() {
  return (
    <section id="architecture" className="py-36 lg:py-44 bg-[#f5f5f7] border-t border-[#e8e8ed] select-none relative min-h-[85vh] flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 space-y-16">
        
        {/* Section Header */}
        <div className="text-center space-y-5 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-[#e8e8ed] text-xs font-mono text-[#0071e3] shadow-sm">
            <Cpu className="w-4 h-4 text-[#0071e3]" />
            <span className="font-semibold tracking-wide">OPERATIONAL ARCHITECTURE</span>
          </div>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-apple-headline text-[#1d1d1f] font-display leading-[1.05]">
            BUILT LIKE A <br />
            <span className="text-[#86868b] font-light">PRODUCTION SYSTEM.</span>
          </h2>
          <p className="text-base sm:text-lg font-text text-[#6e6e73] tracking-apple-body max-w-2xl mx-auto">
            Underneath the simple interface lies a structured production engine with specialized guardians, validation gates, and rendering pipelines.
          </p>
        </div>

        {/* User-facing High-Level Flow */}
        <div className="p-6 sm:p-8 bg-white border border-[#e8e8ed] rounded-2xl font-text text-xs sm:text-sm flex flex-wrap items-center justify-between gap-4 text-[#1d1d1f] shadow-sm apple-card-hover">
          <div className="flex items-center gap-2.5">
            <span className="text-[#0071e3] font-bold">FLOW:</span>
            <span className="font-semibold">Orchestration</span>
          </div>
          <span className="text-[#86868b]">──►</span>
          <div className="font-semibold">Guardians</div>
          <span className="text-[#86868b]">──►</span>
          <div className="font-semibold">Specialized Workers</div>
          <span className="text-[#86868b]">──►</span>
          <div className="font-semibold">Validation</div>
          <span className="text-[#86868b]">──►</span>
          <div className="text-[#34c759] font-bold">Synthesis</div>
        </div>

        {/* Honest Capability Framing: Implemented vs Evolving Roadmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Column 1: Implemented Production Capabilities */}
          <div className="bg-white border border-[#e8e8ed] rounded-3xl p-8 sm:p-12 lg:p-14 space-y-6 shadow-sm apple-card-hover">
            <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
                <h3 className="text-sm font-display font-semibold text-[#1d1d1f] uppercase tracking-display">
                  IMPLEMENTED PRODUCTION CAPABILITIES
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#34c759] font-text text-[10px] font-bold">
                OPERATIONAL
              </span>
            </div>

            <div className="space-y-4 font-text text-xs text-[#1d1d1f]">
              <div className="p-4 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex justify-between font-bold text-[#1d1d1f]">
                  <span className="font-semibold">Guardian Quality Checks</span>
                  <span className="text-[#34c759] font-bold">ACTIVE</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                  Evaluates factual grounding, script coherence, and retention hook strength before media rendering.
                </p>
              </div>

              <div className="p-4 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex justify-between font-bold text-[#1d1d1f]">
                  <span className="font-semibold">Specialized Video Workers</span>
                  <span className="text-[#34c759] font-bold">ACTIVE</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                  FFmpeg & Remotion workers synthesize 60fps vertical frames, audio stems, and burned subtitles.
                </p>
              </div>

              <div className="p-4 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex justify-between font-bold text-[#1d1d1f]">
                  <span className="font-semibold">Google Drive Delivery Outbox</span>
                  <span className="text-[#34c759] font-bold">ACTIVE</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                  Idempotent delivery pipeline pushes completed short-form video artifacts directly to cloud outboxes.
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: Architectural & Evolving Roadmap */}
          <div className="bg-white border border-[#e8e8ed] rounded-3xl p-8 sm:p-12 lg:p-14 space-y-6 shadow-sm apple-card-hover">
            <div className="flex items-center justify-between border-b border-[#e8e8ed] pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#ff9500]" />
                <h3 className="text-sm font-display font-semibold text-[#1d1d1f] uppercase tracking-display">
                  ARCHITECTURAL & EVOLVING ROADMAP
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#ff9500] font-text text-[10px] font-bold">
                DESIGN & SPEC
              </span>
            </div>

            <div className="space-y-4 font-text text-xs text-[#1d1d1f]">
              <div className="p-4 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex justify-between font-bold text-[#1d1d1f]">
                  <span className="font-semibold">Automated Anomaly Repair</span>
                  <span className="text-[#ff9500] font-bold">IN DEVELOPMENT</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                  Healer & ReMaker agent routines for auto-detecting and re-rendering drifted frames.
                </p>
              </div>

              <div className="p-4 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex justify-between font-bold text-[#1d1d1f]">
                  <span className="font-semibold">Floor 06 Auto-Distribution</span>
                  <span className="text-[#86868b] font-bold">CONCEPTUAL</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                  Multi-platform posting to YouTube Shorts, TikTok, and Instagram Reels (spec stage).
                </p>
              </div>

              <div className="p-4 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl space-y-1.5 shadow-xs">
                <div className="flex justify-between font-bold text-[#1d1d1f]">
                  <span className="font-semibold">Unified Overseer Governance</span>
                  <span className="text-[#ff9500] font-bold">IN DEVELOPMENT</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                  Central intelligence monitoring across multi-cloud GPU render clusters.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
