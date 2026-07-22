import React from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import { Providers } from "../providers";
import QuickGenerateOverlay from "@/components/QuickGenerateOverlay";
import CommandPalette from "@/components/CommandPalette";
import "@/lib/core/ServiceRegistryInit";

export default function OSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 font-body-base overflow-hidden bg-glow select-none">
        {/* Expanded / Collapsible Left Navigation */}
        <Sidebar />

        {/* OS Frame Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <TopNav title="ShortFactory Command Center" />
          
          <main className="flex-1 overflow-y-auto p-6 md:p-8 terminal-scroll relative z-10">
            {children}
          </main>
        </div>

        {/* Global Quick Generate Spotlight Overlay */}
        <QuickGenerateOverlay />

        {/* Global Ctrl+K Command Palette */}
        <CommandPalette />
      </div>
    </Providers>
  );
}
