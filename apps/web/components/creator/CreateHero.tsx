"use client";

import React from "react";
import { Play, Eye } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { useOSStore } from "@/lib/os-store";

interface CreateHeroProps {
  onSampleClick?: () => void;
}

export default function CreateHero({ onSampleClick }: CreateHeroProps) {
  const setOpen = useOSStore((s) => s.setQuickGenerateOpen);

  return (
    <section
      data-testid="create-hero"
      className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#0A1220] p-6 sm:p-8 shadow-sm"
    >
      <div className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1677FF]/10 border border-[#1677FF]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1677FF]">
            <BrandIcon className="h-3 w-3" />
            Creator workspace
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#111827] dark:text-[#F5F7FA]">
            Create your first short
          </h2>
          <p className="text-sm text-[#667085] dark:text-[#A8B2C1] max-w-2xl">
            Turn an idea into a finished video. Enter a topic, review the AI draft, and render — real progress, one canonical library.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            data-testid="create-hero-cta"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#1677FF] px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-[#0F63D8] active:scale-[0.98] transition-all cursor-pointer"
          >
            <BrandIcon className="h-4 w-4" variant="white" />
            Create Video
          </button>

          <button
            data-testid="create-hero-sample"
            onClick={() => {
              if (onSampleClick) onSampleClick();
              else setOpen(true);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-black/[0.03] dark:bg-[#0E1728] border border-black/[0.06] dark:border-white/[0.08] px-4 py-3 text-sm font-semibold text-[#111827] dark:text-[#F5F7FA] hover:bg-black/[0.06] dark:hover:bg-[#142238] transition-colors cursor-pointer"
          >
            <Play className="h-4 w-4 text-[#1677FF]" />
            Try sample: Geography Quiz (1-click)
            <span className="ml-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Sample
            </span>
          </button>

          <a
            href="/media/library"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[#667085] hover:text-[#111827] dark:hover:text-[#F5F7FA] transition-colors"
          >
            <Eye className="h-4 w-4" />
            View library
          </a>
        </div>

        <p className="text-[11px] text-[#667085] dark:text-[#A8B2C1]">
          Sample is a preview asset only — not counted in quota or delivery.{" "}
          <span className="font-semibold text-[#1677FF]">SAMPLE</span> badge marks it wherever shown.
        </p>
      </div>
    </section>
  );
}
