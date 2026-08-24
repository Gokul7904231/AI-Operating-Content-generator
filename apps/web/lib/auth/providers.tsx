"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { AuthContext } from "./hooks";
import { AuthService } from "./AuthService";
import { AdminUser, UserRole } from "./types";
import { isRoleAtLeast } from "./roles";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check initial active session from server
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        }
      } catch (err: any) {
        console.error("[AuthProvider] Session check error:", err.message);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    const result = await AuthService.loginWithEmail(email, pass);
    if (result.success && result.data) {
      setUser(result.data.user);
    } else {
      setError(result.error || "Login failed");
    }
    setLoading(false);
    return { success: result.success, error: result.error };
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    const result = await AuthService.loginWithGoogle();
    if (result.success && result.data) {
      setUser(result.data.user);
    } else {
      setError(result.error || "Google sign-in failed");
    }
    setLoading(false);
    return { success: result.success, error: result.error };
  };

  const resetPassword = async (email: string) => {
    return await AuthService.resetPassword(email);
  };

  const logout = async () => {
    setLoading(true);
    await AuthService.logout();
    setUser(null);
    setLoading(false);
    window.location.href = "/login";
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return isRoleAtLeast(user.role, requiredRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        loading,
        error,
        loginWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
