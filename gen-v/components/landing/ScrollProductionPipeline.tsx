"use client";

import React, { useState } from "react";
import { 
  Sparkles, FileText, Palette, Film, Layers, CheckCircle2, ChevronRight, Activity 
} from "lucide-react";

export default function ScrollProductionPipeline() {
  const [activeStage, setActiveStage] = useState<number>(1);

  const stages = [
    {
      id: 0,
      code: "00",
      name: "IDEA",
      title: "Natural Concept Brief",
      desc: "User inputs a topic, script brief, or raw idea. No timelines or complex keyframing required.",
      output: "Raw Creative Request",
    },
    {
      id: 1,
      code: "01",
      name: "STRATEGY",
      title: "Audience & Trend Intelligence",
      desc: "Analyzes niche vectors, target retention curves, and optimal pacing strategy.",
      output: "Production Blueprint",
    },
    {
      id: 2,
      code: "02",
      name: "SCRIPT",
      title: "Scripting & Narrative Synthesis",
      desc: "Generates hook-optimized narration script with precise word-level timestamps and pauses.",
      output: "Timed Script Contract",
    },
    {
      id: 3,
      code: "03",
      name: "SCENES",
      title: "Asset Specification & Realization",
      desc: "Constructs scene visual prompts, B-roll timing, and ElevenLabs high-fidelity voice audio.",
      output: "Scene & Voice Assets",
    },
    {
      id: 4,
      code: "04",
      name: "MEDIA",
      title: "Physical Media Synthesis",
      desc: "GPU-accelerated rendering cluster generates 60fps vertical frames, visual effects, and sound sync.",
      output: "Frame & Audio Stems",
    },
    {
      id: 5,
      code: "05",
      name: "ASSEMBLY",
      title: "Timeline Composition & Burning",
      desc: "Remotion engine stitches scenes, burns animated subtitles, and performs final color normalization.",
      output: "Stitched Timeline",
    },
    {
      id: 6,
      code: "07",
      name: "READY",
      title: "Compliance & Integrity Verification",
      desc: "Automated copyright check and policy compliance scan before outbox delivery.",
      output: "Verified MP4 Short",
    },
  ];

  return (
    <section id="how-it-works" className="py-36 lg:py-44 bg-white border-t border-[#e8e8ed] select-none relative overflow-hidden min-h-[85vh] flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 space-y-16">
        
        {/* Section Header */}
        <div className="text-center space-y-5 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#f5f5f7] border border-[#e8e8ed] text-xs font-text text-[#0071e3] shadow-sm">
            <Activity className="w-4 h-4" />
            <span className="font-semibold tracking-wide">AUTONOMOUS PRODUCTION SEQUENCE</span>
          </div>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-apple-headline text-[#1d1d1f] font-display leading-[1.05]">
            A production system, <br />
            <span className="text-[#86868b] font-light">not another video editor.</span>
          </h2>
          <p className="text-base sm:text-lg font-text text-[#6e6e73] tracking-apple-body max-w-2xl mx-auto">
            Watch how a raw concept progresses through specialized factory stages automatically.
          </p>
        </div>

        {/* Pipeline Stage Selector Pills */}
        <div className="overflow-x-auto pb-3 scrollbar-none">
          <div className="flex items-center justify-between min-w-[950px] gap-3 p-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl shadow-sm">
            {stages.map((stage, idx) => {
              const isActive = activeStage === idx;
              return (
                <button
                  key={stage.name}
                  onClick={() => setActiveStage(idx)}
                  className={`flex-1 py-4 px-4 rounded-xl font-text text-xs sm:text-sm transition-[background-color,border-color,color] duration-160 ease-out text-center flex flex-col items-center justify-center gap-1.5 border min-h-[56px] cursor-pointer ${
                    isActive
                      ? "bg-[#0071e3] border-[#0071e3] text-white font-semibold shadow-md"
                      : "bg-white border-[#e8e8ed] text-[#6e6e73] hover:text-[#1d1d1f] hover:border-[#d2d2d7]"
                  }`}
                >
                  <span className={`text-[10px] font-bold ${isActive ? "text-sky-100" : "text-[#86868b]"}`}>{stage.code}</span>
                  <span className="truncate w-full font-semibold">{stage.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Detail Card */}
        <div className="bg-white border border-[#e8e8ed] rounded-3xl p-8 sm:p-14 lg:p-16 relative overflow-hidden shadow-xl apple-card-hover">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* Left: Stage Information */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] font-text text-xs font-bold">
                  STAGE {stages[activeStage].code}
                </span>
                <span className="text-xs font-text text-[#86868b] uppercase tracking-widest font-semibold">
                  {stages[activeStage].name} PIPELINE
                </span>
              </div>

              <h3 className="text-2xl font-bold text-[#1d1d1f] font-display tracking-display">
                {stages[activeStage].title}
              </h3>

              <p className="text-sm font-text text-[#6e6e73] leading-relaxed">
                {stages[activeStage].desc}
              </p>

              <div className="pt-3 border-t border-[#e8e8ed] flex items-center justify-between font-text text-xs">
                <span className="text-[#86868b]">Stage Artifact Contract:</span>
                <span className="text-[#34c759] font-semibold">{stages[activeStage].output}</span>
              </div>
            </div>

            {/* Right: Visual Node Indicator */}
            <div className="md:col-span-5 flex justify-center">
              <div className="w-full max-w-sm p-6 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl space-y-3 font-text text-xs shadow-xs">
                <div className="flex items-center justify-between text-[#6e6e73] border-b border-[#e8e8ed] pb-2">
                  <span className="font-semibold">STAGE STATE</span>
                  <span className="text-[#34c759] font-bold">● ACTIVE</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#86868b]">Execution Mode:</span>
                    <span className="text-[#1d1d1f] font-semibold">Automated Worker</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#86868b]">Guardian Status:</span>
                    <span className="text-[#1d1d1f] font-semibold">Validation Passed</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#86868b]">Latency Budget:</span>
                    <span className="text-[#0071e3] font-semibold">Under Threshold</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
