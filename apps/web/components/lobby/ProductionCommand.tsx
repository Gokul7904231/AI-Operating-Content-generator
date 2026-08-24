"use client";

import React, { useState } from "react";
import { useLobbyStore } from "@/lib/lobby/mock-state";
import { 
  ArrowRight, Play, UploadCloud, Link as LinkIcon, 
  FileText, History, Check, ShieldAlert
} from "lucide-react";

export default function ProductionCommand() {
  const { submitProductionInstruction } = useLobbyStore();
  const [topicInput, setTopicInput] = useState("");
  const [briefInput, setBriefInput] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<"standard" | "cinematic" | "explainer">("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const presetExamples = [
    "Create a 45-second short explaining quantum computing",
    "Turn this idea into a cinematic history short about Ancient Rome",
    "Create today's science short about deep sea creatures",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      submitProductionInstruction({
        topic: topicInput,
        brief: briefInput || `${selectedFormat.toUpperCase()} production brief`,
        type: selectedFormat,
      });
      setIsSubmitting(false);
      setTopicInput("");
      setBriefInput("");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3500);
    }, 300);
  };

  return (
    <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 md:p-6 relative overflow-hidden shadow-lg shadow-black/40">
      {/* Background subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h2 className="text-sm font-bold tracking-wider text-zinc-100 font-mono uppercase">
                PRODUCTION COMMAND
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Submit production instruction to the factory pipeline.
            </p>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
            <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
              TARGET: SHORT-FORM VIDEO
            </span>
          </div>
        </div>

        {/* Command Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="production-topic-input" className="block text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wide">
              What are we producing?
            </label>
            <div className="relative">
              <textarea
                id="production-topic-input"
                rows={2}
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Create a 45-second short explaining quantum computing password decryption..."
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg p-3 text-sm font-sans text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-all resize-none font-medium"
              />
            </div>
          </div>

          {/* Quick options / format selection */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-400 uppercase">Format:</span>
              {(["standard", "cinematic", "explainer"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setSelectedFormat(fmt)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono capitalize transition-all ${
                    selectedFormat === fmt
                      ? "bg-zinc-800 text-amber-400 border border-amber-500/40 font-semibold"
                      : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Submit Button */}
            {/* Recipe: RECIPES.md #FeedbackPress - Tactile scale(0.97) press feedback on primary CTA */}
            <button
              type="submit"
              disabled={!topicInput.trim() || isSubmitting}
              className={`px-5 py-2 rounded-lg font-mono text-xs font-semibold tracking-wide flex items-center justify-center gap-2 min-h-[44px] transition-[transform,background-color,border-color] duration-160 ease-out shadow-md ${
                topicInput.trim() && !isSubmitting
                  ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer active:scale-[0.97]"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  DISPATCHING TO FACTORY...
                </>
              ) : (
                <>
                  CREATE PRODUCTION
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Preset Prompt Suggestions / History */}
        <div className="pt-2 border-t border-zinc-850">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 mb-2">
            <History className="w-3 h-3 text-zinc-500" />
            <span>Recent Command Instructions:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {presetExamples.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTopicInput(preset)}
                className="px-2.5 py-1 rounded-md bg-zinc-950/80 hover:bg-zinc-850 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors text-left truncate max-w-md"
              >
                "{preset}"
              </button>
            ))}
          </div>
        </div>

        {/* Toast confirmation */}
        {showSuccessToast && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-mono text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Production instruction registered and queued into Floor 01.</span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase font-mono">PROTOTYPE SIMULATION</span>
          </div>
        )}
      </div>
    </section>
  );
}
