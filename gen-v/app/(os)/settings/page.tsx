"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Settings, Key, Trash2, RefreshCw, CheckCircle, 
  AlertTriangle, HardDrive, Clock, Sliders, ArrowRight
} from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import { useMounted } from "@/lib/useMounted";

export default function SettingsPage() {
  const mounted = useMounted();
  const { theme, setTheme } = useThemeStore();
  const [newKeyPath, setNewKeyPath] = useState("");
  const [deleteOld, setDeleteOld] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [rotating, setRotating] = useState(false);

  // Fetch Current & Available Keys
  const { data: keyData, refetch: refetchKeys, isLoading: keysLoading } = useQuery({
    queryKey: ["key-rotation-settings"],
    queryFn: async () => {
      const res = await fetch("/api/storage/rotate-key");
      if (!res.ok) throw new Error("Failed to load key settings");
      return res.json();
    }
  });

  // Hot-swap service account key mutation
  const rotateKey = useMutation({
    mutationFn: async () => {
      setRotating(true);
      setSuccess("");
      setError("");
      const res = await fetch("/api/storage/rotate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newKeyPath, deleteOld })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to rotate key");
      return data;
    },
    onSuccess: (data) => {
      setSuccess("Service Account key rotated successfully! Google Drive client reinitialized.");
      setNewKeyPath("");
      refetchKeys();
      setRotating(false);
    },
    onError: (err: any) => {
      setError(err.message);
      setRotating(false);
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-900 pb-4">
        <h1 className="text-xl font-bold text-zinc-50">OS Settings</h1>
        <p className="text-xs text-zinc-500 mt-1">Configure service account credentials, key rotations, and storage retention policies.</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Key Rotation */}
        <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Key className="w-4 h-4 text-blue-400" />
            Service Account Key Rotation
          </h3>

          <div className="space-y-4">
            {/* Active Key Info */}
            <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Active Key File</span>
              {keysLoading ? (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="space-y-1.5 font-mono text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Path:</span>
                    <span className="text-zinc-300 select-all">{keyData?.currentKey?.path ?? "None"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Client Email:</span>
                    <span className="text-zinc-300">{keyData?.currentKey?.clientEmail ?? "None"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Project ID:</span>
                    <span className="text-zinc-300">{keyData?.currentKey?.projectId ?? "None"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Rotation Form */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Rotate to New Credentials</span>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">New Key File Path</label>
                <input
                  type="text"
                  placeholder="e.g. credentials/service-account-new.json"
                  value={newKeyPath}
                  onChange={(e) => setNewKeyPath(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deleteOld"
                  checked={deleteOld}
                  onChange={(e) => setDeleteOld(e.target.checked)}
                  className="rounded border-zinc-850 bg-zinc-950 focus:ring-blue-500"
                />
                <label htmlFor="deleteOld" className="text-xs text-zinc-400 font-medium">
                  Delete old key file upon successful rotation
                </label>
              </div>

              <button
                onClick={() => rotateKey.mutate()}
                disabled={rotating || !newKeyPath}
                className="w-full bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {rotating ? "Rotating Key..." : "Rotate Credentials (Hot Swap)"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Retention Policies & Themes */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 font-mono">
              <Sliders className="w-4 h-4 text-emerald-400" />
              UI Theme Settings
            </h3>
            
            <div className="flex items-center justify-between bg-zinc-950/40 p-4 rounded-xl border border-zinc-850">
              <span className="text-xs text-zinc-400 font-semibold">Theme Toggle:</span>
              {mounted ? (
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold hover:text-emerald-400 transition-colors flex items-center gap-2 select-none"
                >
                  {theme === "light" ? "☀️ Light Mode" : "🌙 Dark Mode"}
                </button>
              ) : (
                <div className="w-28 h-8 rounded-lg bg-zinc-900/50 border border-zinc-800/40 animate-pulse" />
              )}
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 font-mono">
              <Clock className="w-4 h-4 text-blue-400" />
              Engine Retention Policies
            </h3>

            <div className="space-y-3">
              {[
                { id: "quiz", name: "Quiz Engine", hours: 48 },
                { id: "news", name: "News Engine", hours: 24 },
                { id: "story", name: "Story Engine", hours: 168 },
                { id: "motivation", name: "Motivation Engine", hours: 72 },
                { id: "premium", name: "Premium Tier", hours: 0 },
              ].map((policy) => (
                <div key={policy.id} className="bg-zinc-950/20 border border-zinc-800/40 rounded-lg p-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-zinc-300 capitalize">{policy.name}</span>
                    <span className="text-[9px] text-zinc-500 block font-mono">engineId: {policy.id}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
                    {policy.hours === 0 ? "Never Delete" : `${policy.hours}h`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
