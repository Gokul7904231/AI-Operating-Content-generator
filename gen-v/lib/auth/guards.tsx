"use client";

import React, { ReactNode } from "react";
import { useAuth } from "./hooks";
import { UserRole } from "./types";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
  fallback = null,
}: {
  requiredRole: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasRole, loading } = useAuth();

  if (loading) return null;
  if (!hasRole(requiredRole)) return <>{fallback}</>;

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
        <RequireRole
          requiredRole={requiredRole}
          fallback={
            <div className="p-8 text-center text-error bg-surface-container rounded-xl border border-error/20">
              <h2 className="text-xl font-bold mb-2">403 — Unauthorized Access</h2>
              <p className="text-sm opacity-80">You do not have the required role ({requiredRole}) to view this section.</p>
            </div>
          }
        >
          {children}
        </RequireRole>
      ) : (
        children
      )}
    </ProtectedRoute>
  );
}
