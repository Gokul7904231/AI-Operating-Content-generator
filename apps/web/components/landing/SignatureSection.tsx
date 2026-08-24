"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";

export default function SignatureSection() {
  return (
    <section className="py-36 lg:py-48 bg-[#f5f5f7] border-t border-[#e8e8ed] select-none relative overflow-hidden min-h-[85vh] flex flex-col justify-center">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[950px] h-[450px] bg-sky-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10 space-y-20">
        {/* Section Header */}
        <div className="text-center space-y-5 max-w-4xl mx-auto" data-reveal>
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#1677FF] text-xs font-text text-white shadow-xs">
            <BrandIcon className="w-4 h-4" />
            <span className="font-semibold tracking-wide">OPERATIONAL PARADIGM SHIFT</span>
          </div>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-apple-display text-[#1d1d1f] font-display leading-[1.05]">
            YOU DON'T OPERATE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0071e3] via-sky-600 to-indigo-600 font-semibold">
              THE FACTORY.
            </span>
          </h2>
          <p className="text-base sm:text-lg font-text text-[#6e6e73] tracking-apple-body max-w-2xl mx-auto">
            Give ShortForge the concept. The autonomous production system handles the scripting, voice synthesis, frame generation, timeline stitching, and compliance.
          </p>
        </div>

        {/* Visual Transformation Flow Diagram */}
        <div
          className="bg-white border border-[#e8e8ed] rounded-3xl p-10 sm:p-16 lg:p-20 relative overflow-hidden shadow-xl apple-card-hover"
          data-reveal
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center font-text">
            {/* Step 1: User / Idea */}
            <div className="p-8 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl text-center space-y-3 relative group hover:border-[#d2d2d7] transition-colors shadow-xs">
              <span className="text-xs text-[#86868b] uppercase tracking-widest font-bold">STEP 01</span>
              <h3 className="text-base font-display font-semibold text-[#1d1d1f]">YOUR IDEA</h3>
              <p className="text-xs text-[#6e6e73] font-text">Prompt, Topic, or Brief</p>
            </div>

            {/* Connector Arrow */}
            <div className="hidden md:flex justify-center text-[#86868b]">
              <ArrowRight className="w-6 h-6 text-[#0071e3] animate-pulse" />
            </div>

            {/* Step 2: ShortForge Engine */}
            <div className="p-9 bg-sky-50 border-2 border-[#0071e3]/40 rounded-2xl text-center space-y-3 relative shadow-xs">
              <span className="text-xs text-[#0071e3] font-bold uppercase tracking-widest">STEP 02</span>
              <h3 className="text-lg font-display font-semibold text-[#0071e3]">SHORTFORGE</h3>
              <p className="text-xs text-[#1d1d1f] font-text">Autonomous Orchestration</p>
            </div>

            {/* Connector Arrow */}
            <div className="hidden md:flex justify-center text-[#86868b]">
              <ArrowRight className="w-6 h-6 text-[#0071e3] animate-pulse" />
            </div>

            {/* Step 3: Finished Output */}
            <div className="p-8 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl text-center space-y-3 relative group hover:border-[#d2d2d7] transition-colors shadow-xs">
              <span className="text-xs text-[#34c759] font-bold uppercase tracking-widest">STEP 03</span>
              <h3 className="text-base font-semibold text-[#1d1d1f] font-display">FINISHED SHORT</h3>
              <p className="text-xs text-[#6e6e73] font-text">Rendered 9:16 Video</p>
            </div>
          </div>

          {/* Bottom Statement */}
          <div className="mt-10 pt-6 border-t border-[#e8e8ed] text-center font-text text-xs text-[#86868b]">
            <span>Result: Zero timeline keyframing · Zero manual audio slicing · Zero manual subtitle rendering</span>
          </div>
        </div>
      </div>
    </section>
  );
}
