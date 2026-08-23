"use client";

import React from "react";
import Link from "next/link";
import { Film, Sparkles, LucideIcon } from "lucide-react";
import { useOSStore } from "@/lib/os-store";

interface Action {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface CreatorEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  primaryAction: Action;
  secondaryAction?: Action;
}

export default function CreatorEmptyState({
  icon: Icon = Film,
  title,
  description,
  primaryAction,
  secondaryAction,
}: CreatorEmptyStateProps) {
  const toggleQuickGenerate = useOSStore((s) => s.toggleQuickGenerate);

  const renderAction = (action: Action, variant: "primary" | "secondary") => {
    const base =
      variant === "primary"
        ? "inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#1677FF] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0F63D8] active:scale-[0.98] shadow-xs transition-all cursor-pointer"
        : "inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-black/[0.03] dark:bg-[#0E1728] border border-black/[0.06] dark:border-white/[0.08] px-5 py-2.5 text-xs font-semibold text-[#111827] dark:text-[#F5F7FA] hover:bg-black/[0.06] dark:hover:bg-[#142238] transition-colors cursor-pointer";

    const content = (
      <>
        {variant === "primary" && <Sparkles className="h-4 w-4" />}
        <span>{action.label}</span>
      </>
    );

    if (action.href) {
      return (
        <Link key={action.label} href={action.href} className={base}>
          {content}
        </Link>
      );
    }
    // Default primary opens creator if no custom onClick
    const onClick = action.onClick ?? (variant === "primary" ? toggleQuickGenerate : undefined);
    return (
      <button key={action.label} onClick={onClick} className={base}>
        {content}
      </button>
    );
  };

  return (
    <div
      data-testid="creator-empty-state"
      className="col-span-full flex flex-col items-center justify-center gap-4 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#0A1220] p-10 text-center shadow-xs"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1677FF]/10 border border-[#1677FF]/20 text-[#1677FF]">
        <Icon className="h-7 w-7" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-bold text-[#111827] dark:text-[#F5F7FA]">{title}</h3>
        <p className="text-xs leading-relaxed text-[#667085] dark:text-[#A8B2C1]">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        {renderAction(primaryAction, "primary")}
        {secondaryAction && renderAction(secondaryAction, "secondary")}
      </div>
    </div>
  );
}
