"use client";

import React from "react";
import dynamic from "next/dynamic";

const QuickGenerateOverlay = dynamic(() => import("@/components/QuickGenerateOverlay"), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/CommandPalette"), { ssr: false });

export default function GlobalOverlays() {
  return (
    <>
      <QuickGenerateOverlay />
      <CommandPalette />
    </>
  );
}
