"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthService } from "@/lib/auth/AuthService";
import { formatAuthErrorMessage } from "@/lib/auth/errors";

function AuthContainerContent() {
  // portalType: "user" | "admin"
  const [portalType, setPortalType] = useState("user");

  // authMode: "signin" | "signup" | "forgot_email" | "forgot_otp" | "forgot_password"
  const [authMode, setAuthMode] = useState("signin");

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper to switch modes and reset errors
  const switchMode = (newMode) => {
    setAuthMode(newMode);
    setError("");
    setSuccessMsg("");
  };

  const switchPortal = (type) => {
    setPortalType(type);
    if (type === "admin") {
      setAuthMode("signin"); // Admins can only sign in
    }
    setError("");
    setSuccessMsg("");
  };

  // Sign In Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const targetRole = portalType === "admin" ? "ADMIN" : "USER";

    try {
      const res = await AuthService.loginWithEmail(email, password, targetRole);

      if (!res.success) {
        setError(res.error || (portalType === "admin" ? "Access denied! Administrator privileges required." : "Invalid email or password."));
        setLoading(false);
        return;
      }

      if (portalType === "admin") {
        setSuccessMsg("✓ Administrator clearance verified. Redirecting to Admin Console...");
        setTimeout(() => {
          router.push("/admin/users");
        }, 600);
      } else {
        setSuccessMsg("Authentication verified. Redirecting to workspace...");
        let redirectTo = searchParams?.get("redirect") || "/dashboard";
        if (redirectTo === "/admin" || redirectTo === "/login") {
          redirectTo = "/dashboard";
        }
        setTimeout(() => {
          router.push(redirectTo);
        }, 600);
      }
    } catch (err) {
      setError(formatAuthErrorMessage(err));
      setLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await AuthService.signUpWithEmail(fullName, email, password);

      if (!res.success) {
        setError(res.error || "Account creation failed.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Account registered successfully. Redirecting to dashboard...");
      let redirectTo = searchParams?.get("redirect") || "/dashboard";
      if (redirectTo === "/admin" || redirectTo === "/login") {
        redirectTo = "/dashboard";
      }

      setTimeout(() => {
        router.push(redirectTo);
      }, 600);
    } catch (err) {
      setError(formatAuthErrorMessage(err));
      setLoading(false);
    }
  };

  // Google Auth Handler
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    setSuccessMsg("");

    const targetRole = portalType === "admin" ? "ADMIN" : "USER";

    try {
      const res = await AuthService.loginWithGoogle(targetRole);

      if (!res.success) {
        setError(res.error || (portalType === "admin" ? "Access denied! Google account is not an authorized administrator." : "Google authentication failed."));
        setGoogleLoading(false);
        return;
      }

      if (portalType === "admin") {
        setSuccessMsg("✓ Administrator clearance verified. Redirecting to Admin Console...");
        setTimeout(() => {
          router.push("/admin/users");
        }, 600);
      } else {
        setSuccessMsg("Google account authorized. Redirecting to dashboard...");
        let redirectTo = searchParams?.get("redirect") || "/dashboard";
        if (redirectTo === "/admin" || redirectTo === "/login") {
          redirectTo = "/dashboard";
        }
        setTimeout(() => {
          router.push(redirectTo);
        }, 600);
      }
    } catch (err) {
      setError(formatAuthErrorMessage(err));
      setGoogleLoading(false);
    }
  };

  // Forgot Password — Step 1: Request OTP Email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await AuthService.requestPasswordReset(email);
      setLoading(false);

      if (res.success) {
        setSuccessMsg(res.data?.message || "If an account exists, a 6-digit verification code has been sent.");
        setAuthMode("forgot_otp");
      } else {
        setError(res.error || "Failed to process request.");
      }
    } catch (err) {
      setError(formatAuthErrorMessage(err));
      setLoading(false);
    }
  };

  // Forgot Password — Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await AuthService.verifyResetCode(email, otpCode.trim());
      setLoading(false);

      if (res.success && res.data?.resetToken) {
        setResetToken(res.data.resetToken);
        setSuccessMsg("Code verified. Please set your new password.");
        setAuthMode("forgot_password");
      } else {
        setError(res.error || "Incorrect or expired verification code.");
      }
    } catch (err) {
      setError(formatAuthErrorMessage(err));
      setLoading(false);
    }
  };

  // Forgot Password — Step 3: Set New Password
  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await AuthService.resetPasswordWithToken(resetToken, newPassword, confirmPassword);
      setLoading(false);

      if (res.success) {
        setSuccessMsg("Password reset successful. Please sign in with your new password.");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setOtpCode("");
        setResetToken("");
        setTimeout(() => {
          setAuthMode("signin");
        }, 1500);
      } else {
        setError(res.error || "Failed to reset password.");
      }
    } catch (err) {
      setError(formatAuthErrorMessage(err));
      setLoading(false);
    }
  };

  const isForgotFlow = authMode.startsWith("forgot");

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 md:p-8 text-[#1d1d1f] relative z-10 bg-[#f5f5f7]">
      <main className="w-full max-w-[480px] relative z-20">
        <div className="rounded-3xl p-10 sm:p-14 lg:p-16 flex flex-col gap-7 relative overflow-hidden bg-white/90 backdrop-blur-2xl border border-[#d2d2d7] shadow-xl">
          
          {/* User vs Admin Segmented Control Switcher */}
          {!isForgotFlow && (
            <div className="w-full bg-[#e5e5ea] p-1 rounded-2xl flex items-center gap-1 border border-[#d2d2d7] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
              <button
                type="button"
                onClick={() => switchPortal("user")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  portalType === "user"
                    ? "bg-white text-[#1d1d1f] shadow-sm font-bold"
                    : "text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Basic User</span>
              </button>

              <button
                type="button"
                onClick={() => switchPortal("admin")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  portalType === "admin"
                    ? "bg-[#1d1d1f] text-white shadow-md font-bold"
                    : "text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Admin Portal</span>
              </button>
            </div>
          )}

          {/* Header Section */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-[#0071e3]/20 flex items-center justify-center mb-1 shadow-sm p-2.5 overflow-hidden">
              <img src="/favicon-black.png" alt="ShortForge Logo" className="w-full h-full object-contain" />
            </div>

            {portalType === "admin" && !isForgotFlow && (
              <span className="px-3 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 font-bold text-[10px] tracking-wider uppercase">
                Restricted Admin Access
              </span>
            )}

            {authMode === "signin" && (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] font-display">
                  {portalType === "admin" ? "Admin Sign In" : "Sign In"}
                </h1>
                <p className="text-xs text-[#6e6e73] leading-relaxed max-w-xs">
                  {portalType === "admin"
                    ? "Elevated access for authorized administrators and system operators."
                    : "Get started with ShortForge to manage your automated pipelines."}
                </p>
              </>
            )}

            {authMode === "signup" && (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] font-display">Create Your Account</h1>
                <p className="text-xs text-[#6e6e73] leading-relaxed max-w-xs">Join ShortForge to orchestrate living Overseer pipelines.</p>
              </>
            )}

            {authMode === "forgot_email" && (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] font-display">Reset Password</h1>
                <p className="text-xs text-[#6e6e73] leading-relaxed max-w-xs">Enter your email to receive a 6-digit verification code.</p>
              </>
            )}

            {authMode === "forgot_otp" && (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] font-display">Enter Verification Code</h1>
                <p className="text-xs text-[#6e6e73] leading-relaxed max-w-xs">We sent a 6-digit code to <span className="font-semibold text-[#0071e3]">{email}</span>.</p>
              </>
            )}

            {authMode === "forgot_password" && (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] font-display">Set New Password</h1>
                <p className="text-xs text-[#6e6e73] leading-relaxed max-w-xs">Enter a strong new password (minimum 8 characters).</p>
              </>
            )}
          </div>

          {/* Alert Error / Success State */}
          {error && (
            <div className="p-4 text-xs bg-red-50 border border-red-200 text-[#ff3b30] rounded-xl flex items-center gap-3 shadow-sm">
              <span className="text-base font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 text-xs bg-emerald-50 border border-emerald-200 text-[#34c759] rounded-xl flex items-center gap-3 shadow-sm">
              <span className="text-base font-bold">✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {authMode === "signin" && (
            <form className="flex flex-col gap-5" onSubmit={handleLogin}>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="email">Email Address</label>
                <input
                  className="w-full !bg-[#f0f2f5] hover:!bg-[#e9ecf0] focus:!bg-[#ffffff] !text-[#1d1d1f] border border-[#d2d5dc] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/15 rounded-xl px-4 py-3.5 text-sm placeholder:!text-[#86868b] min-h-[50px] transition-all focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                  id="email"
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="password">Password</label>
                  <button
                    type="button"
                    className="text-xs text-[#0071e3] hover:text-[#0066cc] font-medium cursor-pointer transition-colors"
                    onClick={() => switchMode("forgot_email")}
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    className="w-full !bg-[#f0f2f5] hover:!bg-[#e9ecf0] focus:!bg-[#ffffff] !text-[#1d1d1f] border border-[#d2d5dc] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/15 rounded-xl px-4 py-3.5 !pr-12 text-sm placeholder:!text-[#86868b] min-h-[50px] transition-all focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                    id="password"
                    placeholder="••••••••"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/5 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                        <line x1="2" y1="2" x2="22" y2="22"></line>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                className={`w-full rounded-xl py-3.5 px-6 bg-[#0071e3] hover:bg-[#0066cc] text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2.5 min-h-[50px] transition-all active:scale-[0.98] shadow-md cursor-pointer mt-1 ${loading ? 'opacity-90 pointer-events-none' : ''}`}
                type="submit"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          )}

          {/* 2. SIGN UP FORM */}
          {authMode === "signup" && (
            <form className="flex flex-col gap-4.5" onSubmit={handleSignUp}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="fullName">Full Name</label>
                <input
                  className="w-full !bg-[#f0f2f5] hover:!bg-[#e9ecf0] focus:!bg-[#ffffff] !text-[#1d1d1f] border border-[#d2d5dc] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/15 rounded-xl px-4 py-3.5 text-sm placeholder:!text-[#86868b] min-h-[50px] transition-all focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                  id="fullName"
                  placeholder="Alex Rivera"
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="signupEmail">Email Address</label>
                <input
                  className="w-full !bg-[#f0f2f5] hover:!bg-[#e9ecf0] focus:!bg-[#ffffff] !text-[#1d1d1f] border border-[#d2d5dc] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/15 rounded-xl px-4 py-3.5 text-sm placeholder:!text-[#86868b] min-h-[50px] transition-all focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                  id="signupEmail"
                  placeholder="alex@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="signupPassword">Password</label>
                <div className="relative">
                  <input
                    className="w-full !bg-[#f0f2f5] hover:!bg-[#e9ecf0] focus:!bg-[#ffffff] !text-[#1d1d1f] border border-[#d2d5dc] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/15 rounded-xl px-4 py-3.5 !pr-12 text-sm placeholder:!text-[#86868b] min-h-[50px] transition-all focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                    id="signupPassword"
                    placeholder="Minimum 8 characters"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/5 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                        <line x1="2" y1="2" x2="22" y2="22"></line>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                className={`w-full rounded-xl py-3.5 px-6 bg-[#0071e3] hover:bg-[#0066cc] text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2.5 min-h-[50px] transition-all active:scale-[0.98] shadow-md cursor-pointer mt-1 ${loading ? 'opacity-90 pointer-events-none' : ''}`}
                type="submit"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD — STEP 1: Request OTP */}
          {authMode === "forgot_email" && (
            <form className="flex flex-col gap-5" onSubmit={handleRequestOtp}>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="resetEmail">Email Address</label>
                <input
                  className="w-full !bg-[#f0f2f5] hover:!bg-[#e9ecf0] focus:!bg-[#ffffff] !text-[#1d1d1f] border border-[#d2d5dc] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/15 rounded-xl px-4 py-3.5 text-sm placeholder:!text-[#86868b] min-h-[50px] transition-all focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                  id="resetEmail"
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                className={`w-full rounded-xl py-3.5 px-6 bg-[#0071e3] hover:bg-[#0066cc] text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2.5 min-h-[50px] transition-all active:scale-[0.98] shadow-md cursor-pointer ${loading ? 'opacity-90 pointer-events-none' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Send Verification Code</span>
                )}
              </button>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="text-xs text-[#0071e3] hover:text-[#0066cc] font-medium transition-colors cursor-pointer"
                >
                  ← Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* 4. FORGOT PASSWORD — STEP 2: Verify OTP */}
          {authMode === "forgot_otp" && (
            <form className="flex flex-col gap-5" onSubmit={handleVerifyOtp}>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="otpCode">6-Digit Code</label>
                <input
                  className="w-full !bg-[#f0f2f5] hover:!bg-[#e9ecf0] focus:!bg-[#ffffff] !text-[#1d1d1f] border border-[#d2d5dc] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/15 rounded-xl px-4 py-3.5 text-center text-xl font-mono tracking-widest placeholder:!text-[#86868b] min-h-[50px] transition-all focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                  id="otpCode"
                  placeholder="123456"
                  maxLength={6}
                  required
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <button
                className={`w-full rounded-xl py-3.5 px-6 bg-[#0071e3] hover:bg-[#0066cc] text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2.5 min-h-[50px] transition-all active:scale-[0.98] shadow-md cursor-pointer ${loading ? 'opacity-90 pointer-events-none' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Verify Code</span>
                )}
              </button>

              <div className="flex justify-between items-center pt-1 text-xs text-[#6e6e73]">
                <button
                  type="button"
                  onClick={() => switchMode("forgot_email")}
                  className="text-[#0071e3] hover:text-[#0066cc] font-medium transition-colors cursor-pointer"
                >
                  ← Resend code
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="hover:text-[#1d1d1f] transition-colors cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* 5. FORGOT PASSWORD — STEP 3: Set New Password */}
          {authMode === "forgot_password" && (
            <form className="flex flex-col gap-4.5" onSubmit={handleSetNewPassword}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="newPassword">New Password</label>
                <div className="relative">
                  <input
                    className="w-full !bg-[#f0f2f5] hover:!bg-[#e9ecf0] focus:!bg-[#ffffff] !text-[#1d1d1f] border border-[#d2d5dc] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/15 rounded-xl px-4 py-3.5 !pr-12 text-sm placeholder:!text-[#86868b] min-h-[50px] transition-all focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                    id="newPassword"
                    placeholder="Minimum 8 characters"
                    required
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/5 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                        <line x1="2" y1="2" x2="22" y2="22"></line>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="confirmPassword">Confirm Password</label>
                <div className="relative">
                  <input
                    className="w-full !bg-[#f0f2f5] hover:!bg-[#e9ecf0] focus:!bg-[#ffffff] !text-[#1d1d1f] border border-[#d2d5dc] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/15 rounded-xl px-4 py-3.5 !pr-12 text-sm placeholder:!text-[#86868b] min-h-[50px] transition-all focus:outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                    id="confirmPassword"
                    placeholder="Repeat new password"
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/5 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                        <line x1="2" y1="2" x2="22" y2="22"></line>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                className={`w-full rounded-xl py-3.5 px-6 bg-[#0071e3] hover:bg-[#0066cc] text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2.5 min-h-[50px] transition-all active:scale-[0.98] shadow-md cursor-pointer mt-1 ${loading ? 'opacity-90 pointer-events-none' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}

          {/* Secondary Actions: Google OAuth & Route Switcher */}
          {!isForgotFlow && (
            <>
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[#d2d2d7]"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-[#86868b] font-semibold">OR</span>
                <div className="flex-grow border-t border-[#d2d2d7]"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                className={`w-full rounded-xl py-3.5 px-6 bg-[#f2f2f7] hover:bg-[#e8e8ed] border border-[#d2d2d7] text-[#1d1d1f] text-sm font-semibold flex items-center justify-center gap-3 min-h-[50px] transition-all active:scale-[0.98] cursor-pointer shadow-xs ${googleLoading ? 'opacity-70 pointer-events-none' : ''}`}
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-[#0071e3]/30 border-t-[#0071e3] rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg aria-hidden="true" className="w-4 h-4 text-[#1d1d1f]" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                    </svg>
                    <span>{portalType === "admin" ? "Admin Sign In with Google" : "Continue with Google"}</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                {portalType === "admin" ? (
                  <p className="text-xs text-[#6e6e73] flex items-center justify-center gap-1.5 font-medium">
                    <span>🔒 Admin delegation & proxy timers are configured in the Admin Room.</span>
                  </p>
                ) : (
                  <>
                    {authMode === "signin" && (
                      <p className="text-xs text-[#6e6e73]">
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={() => switchMode("signup")}
                          className="text-[#0071e3] hover:text-[#0066cc] font-semibold transition-colors cursor-pointer ml-1"
                        >
                          Create Account
                        </button>
                      </p>
                    )}

                    {authMode === "signup" && (
                      <p className="text-xs text-[#6e6e73]">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => switchMode("signin")}
                          className="text-[#0071e3] hover:text-[#0066cc] font-semibold transition-colors cursor-pointer ml-1"
                        >
                          Sign In
                        </button>
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Footer Legal Links */}
          <div className="text-center">
            <p className="text-[#6e6e73] text-[11px] opacity-70 leading-relaxed">
              By {authMode === "signup" ? "registering" : "signing in"}, you agree to the ShortForge{" "}
              <a className="underline hover:text-[#0071e3] transition-colors" href="#">Terms of Service</a> and{" "}
              <a className="underline hover:text-[#0071e3] transition-colors" href="#">Privacy Policy</a>.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center text-[#6e6e73] text-xs">Loading Auth...</div>}>
      <AuthContainerContent />
    </Suspense>
  );
}
