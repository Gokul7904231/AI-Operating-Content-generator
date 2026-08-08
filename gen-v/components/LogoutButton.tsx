"use client";

import React, { useState } from "react";
import { AuthService } from "@/lib/auth/AuthService";

export function LogoutButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await AuthService.logout();
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs font-mono border border-error/30 text-error hover:bg-error/10 transition-colors flex items-center gap-1.5 ${className}`}
    >
      <span className="material-symbols-outlined text-sm">logout</span>
      <span>{loading ? "Signing out..." : "Sign Out"}</span>
    </button>
  );
}
