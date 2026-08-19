import React from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import { Providers } from "../providers";
import GlobalOverlays from "@/components/GlobalOverlays";
import "@/lib/core/ServiceRegistryInit";

export default function OSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen w-full bg-[#F7F8FA] dark:bg-[#050A12] text-[#111827] dark:text-[#F5F7FA] font-sans overflow-hidden select-none transition-colors duration-200">
        {/* Expanded / Collapsible Left Navigation */}
        <Sidebar />

        {/* OS Frame Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <TopNav title="ShortFactory Command Center" />
          
          <main className="flex-1 overflow-y-auto p-6 md:p-8 terminal-scroll relative z-10 page-transition-entrance">
            {children}
          </main>
        </div>

        {/* Global Quick Generate & Command Palette Overlays */}
        <GlobalOverlays />
      </div>
    </Providers>
  );
}
