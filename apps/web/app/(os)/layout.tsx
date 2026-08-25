export const dynamic = 'force-dynamic';

import React from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import { Providers } from "../providers";
import GlobalOverlays from "@/components/GlobalOverlays";
import MobileBottomNav from "@/components/MobileBottomNav";
// ServiceRegistryInit pulls sharp and better-sqlite3 transitively.
// Skip during production build and when executing under Cloudflare Workers.
if (process.env.NEXT_PHASE !== 'phase-production-build' && process.env.STORAGE_DRIVER !== 'cloudflare-worker') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/lib/core/ServiceRegistryInit");
}

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
          <TopNav />
          
          <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-24 md:pb-8 terminal-scroll relative z-10 page-transition-entrance">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav (P0-10) — hidden on desktop */}
        <MobileBottomNav />

        {/* Global Quick Generate & Command Palette Overlays */}
        <GlobalOverlays />
      </div>
    </Providers>
  );
}
