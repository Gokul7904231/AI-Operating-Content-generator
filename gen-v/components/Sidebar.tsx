"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Factory, Cpu, Bot, FolderOpen, Share2,
  LineChart, Settings, ChevronDown, Hexagon, ChevronLeft,
  ChevronRight, ListOrdered, Loader2, Calendar, FileCode,
  GitBranch, HelpCircle, BookOpen, History, Code, Flame, Brain,
  MessageSquare, BookOpenText, Flag, Image as ImageIcon, Network,
  Boxes, Terminal, BarChart2, Activity, Film, Cloud, HardDrive,
  ArrowUpFromLine, Video, Camera, Map, Sparkles, Gauge, UserCheck,
  HeartPulse, ShoppingBag, Layers,
  LucideIcon
} from "lucide-react";
import { useOSStore } from "@/lib/os-store";
import { useFactoryStore } from "@/lib/factory-store";
import { ROUTE_SECTIONS, type RouteEntry } from "@/lib/core/RouteRegistry";

// Icon map — resolves string icon names from RouteRegistry to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Factory, Cpu, Bot, FolderOpen, Share2, LineChart, Settings,
  ListOrdered, Loader2, Calendar, FileCode, GitBranch, HelpCircle,
  BookOpen, History, Code, Flame, Brain, MessageSquare, BookOpenText,
  Flag, Image: ImageIcon, Network, Boxes, Terminal, BarChart2,
  Activity, Film, Cloud, HardDrive, ArrowUpFromLine, Video, Camera,
  Map, Sparkles, Gauge, UserCheck, LayoutDashboard, Hexagon,
  HeartPulse, ShoppingBag, Layers,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Activity;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarOpen = useOSStore((state) => state.sidebarOpen);
  const toggleSidebar = useOSStore((state) => state.toggleSidebar);
  const toggleQuickGenerate = useOSStore((state) => state.toggleQuickGenerate);

  const activeEngines = useFactoryStore((state) => state.activeEngines);
  const initSSE = useFactoryStore((state) => state.initSSE);
  const fetchState = useFactoryStore((state) => state.fetchState);

  useEffect(() => {
    initSSE();
    fetchState();
  }, [initSSE, fetchState]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(
      ROUTE_SECTIONS.map((s) => [s.id, ["factory", "engines"].includes(s.id)])
    )
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sidebarVariants = {
    open: { width: 240, transition: { duration: 0.2, ease: "easeInOut" as const } },
    collapsed: { width: 64, transition: { duration: 0.2, ease: "easeInOut" as const } },
  };

  return (
    <motion.nav
      initial={sidebarOpen ? "open" : "collapsed"}
      animate={sidebarOpen ? "open" : "collapsed"}
      variants={sidebarVariants}
      className="bg-zinc-950 border-r border-zinc-900 flex flex-col h-screen sticky top-0 flex-shrink-0 z-50 overflow-hidden"
    >
      {/* Brand */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-900 h-16">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden select-none">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Hexagon className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
          </div>
          {sidebarOpen && (
            <span className="text-sm font-bold text-zinc-50 tracking-tight whitespace-nowrap">
              ShortsFactory <span className="text-[10px] text-emerald-400 font-normal">OS</span>
            </span>
          )}
        </Link>
        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-900"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Generate Trigger */}
      <div className="p-3 border-b border-zinc-900">
        <button
          onClick={toggleQuickGenerate}
          className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            sidebarOpen
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 shadow-md hover:opacity-90 active:scale-[0.98]"
              : "bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-zinc-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {sidebarOpen && <span>Quick Generate</span>}
        </button>
      </div>

      {/* Navigation Areas */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 terminal-scroll select-none">
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          onMouseEnter={() => router.prefetch("/dashboard")}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-xs font-semibold ${
            pathname === "/dashboard"
              ? "bg-zinc-900 text-emerald-400"
              : "text-zinc-400 hover:text-zinc-150 hover:bg-zinc-900/50"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span>Dashboard</span>}
        </Link>

        {/* Dynamic Sections from RouteRegistry */}
        {ROUTE_SECTIONS.map((section) => {
          const SectionIcon = getIcon(section.icon);
          const isExpanded = expandedSections[section.id];
          
          // Dynamically compute the sub-routes to include active engines
          let sectionRoutes = section.routes;
          if (section.id === "engines" && activeEngines.length > 0) {
            const staticHrefs = new Set(section.routes.map(r => r.href));
            const dynamicRoutes: RouteEntry[] = activeEngines
              .filter(id => !staticHrefs.has(`/engines/${id}`))
              .map(id => {
                const label = id
                  .split("-")
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
                return {
                  id: `engines-${id}`,
                  label,
                  href: `/engines/${id}`,
                  section: "Engines",
                  icon: "Cpu",
                  description: `Custom content generation engine: ${label}`
                };
              });
            sectionRoutes = [...section.routes, ...dynamicRoutes];
          }

          const hasActiveItem = sectionRoutes.some((r) => pathname === r.href || pathname.startsWith(r.href + "/"));

          return (
            <div key={section.id} className="space-y-0.5">
              {sidebarOpen ? (
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-colors ${
                    hasActiveItem ? "text-zinc-300" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <SectionIcon className="w-3.5 h-3.5" />
                    <span>{section.title}</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              ) : (
                <div className="w-full flex items-center justify-center py-2 text-zinc-600">
                  <SectionIcon className="w-4 h-4" />
                </div>
              )}

              <AnimatePresence initial={false}>
                {(!sidebarOpen || isExpanded) && (
                  <motion.div
                    initial={sidebarOpen ? { height: 0, opacity: 0 } : { height: "auto", opacity: 1 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    className="overflow-hidden space-y-0.5 pl-1"
                  >
                    {sectionRoutes.map((route) => {
                      const RouteIcon = getIcon(route.icon);
                      const isActive = pathname === route.href || pathname.startsWith(route.href + "/");

                      return (
                        <Link
                          key={route.id}
                          href={route.href}
                          onMouseEnter={() => router.prefetch(route.href)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs ${
                            isActive
                              ? "bg-zinc-900 text-emerald-400 font-semibold"
                              : "text-zinc-400 hover:text-zinc-150 hover:bg-zinc-900/30"
                          } ${!sidebarOpen ? "justify-center" : ""}`}
                          title={!sidebarOpen ? route.label : undefined}
                        >
                          <RouteIcon className="w-4 h-4 flex-shrink-0" />
                          {sidebarOpen && <span className="truncate">{route.label}</span>}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Settings Link */}
        <Link
          href="/settings"
          onMouseEnter={() => router.prefetch("/settings")}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-xs font-semibold ${
            pathname === "/settings"
              ? "bg-zinc-900 text-emerald-400"
              : "text-zinc-400 hover:text-zinc-150 hover:bg-zinc-900/50"
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </Link>
      </div>

      {/* Collapse button for mini sidebar */}
      {!sidebarOpen && (
        <div className="p-3 border-t border-zinc-900 flex justify-center">
          <button
            onClick={toggleSidebar}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded hover:bg-zinc-900"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer Profile */}
      {sidebarOpen && (
        <div className="p-3 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full border border-zinc-800 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-zinc-950 text-xs font-bold flex-shrink-0">
              SA
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-zinc-200 truncate">System Admin</span>
              <span className="text-[10px] text-zinc-500 truncate">admin@shortfactory.ai</span>
            </div>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
