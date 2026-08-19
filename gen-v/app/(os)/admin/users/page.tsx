"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Shield, Search, RefreshCw, 
  CheckCircle2, XCircle, AlertTriangle, Lock, UserCheck
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
  lastActive?: string;
}

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return <span className="px-2.5 py-0.5 rounded-full bg-[#1769E8]/15 text-[#1769E8] border border-[#1769E8]/30 font-bold text-[10px]">OWNER</span>;
      case "ADMIN":
        return <span className="px-2.5 py-0.5 rounded-full bg-[#179E69]/15 dark:bg-[#21C58B]/15 text-[#179E69] dark:text-[#21C58B] border border-[#179E69]/30 dark:border-[#21C58B]/30 font-bold text-[10px]">ADMIN</span>;
      case "CREATOR":
        return <span className="px-2.5 py-0.5 rounded-full bg-[#E8B949]/15 text-[#E8B949] border border-[#E8B949]/30 font-bold text-[10px]">CREATOR</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#667085] dark:text-[#A7B0BC] border border-black/10 dark:border-white/10 font-bold text-[10px]">{role}</span>;
    }
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
            The User Directory is restricted to FactoryOS administrative operators (OWNER/ADMIN). Your account does not have sufficient clearance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 select-none font-sans text-[#111827] dark:text-[#F5F7FA]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1769E8]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display">
              User Directory & Role RBAC
            </h1>
          </div>
          <p className="text-xs text-[#667085] dark:text-[#A7B0BC] mt-1">
            Authoritative registry of authenticated accounts and administrative privileges.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-3.5 py-2 bg-black/[0.04] dark:bg-[#0D1622] hover:bg-black/[0.08] dark:hover:bg-[#121E30] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs font-semibold text-[#111827] dark:text-[#F5F7FA] flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FF5964]/10 border border-[#FF5964]/20 flex items-center gap-3 text-xs text-[#FF5964]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Capsule */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-[#98A2B3] dark:text-[#667085] absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by email or role..."
          className="w-full bg-white dark:bg-[#08101B] border border-black/[0.08] dark:border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-xs text-[#111827] dark:text-[#F5F7FA] placeholder:text-[#98A2B3] dark:placeholder:text-[#667085] outline-none focus:border-[#1769E8] transition-colors"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/[0.02] dark:bg-[#050A12] border-b border-black/[0.06] dark:border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#667085] dark:text-[#A7B0BC]">
              <tr>
                <th className="py-3 px-4">User Account</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Identifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06] font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#667085] dark:text-[#A7B0BC] font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[#1769E8]" />
                    Loading user registry...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#667085] dark:text-[#A7B0BC] font-mono">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => (
                  <tr key={u.uid || u.id || idx} className="hover:bg-black/[0.02] dark:hover:bg-[#121E30]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#1769E8]/10 border border-[#1769E8]/20 flex items-center justify-center text-[#1769E8] font-bold text-xs">
                          {u.email ? u.email[0].toUpperCase() : "U"}
                        </div>
                        <span className="font-semibold text-[#111827] dark:text-[#F5F7FA]">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getRoleBadge(u.role || "VIEWER")}
                    </td>
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
                    <td className="py-3.5 px-4 text-[#667085] dark:text-[#A7B0BC] font-mono text-[11px]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Active"}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#98A2B3] dark:text-[#667085] font-mono text-[10px]">
                      {u.uid ? `${u.uid.slice(0, 10)}...` : "System"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
