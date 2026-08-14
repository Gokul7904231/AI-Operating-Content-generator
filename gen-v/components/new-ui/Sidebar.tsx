"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  Share2,
  Cpu,
  Folder,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/new-ui/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new-ui/factory", label: "Factory Pipeline", icon: Film },
  { href: "/new-ui/publishing", label: "Publishing", icon: Share2 },
  { href: "/new-ui/engines", label: "AI Engines", icon: Cpu },
  { href: "/new-ui/library", label: "Media Library", icon: Folder },
  { href: "/new-ui/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/new-ui/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  /* Recipe: RECIPES.md #CompositorTransformCollapse - Fixed width isolation with GPU transform */
  return (
    <aside
      className={`h-screen bg-white border-r border-[#e8e8ed] flex flex-col justify-between select-none relative z-30 transition-[width,transform] duration-200 ease-out shadow-sm ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Top Nav List */}
      <div className="p-3">
        {/* Toggle Collapse */}
        <div className="flex items-center justify-between mb-4 px-2">
          {!collapsed && (
            <span className="text-[11px] font-mono text-[#86868b] uppercase tracking-widest font-bold">
              Navigation
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-[#86868b] hover:text-[#1d1d1f] rounded-md hover:bg-[#f2f2f7] transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Links */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 font-bold"
                    : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f2f2f7]"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#0071e3]" : "text-[#86868b]"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Footer */}
      <div className="p-3 border-t border-[#e8e8ed]">
        {!collapsed ? (
          <div className="p-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#6e6e73] font-mono font-semibold">Engine Nodes</span>
              <span className="text-[#34c759] font-mono font-bold">ONLINE</span>
            </div>
            <div className="w-full h-1 bg-[#e8e8ed] rounded-full overflow-hidden">
              <div className="h-full bg-[#34c759] w-full" />
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#34c759]" />
          </div>
        )}
      </div>
    </aside>
  );
}
