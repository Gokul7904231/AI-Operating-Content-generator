"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthService } from "@/lib/auth/AuthService";
import { formatAuthErrorMessage } from "@/lib/auth/errors";

function AuthContainerContent() {
  // authMode can be "signin" | "signup" | "forgot"
  const [authMode, setAuthMode] = useState("signin");

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("gokul32499@gmail.com");
  const [password, setPassword] = useState("");

  // UI States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper to switch modes and reset errors
  const switchMode = (newMode) => {
    setAuthMode(newMode);
    setError("");
    setSuccessMsg("");
  };

  // Sign In Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await AuthService.loginWithEmail(email, password);

      if (!res.success) {
        setError(res.error || "Authentication failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Authentication verified. Redirecting to control plane...");
      let redirectTo = searchParams?.get("redirect") || "/dashboard";
      if (redirectTo === "/admin" || redirectTo === "/login") {
        redirectTo = "/dashboard";
      }

      setTimeout(() => {
        router.push(redirectTo);
      }, 800);
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
        setError(res.error || "Account creation failed. Please check your details.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Admin account registered. Redirecting to dashboard...");
      let redirectTo = searchParams?.get("redirect") || "/dashboard";
      if (redirectTo === "/admin" || redirectTo === "/login") {
        redirectTo = "/dashboard";
      }

      setTimeout(() => {
        router.push(redirectTo);
      }, 800);
    } catch (err) {
      setError(formatAuthErrorMessage(err));
      setLoading(false);
    }
  };

  // Forgot Password Handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await AuthService.resetPassword(email);
      setLoading(false);

      if (res.success) {
        setSuccessMsg(`Password recovery instructions sent to ${email}. Please check your inbox.`);
      } else {
        setError(res.error || "Failed to send reset link.");
      }
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

    try {
      const res = await AuthService.loginWithGoogle();

      if (!res.success) {
        setError(res.error || "Google authentication failed or account is unauthorized.");
        setGoogleLoading(false);
        return;
      }

      setSuccessMsg("Google account authorized. Redirecting to dashboard...");
      let redirectTo = searchParams?.get("redirect") || "/dashboard";
      if (redirectTo === "/admin" || redirectTo === "/login") {
        redirectTo = "/dashboard";
      }

      setTimeout(() => {
        router.push(redirectTo);
      }, 800);
    } catch (err) {
      setError(formatAuthErrorMessage(err));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 md:p-8 text-[#1d1d1f] relative z-10 bg-[#f5f5f7]">
      <div className="gradient-bg"></div>

      <main className="w-full max-w-[480px] relative z-20">
        <div className="glass-panel rounded-3xl p-10 sm:p-14 lg:p-16 flex flex-col gap-8 relative overflow-hidden bg-white/90 backdrop-blur-2xl border border-[#d2d2d7] shadow-xl apple-card-hover">
          
          {/* Header Section */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-[#0071e3]/20 flex items-center justify-center mb-2 shadow-sm p-2.5 overflow-hidden">
              <img src="/favicon-black.png" alt="FactoryOS Logo" className="w-full h-full object-contain" />
            </div>

            {authMode === "signin" && (
              <>
                <h1 className="text-3xl font-semibold tracking-apple-headline text-[#1d1d1f] font-display">Sign In</h1>
                <p className="text-xs font-text text-[#6e6e73] tracking-apple-body leading-relaxed max-w-xs">Get started with FactoryOS Pro to manage your automated pipelines.</p>
              </>
            )}

            {authMode === "signup" && (
              <>
                <h1 className="text-3xl font-semibold tracking-apple-headline text-[#1d1d1f] font-display">Create Your Account</h1>
                <p className="text-xs font-text text-[#6e6e73] tracking-apple-body leading-relaxed max-w-xs">Get started with FactoryOS Pro to manage your automated pipelines.</p>
              </>
            )}

            {authMode === "forgot" && (
              <>
                <h1 className="text-3xl font-semibold tracking-apple-headline text-[#1d1d1f] font-display">Reset Password</h1>
                <p className="text-xs font-text text-[#6e6e73] tracking-apple-body leading-relaxed max-w-xs">Enter your registered email to receive recovery instructions.</p>
              </>
            )}
          </div>

          {/* Alert Error / Success State */}
          {error && (
            <div className="p-4 text-xs font-text bg-red-50 border border-red-200 text-[#ff3b30] rounded-xl flex items-center gap-3 shadow-sm">
              <span className="material-symbols-outlined text-lg text-[#ff3b30]">error</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 text-xs font-text bg-emerald-50 border border-emerald-200 text-[#34c759] rounded-xl flex items-center gap-3 shadow-sm">
              <span className="material-symbols-outlined text-lg text-[#34c759]">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {authMode === "signin" && (
            <form className="flex flex-col gap-6" onSubmit={handleLogin}>
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-text text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="email">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] text-xl">
                    mail
                  </span>
                  <input
                    className="w-full bg-[#f2f2f7] border border-[#d2d2d7] rounded-xl pl-11 pr-4 py-3.5 text-sm font-text text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#86868b] focus:ring-2 focus:ring-[#0071e3]/20 focus:outline-none min-h-[50px] tracking-apple-body transition-all duration-160"
                    id="email"
                    placeholder="gokul32499@gmail.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-text text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="password">Password</label>
                  <button
                    type="button"
                    className="text-xs font-text text-[#0071e3] hover:text-[#0066cc] transition-colors min-h-[44px] flex items-center px-1 font-medium cursor-pointer"
                    onClick={() => switchMode("forgot")}
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] text-xl">
                    lock
                  </span>
                  <input
                    className="w-full bg-[#f2f2f7] border border-[#d2d2d7] rounded-xl pl-11 pr-4 py-3.5 text-sm font-text text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#86868b] focus:ring-2 focus:ring-[#0071e3]/20 focus:outline-none min-h-[50px] tracking-apple-body transition-all duration-160"
                    id="password"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  className={`w-full rounded-xl py-3.5 px-6 bg-[#0071e3] hover:bg-[#0066cc] text-white font-text text-sm font-semibold tracking-wide flex items-center justify-center gap-2.5 min-h-[50px] transition-[transform,background-color] duration-160 ease-out active:scale-[0.97] shadow-md cursor-pointer ${loading ? 'opacity-90 pointer-events-none' : ''}`}
                  type="submit"
                  disabled={loading || googleLoading}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <span className="material-symbols-outlined text-base">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 2. SIGN UP FORM (Create Account) */}
          {authMode === "signup" && (
            <form className="flex flex-col gap-5" onSubmit={handleSignUp}>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-text text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="fullName">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] text-xl">
                    person
                  </span>
                  <input
                    className="w-full bg-[#f2f2f7] border border-[#d2d2d7] rounded-xl pl-11 pr-4 py-3.5 text-sm font-text text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#86868b] focus:ring-2 focus:ring-[#0071e3]/20 focus:outline-none min-h-[50px] tracking-apple-body transition-all duration-160"
                    id="fullName"
                    placeholder="Gokul Krishnan"
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-text text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="email">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] text-xl">
                    mail
                  </span>
                  <input
                    className="w-full bg-[#f2f2f7] border border-[#d2d2d7] rounded-xl pl-11 pr-4 py-3.5 text-sm font-text text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#86868b] focus:ring-2 focus:ring-[#0071e3]/20 focus:outline-none min-h-[50px] tracking-apple-body transition-all duration-160"
                    id="email"
                    placeholder="gokul32499@gmail.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-text text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="password">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] text-xl">
                    lock
                  </span>
                  <input
                    className="w-full bg-[#f2f2f7] border border-[#d2d2d7] rounded-xl pl-11 pr-4 py-3.5 text-sm font-text text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#86868b] focus:ring-2 focus:ring-[#0071e3]/20 focus:outline-none min-h-[50px] tracking-apple-body transition-all duration-160"
                    id="password"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  className={`w-full rounded-xl py-3.5 px-6 bg-[#0071e3] hover:bg-[#0066cc] text-white font-text text-sm font-semibold tracking-wide flex items-center justify-center gap-2.5 min-h-[50px] transition-[transform,background-color] duration-160 ease-out active:scale-[0.97] shadow-md cursor-pointer ${loading ? 'opacity-90 pointer-events-none' : ''}`}
                  type="submit"
                  disabled={loading || googleLoading}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Get Started</span>
                      <span className="material-symbols-outlined text-base">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM (Account Recovery) */}
          {authMode === "forgot" && (
            <form className="flex flex-col gap-6" onSubmit={handleResetPassword}>
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-text text-[#6e6e73] uppercase tracking-wider font-semibold" htmlFor="resetEmail">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] text-xl">
                    mail
                  </span>
                  <input
                    className="w-full bg-[#f2f2f7] border border-[#d2d2d7] rounded-xl pl-11 pr-4 py-3.5 text-sm font-text text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#86868b] focus:ring-2 focus:ring-[#0071e3]/20 focus:outline-none min-h-[50px] tracking-apple-body transition-all duration-160"
                    id="resetEmail"
                    placeholder="gokul32499@gmail.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  className={`w-full rounded-xl py-3.5 px-6 bg-[#0071e3] hover:bg-[#0066cc] text-white font-text text-sm font-semibold tracking-wide flex items-center justify-center gap-2.5 min-h-[50px] transition-[transform,background-color] duration-160 ease-out active:scale-[0.97] shadow-md cursor-pointer ${loading ? 'opacity-90 pointer-events-none' : ''}`}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <span className="material-symbols-outlined text-base">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="text-xs font-text text-[#0071e3] hover:text-[#0066cc] font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>← Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* Secondary Actions: Google OAuth & Route Switcher (Hidden on Forgot Password screen as per spec) */}
          {authMode !== "forgot" && (
            <>
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[#d2d2d7]"></div>
                <span className="flex-shrink-0 mx-4 text-xs font-text text-[#86868b] font-semibold">OR</span>
                <div className="flex-grow border-t border-[#d2d2d7]"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                className={`w-full rounded-xl py-3.5 px-6 bg-[#f2f2f7] hover:bg-[#e8e8ed] border border-[#d2d2d7] text-[#1d1d1f] font-text text-sm font-semibold flex items-center justify-center gap-3 min-h-[50px] transition-[transform,background-color,border-color] duration-160 ease-out active:scale-[0.97] cursor-pointer shadow-sm ${googleLoading ? 'opacity-70 pointer-events-none' : ''}`}
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-[#0071e3]/30 border-t-[#0071e3] rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg aria-hidden="true" className="w-4 h-4 text-[#1d1d1f]" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"></path>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"></path>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* Alternate Route Switcher Link */}
              <div className="text-center pt-1">
                {authMode === "signin" && (
                  <p className="text-xs font-text text-[#6e6e73]">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="text-[#0071e3] hover:text-[#0066cc] font-semibold transition-colors cursor-pointer"
                    >
                      Create Account
                    </button>
                  </p>
                )}

                {authMode === "signup" && (
                  <p className="text-xs font-text text-[#6e6e73]">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signin")}
                      className="text-[#0071e3] hover:text-[#0066cc] font-semibold transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Footer Legal Links */}
          <div className="mt-2 text-center">
            <p className="font-text text-[#6e6e73] text-[11px] opacity-70 leading-relaxed">
              By {authMode === "signup" ? "registering" : "signing in"}, you agree to the FactoryOS Pro{" "}
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
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center text-[#6e6e73] font-text text-xs">Loading Auth...</div>}>
      <AuthContainerContent />
    </Suspense>
  );
}
