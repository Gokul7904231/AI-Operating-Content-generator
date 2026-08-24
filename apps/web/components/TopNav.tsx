"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Moon, Sun, Bell, Terminal, Activity, User, Briefcase, Key, LogOut, Infinity as InfinityIcon, X, Menu } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { useOSStore, AIProfile } from "@/lib/os-store";
import { useThemeStore } from "@/lib/theme-store";
import { useMounted } from "@/lib/useMounted";
import { useAuth } from "@/lib/auth/hooks";
import { AuthService } from "@/lib/auth/AuthService";

const NotificationCenter = dynamic(() => import("./NotificationCenter"), { ssr: false });
const UserProfileModal = dynamic(() => import("./UserProfileModal"), { ssr: false });

interface TopNavProps {
  title?: string;
}

export default function TopNav({ title = "Dashboard" }: TopNavProps) {
  const mounted = useMounted();
  const { user } = useAuth();
  const selectedProfile = useOSStore((state) => state.selectedProfile);
  const setSelectedProfile = useOSStore((state) => state.setSelectedProfile);
  const notificationsCount = useOSStore((state) => state.notificationsCount);
  const selectedAvatar = useOSStore((state) => state.selectedAvatar);
  const { theme, toggleTheme } = useThemeStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [quota, setQuota] = useState<{ completed: number; limit: number; remaining: number; isUnlimited: boolean } | null>(null);

  const sidebarOpen = useOSStore((s) => s.sidebarOpen);
  const toggleSidebar = useOSStore((s) => s.toggleSidebar);
  const displayAvatar = user?.photoURL || selectedAvatar || "/avatars/factory-avatar-01.png";
  const isAdmin = user?.role === "ADMIN" || user?.role === "OWNER";

  useEffect(() => {
    async function fetchQuota() {
      try {
        const res = await fetch("/api/user/quota");
        const data = await res.json();
        if (data.success && data.quota) {
          setQuota(data.quota);
        }
      } catch {
        // Fallback handled by role
      }
    }
    fetchQuota();
  }, [user]);

  const userRoleBadge = user?.role === "EDITOR" || !user?.role 
    ? "CREATOR" 
    : user?.role === "VIEWER" 
    ? "VIEWER" 
    : user?.role;

  const handleLogout = async () => {
    setLoggingOut(true);
    await AuthService.logout();
    window.location.href = "/login";
  };

  const profiles: AIProfile[] = [
    "Balanced",
    "Maximum Quality",
    "Maximum Speed",
    "Lowest Cost",
    "Privacy",
    "Offline Mode"
  ];

  return (
    <>
      <header className="bg-white/85 dark:bg-[#050A12]/90 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center w-full px-4 sm:px-6 h-16 sticky top-0 z-40 flex-shrink-0 select-none shadow-2xs transition-colors duration-200">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile hamburger — opens sidebar drawer (P0-10) */}
          <button
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={sidebarOpen}
            className="inline-flex md:hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-[#08101B] text-[#111827] dark:text-[#F5F7FA] active:scale-[0.98] transition-transform cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-[#111827] dark:text-[#F5F7FA] tracking-tight">{title}</h1>
          
          {/* Active System Mode Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-black/[0.03] dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-full text-[10px] text-[#667085] dark:text-[#A7B0BC] font-medium">
            <Activity className="w-3 h-3 text-[#179E69] dark:text-[#21C58B] animate-pulse" />
            <span>Router Mode: <span className="text-[#1769E8] font-bold uppercase">{selectedProfile}</span></span>
          </div>

          {/* User Quota Render Limit Badge in Dashboard Header */}
          {isAdmin ? (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 dark:border-amber-400/30 rounded-full text-xs font-bold text-amber-600 dark:text-amber-400 shadow-2xs"
              title="Admin Quota: Strictly Unlimited Video Generation (∞)"
            >
              <InfinityIcon className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px] font-bold">∞</span>
            </div>
          ) : (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/30 dark:border-blue-400/30 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 shadow-2xs"
              title="Basic User Quota: 5 Free Video Generation Slots"
            >
              <BrandIcon className="w-3 h-3" />
              <span className="font-mono text-[11px] font-bold">
                {quota ? `${quota.completed}/${quota.limit}` : "0/5"} left
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Profile Selector */}
          <div className="relative">
            <select
              id="router-mode-selector"
              aria-label="Router Mode AI Profile Selector"
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value as AIProfile)}
              className="bg-black/[0.03] dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-[#111827] dark:text-[#F5F7FA] outline-none focus:border-[#1769E8] cursor-pointer"
            >
              {profiles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle Button */}
          {mounted ? (
            <button
              onClick={toggleTheme}
              className="relative p-2 rounded-xl text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] bg-black/[0.03] dark:bg-[#08101B] hover:bg-black/[0.06] dark:hover:bg-[#0D1622] border border-black/[0.06] dark:border-white/[0.08] transition-all duration-200 cursor-pointer flex items-center justify-center group shadow-2xs active:scale-95"
              title={`Active Theme: ${theme.toUpperCase()} (Click to toggle Light/Dark)`}
              aria-label="Toggle theme mode"
            >
              {theme === "dark" ? (
                <Moon className="w-4 h-4 text-[#1769E8] group-hover:rotate-12 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(23,105,232,0.35)]" />
              ) : (
                <Sun className="w-4 h-4 text-[#E8B949] group-hover:rotate-45 transition-transform duration-300" />
              )}
            </button>
          ) : (
            <div className="w-8.5 h-8.5 rounded-xl bg-black/[0.03] dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] animate-pulse" />
          )}

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="View notifications"
              className="relative text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] hover:bg-black/[0.04] dark:hover:bg-[#08101B] transition-all p-2 rounded-lg border border-transparent hover:border-black/[0.06] dark:hover:border-white/[0.08] cursor-pointer"
            >
              <Bell className="w-4.5 h-4.5" />
              {notificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#179E69] dark:bg-[#21C58B] rounded-full" />
              )}
            </button>
            {showNotifications && (
              <NotificationCenter onClose={() => setShowNotifications(false)} />
            )}
          </div>

          <div className="h-5 w-px bg-white/[0.08] mx-1"></div>

          {/* Quick User Status - Avatar to Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              aria-label="User profile and account settings"
              className="flex items-center gap-2 focus:outline-none cursor-pointer"
            >
              <img
                src={displayAvatar}
                alt="User Avatar"
                width={32}
                height={32}
                loading="lazy"
                decoding="async"
                className="w-8 h-8 rounded-full border border-[#1677FF]/40 object-cover flex-shrink-0 cursor-pointer hover:opacity-90 shadow-sm"
              />
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0A1220] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-50 py-2 text-xs text-[#A8B2C1]">
                {/* Header with avatar, user details, and Top-Right Close Action */}
                <div className="px-4 py-3 border-b border-white/[0.08] bg-[#070D18] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={displayAvatar}
                      alt="User Avatar"
                      width={40}
                      height={40}
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10 rounded-full border border-[#1677FF]/40 object-cover flex-shrink-0 shadow-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#F5F7FA] flex items-center gap-1.5 truncate">
                        {user?.email ? user.email.split("@")[0].toUpperCase() : "OPERATOR"}
                        <span className="text-[8px] bg-[#1677FF]/20 text-[#1677FF] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider border border-[#1677FF]/30 flex-shrink-0">
                          {userRoleBadge}
                        </span>
                      </div>
                      <div className="text-[9px] text-[#667085] font-mono truncate">
                        {user?.email || "operator@shortforge.internal"}
                      </div>
                    </div>
                  </div>

                  {/* Top Right Close 'X' Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfileDropdown(false);
                    }}
                    aria-label="Close profile menu"
                    className="p-1 rounded-lg text-[#667085] hover:text-[#F5F7FA] hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer flex-shrink-0"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="px-2 py-2 space-y-0.5">
                  {/* Menu items */}
                  <button 
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#121E32] hover:text-[#F5F7FA] transition-colors cursor-pointer rounded-lg text-left font-medium"
                  >
                    <User className="w-3.5 h-3.5 text-[#1677FF]" />
                    <span>Account Profile & Preferences</span>
                  </button>
                  
                  <button className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#121E32] hover:text-[#F5F7FA] transition-colors cursor-pointer rounded-lg text-left font-medium">
                    <Briefcase className="w-3.5 h-3.5 text-[#667085]" />
                    <span className="flex-grow">Active Workspace</span>
                    <span className="text-[9px] font-mono bg-[#070D18] border border-white/[0.08] px-1.5 py-0.5 rounded text-[#A8B2C1] font-bold">Default</span>
                  </button>

                  <Link 
                    href="/settings/api"
                    onClick={() => setShowProfileDropdown(false)}
                    className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#121E32] hover:text-[#F5F7FA] transition-colors cursor-pointer rounded-lg text-left font-medium"
                  >
                    <Key className="w-3.5 h-3.5 text-[#1677FF]" />
                    <span>API Configuration</span>
                  </Link>
                </div>

                {/* Personal router mode box */}
                <div className="mx-3.5 my-2 p-3 bg-[#070D18] border border-white/[0.08] rounded-xl space-y-2 text-[10px] font-mono">
                  <div className="flex justify-between items-center border-b border-white/[0.08] pb-1.5 mb-1.5">
                    <span className="text-[#667085] uppercase text-[8px] font-bold">Routing Profile</span>
                    <span className="text-[#19C37D] font-bold">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A8B2C1]">Router Mode:</span>
                    <span className="text-[#F5F7FA] font-bold uppercase">{selectedProfile}</span>
                  </div>
                </div>

                {/* Footer action logout */}
                <div className="px-2 pt-2 border-t border-white/[0.08] mt-2">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full px-3 py-2 flex items-center gap-2.5 text-[#FF5A67] hover:bg-[#FF5A67]/10 transition-colors cursor-pointer rounded-lg text-left font-semibold disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{loggingOut ? "Signing out..." : "Log Out Session"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* User Profile & Preferences Modal */}
      {showProfileModal && (
        <UserProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </>
  );
}
