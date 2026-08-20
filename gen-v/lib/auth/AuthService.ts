/**
 * Client-Side Authentication & Authorization Service Facade — FactoryOS v1
 * 
 * Provides clean client-side APIs for Login, Signup, Google OAuth, Forgot Password, and OTP verification.
 */

import { validateEmail } from "./validators";
import { AdminUser, AuthResponse, SafeUser } from "./types";
import { formatAuthErrorMessage, AuthError } from "./errors";
import {
  auth,
  googleProvider,
  signInWithPopup,
} from "./firebase-client";

export class AuthService {
  /**
   * Client-Side Email/Password Login
   */
  static async loginWithEmail(email: string, pass: string): Promise<AuthResponse<{ user: SafeUser | AdminUser }>> {
    if (!validateEmail(email)) {
      return { success: false, error: "Invalid email address format." };
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Invalid email or password.",
          code: data.code || "AUTH_FAILED",
        };
      }

      return { success: true, data: { user: data.user } };
    } catch (err: any) {
      return { success: false, error: formatAuthErrorMessage(err) };
    }
  }

  /**
   * Client-Side Email/Password Sign-Up
   */
  static async signUpWithEmail(fullName: string, email: string, pass: string): Promise<AuthResponse<{ user: SafeUser | AdminUser }>> {
    if (!fullName || fullName.trim().length === 0) {
      return { success: false, error: "Please enter your full name." };
    }
    if (!validateEmail(email)) {
      return { success: false, error: "Invalid email address format." };
    }
    if (!pass || pass.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          password: pass,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Account creation failed.",
          code: data.code || "SIGNUP_FAILED",
        };
      }

      return { success: true, data: { user: data.user } };
    } catch (err: any) {
      return { success: false, error: formatAuthErrorMessage(err) };
    }
  }

  /**
   * Client-Side Google OAuth Login (Firebase popup + session cookie)
   */
  static async loginWithGoogle(): Promise<AuthResponse<{ user: any; idToken?: string }>> {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, isGoogleLogin: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Failed to establish Google session",
          code: data.code || "SESSION_ERROR",
        };
      }

      return { success: true, data: { user: data.user, idToken } };
    } catch (err: any) {
      return { success: false, error: formatAuthErrorMessage(err) };
    }
  }

  /**
   * Send Password Reset OTP Email
   */
  static async requestPasswordReset(email: string): Promise<AuthResponse<{ message: string }>> {
    if (!validateEmail(email)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok && res.status !== 200) {
        return {
          success: false,
          error: data.error || "Failed to process password reset.",
          code: data.code || "RESET_FAILED",
        };
      }

      return { success: true, data: { message: data.message } };
    } catch (err: any) {
      return { success: false, error: formatAuthErrorMessage(err) };
    }
  }

  /**
   * Verify Reset OTP Code
   */
  static async verifyResetCode(email: string, otp: string): Promise<AuthResponse<{ resetToken: string }>> {
    if (!email || !otp) {
      return { success: false, error: "Please enter the verification code sent to your email." };
    }

    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Verification failed. Please check the code.",
          code: data.code || "VERIFY_FAILED",
        };
      }

      return { success: true, data: { resetToken: data.resetToken } };
    } catch (err: any) {
      return { success: false, error: formatAuthErrorMessage(err) };
    }
  }

  /**
   * Submit New Password with Reset Authorization Token
   */
  static async resetPasswordWithToken(
    resetToken: string,
    newPassword: string,
    confirmPassword?: string
  ): Promise<AuthResponse<{ message: string }>> {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters long." };
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Failed to reset password. Please start over.",
          code: data.code || "RESET_FAILED",
        };
      }

      return { success: true, data: { message: data.message } };
    } catch (err: any) {
      return { success: false, error: formatAuthErrorMessage(err) };
    }
  }

  /**
   * Password Reset Alias
   */
  static async resetPassword(email: string): Promise<AuthResponse<{ message?: string }>> {
    return this.requestPasswordReset(email);
  }

  /**
   * Logout (Clear Session Cookie)
   */
  static async logout(): Promise<AuthResponse> {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Logout failed." };
    }
  }
}
