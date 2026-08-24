"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Shield, Search, RefreshCw, 
  CheckCircle2, XCircle, AlertTriangle, Lock, 
  Clock, UserPlus, Key, ArrowRight, ShieldCheck, Timer
} from "lucide-react";
import { useAuth } from "@/lib/auth/hooks";

interface AdminUser {
  id?: string;
  uid?: string;
  email: string;
  role: string;
  active?: boolean;
  disabled?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  adminExpiresAt?: string | null;
  proxyAdminGrantedBy?: string;
  proxyAdminGrantedAt?: string;
  isProxyAdmin?: boolean;
  isExpiredAdmin?: boolean;
}

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "admins" | "proxy" | "users">("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delegation Form State
  const [targetEmail, setTargetEmail] = useState("");
  const [durationValue, setDurationValue] = useState("24h");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (res.ok && json.success) {
        setUsers(json.users || []);
      } else {
        setErrorMessage(json.error || "Failed to load user directory (Requires ADMIN privilege).");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error loading users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (isAdmin) {
        fetchUsers();
      } else {
        setIsLoading(false);
        setErrorMessage("Forbidden: You must be an OWNER or ADMIN to view the user directory.");
      }
    }
  }, [authLoading, isAdmin]);

  // Handle Grant Admin Form
  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail || !targetEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let durationHours: number | undefined;
    let isPermanent = false;

    if (durationValue === "1h") durationHours = 1;
    else if (durationValue === "6h") durationHours = 6;
    else if (durationValue === "24h") durationHours = 24;
    else if (durationValue === "7d") durationHours = 24 * 7;
    else if (durationValue === "30d") durationHours = 24 * 30;
    else if (durationValue === "permanent") isPermanent = true;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail.trim(),
          durationHours,
          isPermanent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(data.message || `Admin privileges granted to ${targetEmail}.`);
        setTargetEmail("");
        fetchUsers();
      } else {
        setErrorMessage(data.error || "Failed to grant administrator access.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error granting admin role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action: Revoke Admin
  const handleRevokeAdmin = async (uid: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke admin access for ${email}?`)) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, role: "USER" }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Admin role revoked for ${email}. Account reverted to User.`);
        fetchUsers();
      } else {
        setErrorMessage(data.error || "Failed to revoke admin role.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error revoking role.");
    }
  };

  // Quick Action: Extend Admin Time
  const handleQuickExtend = async (uid: string, hours: number) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, role: "ADMIN", durationHours: hours }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Admin access extended by ${hours} hours.`);
        fetchUsers();
      } else {
        setErrorMessage(data.error || "Failed to extend admin access.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error extending time.");
    }
  };

  // Helper for computing time remaining
  const getTimeRemaining = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return "Expired";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h left`;
    }
    return `${hours}h ${mins}m left`;
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === "admins") {
      return u.role === "OWNER" || u.role === "ADMIN";
    }
    if (activeTab === "proxy") {
      return u.role === "ADMIN" && !!u.adminExpiresAt;
    }
    if (activeTab === "users") {
      return u.role === "USER" || u.role === "VIEWER" || u.role === "EDITOR";
    }
    return true;
  });

  const getRoleBadge = (userRecord: AdminUser) => {
    const role = userRecord.role;
    const isProxy = !!userRecord.adminExpiresAt;
    const isExpired = isProxy && new Date(userRecord.adminExpiresAt!).getTime() <= Date.now();

    if (role === "OWNER") {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-[#1769E8]/15 text-[#1769E8] border border-[#1769E8]/30 font-bold text-[10px] flex items-center gap-1 w-fit">
          <ShieldCheck className="w-3 h-3" /> OWNER
        </span>
      );
    }

    if (role === "ADMIN") {
      if (isExpired) {
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-[#FF5964]/15 text-[#FF5964] border border-[#FF5964]/30 font-bold text-[10px] flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3" /> EXPIRED ADMIN
          </span>
        );
      }
      if (isProxy) {
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-[#E8B949]/15 text-[#D97706] dark:text-[#FBBF24] border border-[#E8B949]/30 font-bold text-[10px] flex items-center gap-1 w-fit">
            <Timer className="w-3 h-3" /> PROXY ADMIN
          </span>
        );
      }
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-[#179E69]/15 dark:bg-[#21C58B]/15 text-[#179E69] dark:text-[#21C58B] border border-[#179E69]/30 dark:border-[#21C58B]/30 font-bold text-[10px] flex items-center gap-1 w-fit">
          <Shield className="w-3 h-3" /> ADMIN
        </span>
      );
    }

    return (
      <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#667085] dark:text-[#A7B0BC] border border-black/10 dark:border-white/10 font-bold text-[10px] w-fit">
        BASIC USER
      </span>
    );
  };

  if (!authLoading && !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8 select-none font-sans">
        <div className="bg-white dark:bg-[#08101B] border border-[#FF5964]/30 rounded-3xl p-8 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FF5964]/10 border border-[#FF5964]/20 flex items-center justify-center mx-auto text-[#FF5964]">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F5F7FA]">403 — Unauthorized Access</h2>
          <p className="text-xs text-[#667085] dark:text-[#A7B0BC] max-w-md mx-auto">
            The User Directory & Admin Room is restricted to FactoryOS administrative operators (OWNER/ADMIN). Your account does not have sufficient clearance.
          </p>
        </div>
      </div>
    );
  }

  // Count summaries
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === "ADMIN" || u.role === "OWNER").length;
  const proxyCount = users.filter((u) => u.role === "ADMIN" && !!u.adminExpiresAt && new Date(u.adminExpiresAt).getTime() > Date.now()).length;
  const basicCount = users.filter((u) => u.role === "USER" || u.role === "VIEWER" || u.role === "EDITOR").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 select-none font-sans text-[#111827] dark:text-[#F5F7FA]">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1769E8]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display">
              Admin Delegation Room & User Registry
            </h1>
          </div>
          <p className="text-xs text-[#6e6e73] dark:text-[#A7B0BC] mt-1">
            Manage authenticated accounts, promote emails to Administrator, and configure time-limited proxy access.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-3.5 py-2 bg-black/[0.04] dark:bg-[#0D1622] hover:bg-black/[0.08] dark:hover:bg-[#121E30] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs font-semibold text-[#111827] dark:text-[#F5F7FA] flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Registry</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FF5964]/10 border border-[#FF5964]/20 flex items-center gap-3 text-xs text-[#FF5964] shadow-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-[#179E69]/10 dark:bg-[#21C58B]/10 border border-[#179E69]/20 dark:border-[#21C58B]/20 flex items-center gap-3 text-xs text-[#179E69] dark:text-[#21C58B] shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Section 1: Admin Delegation Console */}
      <div className="bg-white dark:bg-[#08101B] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#1769E8]/10 border border-[#1769E8]/20 flex items-center justify-center text-[#1769E8]">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#F5F7FA]">Delegate Admin Authority</h2>
            <p className="text-[11px] text-[#6e6e73] dark:text-[#A7B0BC]">
              Enter a user email and define how long they are authorized to access the Admin Platform.
            </p>
          </div>
        </div>

        <form onSubmit={handleGrantAdmin} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Email Input */}
          <div className="md:col-span-6 flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#6e6e73] dark:text-[#A7B0BC] uppercase tracking-wider">
              Target User Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="e.g. operator@company.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full bg-[#f5f5f7] dark:bg-[#050A12] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-[#111827] dark:text-[#F5F7FA] placeholder:text-[#98A2B3] focus:border-[#1769E8] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Duration Selector */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#6e6e73] dark:text-[#A7B0BC] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#1769E8]" /> Access Duration Allowed
            </label>
            <select
              value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              className="w-full bg-[#f5f5f7] dark:bg-[#050A12] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-[#111827] dark:text-[#F5F7FA] focus:border-[#1769E8] focus:outline-none transition-colors cursor-pointer"
            >
              <option value="1h">1 Hour (Quick Triage)</option>
              <option value="6h">6 Hours (Shift Access)</option>
              <option value="24h">24 Hours (1 Day Maintenance)</option>
              <option value="7d">7 Days (1 Week)</option>
              <option value="30d">30 Days (1 Month)</option>
              <option value="permanent">Permanent Admin (No Expiry)</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1769E8] hover:bg-[#1258c7] text-white py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Grant Role</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Metrics KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] text-[#6e6e73] dark:text-[#A7B0BC] font-medium">Total Registered Users</div>
          <div className="text-2xl font-bold font-display mt-1 text-[#111827] dark:text-[#F5F7FA]">{totalCount}</div>
        </div>

        <div className="bg-white dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] text-[#179E69] dark:text-[#21C58B] font-medium flex items-center gap-1">
            <Shield className="w-3 h-3" /> Total Administrators
          </div>
          <div className="text-2xl font-bold font-display mt-1 text-[#179E69] dark:text-[#21C58B]">{adminCount}</div>
        </div>

        <div className="bg-white dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] text-[#D97706] dark:text-[#FBBF24] font-medium flex items-center gap-1">
            <Timer className="w-3 h-3" /> Active Proxy Admins
          </div>
          <div className="text-2xl font-bold font-display mt-1 text-[#D97706] dark:text-[#FBBF24]">{proxyCount}</div>
        </div>

        <div className="bg-white dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] text-[#6e6e73] dark:text-[#A7B0BC] font-medium">Basic Plan Users</div>
          <div className="text-2xl font-bold font-display mt-1 text-[#6e6e73] dark:text-[#A7B0BC]">{basicCount}</div>
        </div>
      </div>

      {/* Section 3: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-[#0D1622] p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.08] w-fit">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "all" ? "bg-white dark:bg-[#1769E8] text-[#111827] dark:text-white shadow-xs" : "text-[#6e6e73] dark:text-[#A7B0BC]"
            }`}
          >
            All Users ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "admins" ? "bg-white dark:bg-[#1769E8] text-[#111827] dark:text-white shadow-xs" : "text-[#6e6e73] dark:text-[#A7B0BC]"
            }`}
          >
            Admins ({adminCount})
          </button>
          <button
            onClick={() => setActiveTab("proxy")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "proxy" ? "bg-white dark:bg-[#1769E8] text-[#111827] dark:text-white shadow-xs" : "text-[#6e6e73] dark:text-[#A7B0BC]"
            }`}
          >
            Proxy Timers ({proxyCount})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "users" ? "bg-white dark:bg-[#1769E8] text-[#111827] dark:text-white shadow-xs" : "text-[#6e6e73] dark:text-[#A7B0BC]"
            }`}
          >
            Basic Users ({basicCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by email or role..."
            className="w-full bg-white dark:bg-[#08101B] border border-black/[0.08] dark:border-white/[0.08] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#111827] dark:text-[#F5F7FA] placeholder:text-[#98A2B3] outline-none focus:border-[#1769E8] transition-colors"
          />
        </div>
      </div>

      {/* Section 4: Users Directory & Action Table */}
      <div className="bg-white dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/[0.02] dark:bg-[#050A12] border-b border-black/[0.06] dark:border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#667085] dark:text-[#A7B0BC]">
              <tr>
                <th className="py-3 px-4">User Account</th>
                <th className="py-3 px-4">Role Clearance</th>
                <th className="py-3 px-4">Admin Time Remaining</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Delegation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06] font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#667085] dark:text-[#A7B0BC] font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[#1769E8]" />
                    Loading user registry and permissions...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#667085] dark:text-[#A7B0BC] font-mono">
                    No matching user accounts found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const uid = u.uid || u.id || `usr_${idx}`;
                  const isOwner = u.role === "OWNER";
                  const isAdminRole = u.role === "ADMIN";
                  const timeRemaining = getTimeRemaining(u.adminExpiresAt);

                  return (
                    <tr key={uid} className="hover:bg-black/[0.02] dark:hover:bg-[#121E30]/40 transition-colors">
                      {/* User Account */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#1769E8]/10 border border-[#1769E8]/20 flex items-center justify-center text-[#1769E8] font-bold text-xs">
                            {u.email ? u.email[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-[#111827] dark:text-[#F5F7FA]">{u.email}</div>
                            <div className="text-[10px] text-[#98A2B3] dark:text-[#667085] font-mono">
                              Created: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Active"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {getRoleBadge(u)}
                      </td>

                      {/* Time Remaining */}
                      <td className="py-3.5 px-4">
                        {isOwner ? (
                          <span className="text-[#1769E8] font-mono text-[11px] font-semibold">Permanent Owner</span>
                        ) : isAdminRole ? (
                          u.adminExpiresAt ? (
                            timeRemaining === "Expired" ? (
                              <span className="text-[#FF5964] font-mono text-[11px] font-semibold">Expired</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#D97706] dark:text-[#FBBF24] font-mono text-[11px] font-semibold bg-[#E8B949]/10 px-2 py-0.5 rounded-md">
                                <Timer className="w-3 h-3" /> {timeRemaining}
                              </span>
                            )
                          ) : (
                            <span className="text-[#179E69] dark:text-[#21C58B] font-mono text-[11px] font-semibold">Permanent Admin</span>
                          )
                        ) : (
                          <span className="text-[#98A2B3] dark:text-[#667085] font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.disabled ? (
                          <span className="inline-flex items-center gap-1 text-[#FF5964] font-mono text-[10px]">
                            <XCircle className="w-3.5 h-3.5" /> Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#179E69] dark:text-[#21C58B] font-mono text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {!isOwner && (
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdminRole ? (
                              <>
                                <button
                                  onClick={() => handleQuickExtend(uid, 24)}
                                  title="Extend access by +24 Hours"
                                  className="px-2.5 py-1 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] text-[#111827] dark:text-[#F5F7FA] rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                                >
                                  +24h
                                </button>
                                <button
                                  onClick={() => handleRevokeAdmin(uid, u.email)}
                                  className="px-2.5 py-1 bg-[#FF5964]/10 hover:bg-[#FF5964]/20 text-[#FF5964] rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                                >
                                  Revoke
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setTargetEmail(u.email);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="px-2.5 py-1 bg-[#1769E8]/10 hover:bg-[#1769E8]/20 text-[#1769E8] rounded-lg text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Key className="w-3 h-3" /> Make Admin
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
