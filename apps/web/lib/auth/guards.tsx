"use client";

import React, { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "./hooks";
import { UserRole } from "./types";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#050A12] text-[#111827] dark:text-[#F5F7FA]">
        <div className="w-8 h-8 border-4 border-[#1677FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    return null;
  }

  return <>{children}</>;
}

export function RequireRole({
  requiredRole,
  children,
  fallback,
}: {
  requiredRole: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasRole, loading } = useAuth();

  if (loading) return null;
  
  if (!hasRole(requiredRole)) {
    if (fallback !== undefined) return <>{fallback}</>;

    return (
      <div className="max-w-4xl mx-auto p-8 select-none font-sans">
        <div className="bg-white dark:bg-[#08101B] border border-[#FF5964]/30 rounded-3xl p-8 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FF5964]/10 border border-[#FF5964]/20 flex items-center justify-center mx-auto text-[#FF5964]">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F5F7FA]">403 — Unauthorized Access</h2>
          <p className="text-xs text-[#667085] dark:text-[#A7B0BC] max-w-md mx-auto">
            This section is restricted to FactoryOS administrative operators ({requiredRole}+). Your account does not have sufficient clearance.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthGuard({
  requiredRole,
  children,
}: {
  requiredRole?: UserRole;
  children: ReactNode;
}) {
  return (
    <ProtectedRoute>
      {requiredRole ? (
        <RequireRole requiredRole={requiredRole}>
          {children}
        </RequireRole>
      ) : (
        children
      )}
    </ProtectedRoute>
  );
}

export function AdminGuard({ children }: { children: ReactNode }) {
  return <AuthGuard requiredRole="ADMIN">{children}</AuthGuard>;
}

