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
      className="bg-white border-r border-[#e8e8ed] flex flex-col h-screen sticky top-0 flex-shrink-0 z-50 overflow-hidden shadow-sm"
    >
      {/* Brand */}
      <div className="p-4 flex items-center justify-between border-b border-[#e8e8ed] h-16">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden select-none">
          <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center flex-shrink-0 p-1 overflow-hidden">
            <img src="/favicon-black.png" alt="FactoryOS Logo" className="w-full h-full object-contain" />
          </div>
          {sidebarOpen && (
            <span className="text-sm font-bold text-[#1d1d1f] tracking-tight whitespace-nowrap">
              ShortsFactory <span className="text-[10px] text-[#0071e3] font-semibold">OS</span>
            </span>
          )}
        </Link>
        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="text-[#86868b] hover:text-[#1d1d1f] p-1 rounded-md hover:bg-[#f2f2f7] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Generate Trigger */}
      <div className="p-3 border-b border-[#e8e8ed]">
        <button
          onClick={toggleQuickGenerate}
          className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
            sidebarOpen
              ? "bg-[#0071e3] hover:bg-[#0066cc] text-white active:scale-[0.98]"
              : "bg-[#f2f2f7] border border-[#e8e8ed] text-[#0071e3] hover:bg-[#e8e8ed]"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {sidebarOpen && <span>Quick Generate</span>}
        </button>
      </div>

      {/* Navigation Areas */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-5 terminal-scroll select-none">
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          onMouseEnter={() => router.prefetch("/dashboard")}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-xs font-semibold ${
            pathname === "/dashboard"
              ? "bg-[#0071e3]/10 text-[#0071e3] font-bold border border-[#0071e3]/20"
              : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f2f2f7]"
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${pathname === "/dashboard" ? "text-[#0071e3]" : "text-[#86868b]"}`} />
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
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-colors ${
                    hasActiveItem ? "text-[#1d1d1f]" : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f2f2f7]"
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
                <div className="w-full flex items-center justify-center py-2 text-[#86868b]">
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
                              ? "bg-[#0071e3]/10 text-[#0071e3] font-bold border border-[#0071e3]/20"
                              : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f2f2f7]"
                          } ${!sidebarOpen ? "justify-center" : ""}`}
                          title={!sidebarOpen ? route.label : undefined}
                        >
                          <RouteIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#0071e3]" : "text-[#86868b]"}`} />
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
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-xs font-semibold ${
            pathname === "/settings"
              ? "bg-[#0071e3]/10 text-[#0071e3] font-bold border border-[#0071e3]/20"
              : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f2f2f7]"
          }`}
        >
          <Settings className={`w-4 h-4 flex-shrink-0 ${pathname === "/settings" ? "text-[#0071e3]" : "text-[#86868b]"}`} />
          {sidebarOpen && <span>Settings</span>}
        </Link>
      </div>

      {/* Collapse button for mini sidebar */}
      {!sidebarOpen && (
        <div className="p-3 border-t border-[#e8e8ed] flex justify-center">
          <button
            onClick={toggleSidebar}
            className="text-[#86868b] hover:text-[#1d1d1f] p-1.5 rounded-md hover:bg-[#f2f2f7]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer Profile */}
      {sidebarOpen && (
        <div className="p-3 border-t border-[#e8e8ed] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full border border-[#e8e8ed] bg-[#0071e3] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#1d1d1f] truncate">{userName}</span>
              <span className="text-[10px] text-[#86868b] truncate font-semibold uppercase tracking-wider">{userRole}</span>
            </div>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
