"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  Shield,
  HardDrive,
  Calendar,
  Film,
  ChevronLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
} from "lucide-react";
import Link from "next/link";

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params?.userId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;

    async function loadUser() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setData(json);
        } else {
          setError(json.error || "User could not be loaded.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load user inspection.");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="py-24 text-center text-[#667085] text-xs flex flex-col items-center gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-[#1677FF]" />
        <span>Loading user intelligence...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        <Link href="/admin/users" className="text-xs font-bold text-[#1677FF] flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to Users
        </Link>
        <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
          {error || "User not found."}
        </div>
      </div>
    );
  }

  const { user, quota, driveConnection, schedules, videos } = data;

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/admin/users" className="text-xs font-bold text-[#1677FF] hover:underline flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Back to User Directory
      </Link>

      {/* User Header Profile */}
      <div className="bg-white dark:bg-[#070D18] border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1677FF]/10 text-[#1677FF] flex items-center justify-center font-bold text-lg">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#111827] dark:text-[#F5F7FA]">{user.name || user.email}</h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase bg-[#1677FF]/10 text-[#1677FF]">
                {user.tier || user.role}
              </span>
            </div>
            <p className="text-xs text-[#667085] dark:text-[#A8B2C1] mt-0.5 font-mono">{user.email} (ID: {user.id})</p>
          </div>
        </div>

        <div className="text-xs text-[#667085] font-mono sm:text-right">
          <div>Registered: {new Date(user.createdAt).toLocaleDateString()}</div>
          <div>Last Activity: {new Date(user.lastLoginAt).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Grid: Quota & Drive Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quota Ledger */}
        <div className="bg-white dark:bg-[#070D18] border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A8B2C1] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#1677FF]" /> Generation Quota Ledger
          </h3>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-[#0E1728] border border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-[10px] text-[#667085] block uppercase">Used</span>
              <span className="font-bold text-[#111827] dark:text-[#F5F7FA] font-mono text-base">{quota?.totalUsed ?? 0}</span>
            </div>
            <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-[#0E1728] border border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-[10px] text-[#667085] block uppercase">Limit</span>
              <span className="font-bold text-[#111827] dark:text-[#F5F7FA] font-mono text-base">
                {quota?.limit === Infinity ? "Unlimited" : quota?.limit ?? 5}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-[#0E1728] border border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-[10px] text-[#667085] block uppercase">Remaining</span>
              <span className="font-bold text-[#1677FF] font-mono text-base">
                {quota?.remaining === Infinity ? "Unlimited" : quota?.remaining ?? 5}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#667085] font-mono">
            Period Model: {quota?.periodType || "LIFETIME"} {quota?.periodStart && `(${quota.periodStart.slice(0, 10)} to ${quota.periodEnd?.slice(0, 10)})`}
          </p>
        </div>

        {/* Google Drive Status */}
        <div className="bg-white dark:bg-[#070D18] border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A8B2C1] flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#19C37D]" /> Google Drive Connection
          </h3>

          {driveConnection ? (
            <div className="p-4 rounded-2xl bg-[#19C37D]/10 border border-[#19C37D]/20 text-xs space-y-2">
              <div className="flex items-center justify-between text-[#19C37D] font-bold">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Connected</span>
                <span className="font-mono text-[10px]">OAuth 2.0</span>
              </div>
              <p className="text-[#111827] dark:text-[#F5F7FA] font-semibold">{driveConnection.googleEmail}</p>
              <p className="text-[#667085] font-mono text-[11px]">Folder: {driveConnection.selectedFolderName}</p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-[#0E1728] border border-black/[0.06] dark:border-white/[0.06] text-xs text-[#667085] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>No personal Google Drive account connected.</span>
            </div>
          )}
        </div>
      </div>

      {/* User Video Artifacts History */}
      <div className="bg-white dark:bg-[#070D18] border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A8B2C1] flex items-center gap-2">
          <Film className="w-4 h-4 text-[#1677FF]" /> User Generated Videos ({videos?.length ?? 0})
        </h3>

        {videos?.length === 0 ? (
          <p className="text-xs text-[#667085]">No videos generated yet by this user.</p>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
            {videos?.map((v: any) => (
              <div key={v.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-[#111827] dark:text-[#F5F7FA]">{v.topic || v.title || v.id}</div>
                  <div className="text-[11px] text-[#667085] font-mono mt-0.5">
                    Engine: {v.engineId || "quiz"} • {new Date(v.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {v.driveUrl && (
                    <a
                      href={v.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-[#19C37D]/10 text-[#19C37D] font-mono text-[10px] font-bold"
                    >
                      Drive
                    </a>
                  )}
                  <Link
                    href={`/media/library/${v.id}`}
                    className="px-3 py-1 rounded-lg bg-[#1677FF] text-white text-[11px] font-bold flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" /> Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
