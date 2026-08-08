/**
 * Client-Side Authentication & Authorization Service Facade — FactoryOS v1
 * 
 * Note: This module is client-bundle safe and must NOT import Node.js/Server-only modules
 * (such as firebase-admin or child_process).
 */

import {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
} from "./firebase-client";
import { validateEmail, checkRateLimit } from "./validators";
import { AdminUser, AuthResponse } from "./types";
import { AuthError, RateLimitExceededError } from "./errors";

export class AuthService {
  /**
   * Client-Side Email/Password Login
   */
  static async loginWithEmail(email: string, pass: string): Promise<AuthResponse<{ user: AdminUser; idToken: string }>> {
    if (!validateEmail(email)) {
      return { success: false, error: "Invalid email address format." };
    }

    const rateCheck = checkRateLimit(`login_${email.toLowerCase()}`);
    if (!rateCheck.allowed) {
      throw new RateLimitExceededError();
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const idToken = await credential.user.getIdToken();

      // Establish HTTP-Only session cookie via server API endpoint
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, isGoogleLogin: false }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new AuthError(data.error || "Failed to establish admin session", "SESSION_ERROR", res.status);
      }

      return { success: true, data: { user: data.user, idToken } };
    } catch (err: any) {
      return { success: false, error: err.message || "Email login failed." };
    }
  }

  /**
   * Client-Side Google OAuth Login
   */
  static async loginWithGoogle(): Promise<AuthResponse<{ user: AdminUser; idToken: string }>> {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken();

      // Establish HTTP-Only session cookie via server API endpoint
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, isGoogleLogin: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new AuthError(data.error || "Unauthorized admin account", "SESSION_ERROR", res.status);
      }

      return { success: true, data: { user: data.user, idToken } };
    } catch (err: any) {
      return { success: false, error: err.message || "Google sign-in failed." };
    }
  }

  /**
   * Send Password Reset Email
   */
  static async resetPassword(email: string): Promise<AuthResponse> {
    if (!validateEmail(email)) {
      return { success: false, error: "Invalid email address." };
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to send password reset email." };
    }
  }

  /**
   * Logout (Clear Session Cookie & Firebase Client Auth)
   */
  static async logout(): Promise<AuthResponse> {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      if (auth.currentUser) {
        await signOut(auth);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Logout failed." };
    }
  }
}
