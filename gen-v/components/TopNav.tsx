"use client";

import React, { useState } from "react";
import { Moon, Sun, Bell, Terminal, Sparkles, Activity, ShieldAlert, User, Mail, Briefcase, CreditCard, Key, LogOut } from "lucide-react";
import { useOSStore, AIProfile } from "@/lib/os-store";
import { useThemeStore } from "@/lib/theme-store";
import { useMounted } from "@/lib/useMounted";
import NotificationCenter from "./NotificationCenter";

interface TopNavProps {
  title?: string;
}

export default function TopNav({ title = "Dashboard" }: TopNavProps) {
  const mounted = useMounted();
  const toggleQuickGenerate = useOSStore((state) => state.toggleQuickGenerate);
  const selectedProviderId = useOSStore((state) => state.selectedProviderId);
  const selectedProfile = useOSStore((state) => state.selectedProfile);
  const setSelectedProfile = useOSStore((state) => state.setSelectedProfile);
  const notificationsCount = useOSStore((state) => state.notificationsCount);
  const { theme, setTheme } = useThemeStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const profiles: AIProfile[] = [
    "Balanced",
    "Maximum Quality",
    "Maximum Speed",
    "Lowest Cost",
    "Privacy",
    "Offline Mode"
  ];

  return (
    <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 flex justify-between items-center w-full px-6 h-16 sticky top-0 z-40 flex-shrink-0 select-none">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-bold text-zinc-50 tracking-tight">{title}</h1>
        
        {/* Active System Mode Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] text-zinc-400 font-medium">
          <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Router Mode: <span className="text-emerald-400 font-bold uppercase">{selectedProfile}</span></span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Profile Selector */}
        <div className="relative">
          <select
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value as AIProfile)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 outline-none focus:border-emerald-500 cursor-pointer"
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
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-all p-2 rounded-lg border border-transparent hover:border-zinc-800"
            title="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-8.5 h-8.5 rounded-lg bg-zinc-900/50 border border-zinc-800/40 animate-pulse" />
        )}

        {/* Console / Terminal Quick Link */}
        <button className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-all p-2 rounded-lg border border-transparent hover:border-zinc-800">
          <Terminal className="w-4.5 h-4.5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-all p-2 rounded-lg border border-transparent hover:border-zinc-800"
          >
            <Bell className="w-4.5 h-4.5" />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </button>
          {showNotifications && (
            <NotificationCenter onClose={() => setShowNotifications(false)} />
          )}
        </div>

        <div className="h-5 w-px bg-zinc-900 mx-1"></div>

        {/* Quick User Status - Avatar to Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 focus:outline-none"
          >
            <div className="w-7 h-7 rounded-full border border-zinc-800 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-zinc-950 text-[10px] font-bold flex-shrink-0 cursor-pointer hover:opacity-90">
              SA
            </div>
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 py-2.5 text-xs text-zinc-400">
              {/* Header with avatar and admin details */}
              <div className="px-4 py-3 border-b border-zinc-850 bg-zinc-950/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-zinc-850 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-zinc-950 text-xs font-black">
                  SA
                </div>
                <div>
                  <div className="font-bold text-zinc-105 flex items-center gap-1.5">
                    System Admin
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Root</span>
                  </div>
                  <div className="text-[9px] text-zinc-500 font-mono">admin@shortfactory.ai</div>
                </div>
              </div>
              
              <div className="px-2 py-2 space-y-0.5">
                {/* Menu items */}
                <button className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors cursor-pointer rounded-lg text-left">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Account Profile</span>
                </button>
                
                <button className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors cursor-pointer rounded-lg text-left">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="flex-grow">Active Workspace</span>
                  <span className="text-[9px] font-mono bg-zinc-950 border border-zinc-850 px-1.5 py-0.5 rounded text-zinc-400 font-bold">Default</span>
                </button>

                <button className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors cursor-pointer rounded-lg text-left">
                  <Key className="w-3.5 h-3.5 text-zinc-500" />
                  <span>API Key Config</span>
                </button>
              </div>

              {/* SRE metrics box */}
              <div className="mx-3.5 my-2 p-3 bg-zinc-950/60 border border-zinc-850/80 rounded-xl space-y-2 text-[10px] font-mono">
                <div className="flex justify-between items-center border-b border-zinc-850 pb-1.5 mb-1.5">
                  <span className="text-zinc-600 uppercase text-[8px] font-bold">Billing Usage</span>
                  <span className="text-emerald-450 font-bold">Dynamic Router Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-550">Router Mode:</span>
                  <span className="text-zinc-300 font-bold uppercase">{selectedProfile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-550">Available Credits:</span>
                  <span className="text-zinc-300 font-bold">$120.45</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-550">Tokens Consumed:</span>
                  <span className="text-zinc-300 font-bold">14,204</span>
                </div>
              </div>

              {/* Footer action logout */}
              <div className="px-2 pt-2 border-t border-zinc-850/80 mt-2">
                <button className="w-full px-3 py-2 flex items-center gap-2.5 text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors cursor-pointer rounded-lg text-left font-semibold">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
