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

  const [userRole, setUserRole] = useState<string>("VIEWER");
  const [userName, setUserName] = useState<string>("User");
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    initSSE();
    fetchState();
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUserRole(data.user.role || "EDITOR");
          setUserName(data.user.name || data.user.email?.split("@")[0] || "User");
          setUserEmail(data.user.email || "");
        }
      })
      .catch(() => {});
  }, [initSSE, fetchState]);

  const isAdmin = userRole === "OWNER" || userRole === "ADMIN";

  const visibleSections = ROUTE_SECTIONS.filter((section) => {
    if (section.id === "sre" && !isAdmin) return false;
    return true;
  });

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
      className="bg-white dark:bg-[#050A12] border-r border-black/[0.06] dark:border-white/[0.08] flex flex-col h-screen sticky top-0 flex-shrink-0 z-50 overflow-hidden shadow-2xs transition-colors duration-200"
    >
      {/* Brand */}
      <div className="p-4 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] h-16">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden select-none">
          <div className="w-8 h-8 rounded-lg bg-[#1769E8]/10 border border-[#1769E8]/20 flex items-center justify-center flex-shrink-0 p-1 overflow-hidden">
            <img src="/favicon-black.png" alt="FactoryOS Logo" width={32} height={32} loading="lazy" decoding="async" className="w-full h-full object-contain dark:hidden block" />
            <img src="/favicon-white.png" alt="FactoryOS Logo" width={32} height={32} loading="lazy" decoding="async" className="w-full h-full object-contain hidden dark:block" />
          </div>
          {sidebarOpen && (
            <span className="text-sm font-semibold text-[#111827] dark:text-[#F5F7FA] tracking-tight whitespace-nowrap">
              ShortsFactory <span className="text-[10px] text-[#1769E8] font-semibold">OS</span>
            </span>
          )}
        </Link>
        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            aria-label="Collapse navigation sidebar"
            className="text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] p-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-[#08101B] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Generate Trigger */}
      <div className="p-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <button
          onClick={toggleQuickGenerate}
          className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer ${
            sidebarOpen
              ? "bg-[#1769E8] hover:bg-[#0F58CA] text-white active:scale-[0.98]"
              : "bg-black/[0.03] dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] text-[#1769E8] hover:bg-black/[0.06] dark:hover:bg-[#0D1622]"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {sidebarOpen && <span>Quick Generate</span>}
        </button>
      </div>

      {/* Navigation Areas */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 terminal-scroll select-none">
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          onMouseEnter={() => router.prefetch("/dashboard")}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${
            pathname === "/dashboard"
              ? "bg-[#1769E8]/10 text-[#1769E8] font-bold border border-[#1769E8]/20"
              : "text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] hover:bg-black/[0.04] dark:hover:bg-[#08101B]"
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${pathname === "/dashboard" ? "text-[#1769E8]" : "text-[#667085] dark:text-[#A7B0BC]"}`} />
          {sidebarOpen && <span>Dashboard</span>}
        </Link>

        {/* Dynamic Sections from RouteRegistry */}
        {visibleSections.map((section) => {
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
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-colors cursor-pointer ${
                    hasActiveItem ? "text-[#111827] dark:text-[#F5F7FA]" : "text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] hover:bg-black/[0.04] dark:hover:bg-[#08101B]"
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
                <div className="w-full flex items-center justify-center py-2 text-[#667085] dark:text-[#A7B0BC]">
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
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs ${
                            isActive
                              ? "bg-[#1769E8]/10 text-[#1769E8] font-bold border border-[#1769E8]/20"
                              : "text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] hover:bg-black/[0.04] dark:hover:bg-[#08101B]"
                          } ${!sidebarOpen ? "justify-center" : ""}`}
                          title={!sidebarOpen ? route.label : undefined}
                        >
                          <RouteIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#1769E8]" : "text-[#667085] dark:text-[#A7B0BC]"}`} />
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
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs font-semibold ${
            pathname === "/settings"
              ? "bg-[#1769E8]/10 text-[#1769E8] font-bold border border-[#1769E8]/20"
              : "text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] hover:bg-black/[0.04] dark:hover:bg-[#08101B]"
          }`}
        >
          <Settings className={`w-4 h-4 flex-shrink-0 ${pathname === "/settings" ? "text-[#1769E8]" : "text-[#667085] dark:text-[#A7B0BC]"}`} />
          {sidebarOpen && <span>Settings</span>}
        </Link>
      </div>

      {/* Collapse button for mini sidebar */}
      {!sidebarOpen && (
        <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] flex justify-center">
          <button
            onClick={toggleSidebar}
            aria-label="Expand navigation sidebar"
            className="text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] p-1.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-[#08101B] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer Profile */}
      {sidebarOpen && (
        <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#050A12] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={useOSStore.getState().selectedAvatar}
              alt="User Avatar"
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
              className="w-8 h-8 rounded-full border border-[#1769E8]/30 object-cover flex-shrink-0 shadow-2xs"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[#111827] dark:text-[#F5F7FA] truncate">{userName}</span>
              <span className="text-[10px] text-[#667085] dark:text-[#98A2B3] truncate font-semibold uppercase tracking-wider">{userRole === "EDITOR" ? "CREATOR" : userRole}</span>
            </div>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
