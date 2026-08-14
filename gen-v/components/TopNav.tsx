"use client";

import React, { useState } from "react";
import { Moon, Sun, Bell, Terminal, Sparkles, Activity, ShieldAlert, User, Mail, Briefcase, CreditCard, Key, LogOut } from "lucide-react";
import { useOSStore, AIProfile } from "@/lib/os-store";
import { useThemeStore } from "@/lib/theme-store";
import { useMounted } from "@/lib/useMounted";
import { useAuth } from "@/lib/auth/hooks";
import { AuthService } from "@/lib/auth/AuthService";
import NotificationCenter from "./NotificationCenter";

interface TopNavProps {
  title?: string;
}

export default function TopNav({ title = "Dashboard" }: TopNavProps) {
  const mounted = useMounted();
  const { user } = useAuth();
  const toggleQuickGenerate = useOSStore((state) => state.toggleQuickGenerate);
  const selectedProviderId = useOSStore((state) => state.selectedProviderId);
  const selectedProfile = useOSStore((state) => state.selectedProfile);
  const setSelectedProfile = useOSStore((state) => state.setSelectedProfile);
  const notificationsCount = useOSStore((state) => state.notificationsCount);
  const { theme, setTheme } = useThemeStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
    <header className="bg-white/90 backdrop-blur-md border-b border-[#e8e8ed] flex justify-between items-center w-full px-6 h-16 sticky top-0 z-40 flex-shrink-0 select-none shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-bold text-[#1d1d1f] tracking-tight">{title}</h1>
        
        {/* Active System Mode Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#f2f2f7] border border-[#e8e8ed] rounded-full text-[10px] text-[#6e6e73] font-medium">
          <Activity className="w-3 h-3 text-[#34c759] animate-pulse" />
          <span>Router Mode: <span className="text-[#0071e3] font-bold uppercase">{selectedProfile}</span></span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Profile Selector */}
        <div className="relative">
          <select
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value as AIProfile)}
            className="bg-[#f2f2f7] border border-[#e8e8ed] rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-[#1d1d1f] outline-none focus:border-[#0071e3] cursor-pointer"
          >
            {profiles.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Theme Toggle (☀️ / 🌙) */}
        {mounted ? (
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f2f2f7] transition-all p-2 rounded-lg border border-transparent hover:border-[#e8e8ed]"
            title="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-8.5 h-8.5 rounded-lg bg-[#f2f2f7] border border-[#e8e8ed] animate-pulse" />
        )}

        {/* Console / Terminal Quick Link */}
        <button className="text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f2f2f7] transition-all p-2 rounded-lg border border-transparent hover:border-[#e8e8ed]">
          <Terminal className="w-4.5 h-4.5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f2f2f7] transition-all p-2 rounded-lg border border-transparent hover:border-[#e8e8ed]"
          >
            <Bell className="w-4.5 h-4.5" />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#34c759] rounded-full" />
            )}
          </button>
          {showNotifications && (
            <NotificationCenter onClose={() => setShowNotifications(false)} />
          )}
        </div>

        <div className="h-5 w-px bg-[#e8e8ed] mx-1"></div>

        {/* Quick User Status - Avatar to Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 focus:outline-none"
          >
            <div className="w-7 h-7 rounded-full border border-[#e8e8ed] bg-[#0071e3] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 cursor-pointer hover:opacity-90 shadow-sm">
              SA
            </div>
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#e8e8ed] rounded-xl shadow-xl overflow-hidden z-50 py-2.5 text-xs text-[#6e6e73]">
              {/* Header with avatar and admin details */}
              <div className="px-4 py-3 border-b border-[#e8e8ed] bg-[#f5f5f7] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#e8e8ed] bg-[#0071e3] flex items-center justify-center text-white text-xs font-black">
                  {user?.email ? user.email.slice(0, 2).toUpperCase() : "SA"}
                </div>
                <div>
                  <div className="font-bold text-[#1d1d1f] flex items-center gap-1.5">
                    {user?.email?.split("@")[0] || "System Admin"}
                    <span className="text-[8px] bg-[#0071e3]/10 text-[#0071e3] px-1 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                      {user?.role || "ROOT"}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#86868b] font-mono truncate max-w-[140px]">
                    {user?.email || "admin@shortfactory.ai"}
                  </div>
                </div>
              </div>
              
              <div className="px-2 py-2 space-y-0.5">
                {/* Menu items */}
                <button className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#f2f2f7] hover:text-[#1d1d1f] transition-colors cursor-pointer rounded-lg text-left">
                  <User className="w-3.5 h-3.5 text-[#86868b]" />
                  <span>Account Profile</span>
                </button>
                
                <button className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#f2f2f7] hover:text-[#1d1d1f] transition-colors cursor-pointer rounded-lg text-left">
                  <Briefcase className="w-3.5 h-3.5 text-[#86868b]" />
                  <span className="flex-grow">Active Workspace</span>
                  <span className="text-[9px] font-mono bg-[#f2f2f7] border border-[#e8e8ed] px-1.5 py-0.5 rounded text-[#6e6e73] font-bold">Default</span>
                </button>

                <button className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#f2f2f7] hover:text-[#1d1d1f] transition-colors cursor-pointer rounded-lg text-left">
                  <Key className="w-3.5 h-3.5 text-[#86868b]" />
                  <span>API Key Config</span>
                </button>
              </div>

              {/* SRE metrics box */}
              <div className="mx-3.5 my-2 p-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl space-y-2 text-[10px] font-mono">
                <div className="flex justify-between items-center border-b border-[#e8e8ed] pb-1.5 mb-1.5">
                  <span className="text-[#86868b] uppercase text-[8px] font-bold">Billing Usage</span>
                  <span className="text-[#34c759] font-bold">Dynamic Router Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6e6e73]">Router Mode:</span>
                  <span className="text-[#1d1d1f] font-bold uppercase">{selectedProfile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6e6e73]">Available Credits:</span>
                  <span className="text-[#1d1d1f] font-bold">$120.45</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6e6e73]">Tokens Consumed:</span>
                  <span className="text-[#1d1d1f] font-bold">14,204</span>
                </div>
              </div>

              {/* Footer action logout */}
              <div className="px-2 pt-2 border-t border-[#e8e8ed] mt-2">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors cursor-pointer rounded-lg text-left font-semibold disabled:opacity-50"
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
  );
}
