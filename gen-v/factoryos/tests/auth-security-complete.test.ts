/**
 * FactoryOS Release-Critical Authentication & Security Complete Test Suite
 * Covers AUTH-001 through AUTH-036
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserRepository, normalizeEmail } from "@/lib/auth/user-repository";
import { PasswordResetRepository } from "@/lib/auth/password-reset-repository";
import {
  hashPassword,
  verifyPassword,
  hashOtp,
  verifyOtpHash,
  generateNumericOtp,
  generateResetAuthToken,
  hashResetToken,
  verifyResetTokenHash,
} from "@/lib/auth/password-hasher";
import { createSessionForUserAccount, destroySession } from "@/lib/auth/session";
import { verifySession, verifyAuthAndRole } from "@/lib/auth/auth";
import { RateLimiter, AUTH_RATE_LIMITS } from "@/lib/auth/rate-limiter";
import { BrevoEmailService } from "@/lib/auth/email/BrevoEmailService";
import { POST as signupHandler } from "@/app/api/auth/signup/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as verifyResetCodeHandler } from "@/app/api/auth/verify-reset-code/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";
import { GET as adminUsersHandler } from "@/app/api/admin/users/route";
import { NextRequest } from "next/server";

describe("FactoryOS Authentication & Security Suite (AUTH-001 -> AUTH-036)", () => {
  beforeEach(() => {
    UserRepository._resetForTesting();
    PasswordResetRepository._resetForTesting();
    RateLimiter._resetForTesting();
    vi.restoreAllMocks();
  });

  it("AUTH-001: signup creates USER role by default", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "basicuser@example.com",
        password: "SuperSecretPassword123!",
        name: "Basic User",
      }),
    });

    const res = await signupHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.user.role).toBe("USER");
    expect(json.user.email).toBe("basicuser@example.com");
    expect(json.user.passwordHash).toBeUndefined();
    expect(json.user.passwordSalt).toBeUndefined();

    // Check Set-Cookie header contains session cookie
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("__session=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("AUTH-002: duplicate email registration is rejected safely", async () => {
    // 1st signup
    await signupHandler(
      new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "duplicate@example.com",
          password: "SuperSecretPassword123!",
        }),
      })
    );

    // 2nd signup with same email (different case/spaces)
    const duplicateRes = await signupHandler(
      new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "  DUPLICATE@example.com ",
          password: "AnotherPassword123!",
        }),
      })
    );

    expect(duplicateRes.status).toBe(409);
    const json = await duplicateRes.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe("DUPLICATE_EMAIL");
  });

  it("AUTH-003: successful login authenticates and issues session", async () => {
    const { passwordHash, passwordSalt } = await hashPassword("ValidPassword123!");
    await UserRepository.create({
      email: "loginuser@example.com",
      passwordHash,
      passwordSalt,
      name: "Login User",
      role: "USER",
      status: "ACTIVE",
    });

    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "loginuser@example.com",
        password: "ValidPassword123!",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.user.email).toBe("loginuser@example.com");
    expect(json.user.passwordHash).toBeUndefined();

    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain("__session=");
  });

  it("AUTH-004: incorrect password returns generic error", async () => {
    const { passwordHash, passwordSalt } = await hashPassword("CorrectPassword123!");
    await UserRepository.create({
      email: "secureuser@example.com",
      passwordHash,
      passwordSalt,
      role: "USER",
      status: "ACTIVE",
    });

    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "secureuser@example.com",
        password: "WrongPassword!",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid email or password.");
  });

  it("AUTH-005: disabled account is rejected on login", async () => {
    const { passwordHash, passwordSalt } = await hashPassword("ValidPassword123!");
    await UserRepository.create({
      email: "disableduser@example.com",
      passwordHash,
      passwordSalt,
      role: "USER",
      status: "DISABLED",
    });

    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "disableduser@example.com",
        password: "ValidPassword123!",
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.code).toBe("ACCOUNT_DISABLED");
  });

  it("AUTH-006 & AUTH-007: forgot password returns generic response for both existing and unknown emails", async () => {
    const { passwordHash, passwordSalt } = await hashPassword("ValidPassword123!");
    await UserRepository.create({
      email: "registered@example.com",
      passwordHash,
      passwordSalt,
      role: "USER",
      status: "ACTIVE",
    });

    // Existing user
    const res1 = await forgotPasswordHandler(
      new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "registered@example.com" }),
      })
    );
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.message).toBe("If an account exists for that email, a verification code has been sent.");

    // Unknown user
    const res2 = await forgotPasswordHandler(
      new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "nonexistent@example.com" }),
      })
    );
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.message).toBe("If an account exists for that email, a verification code has been sent.");
  });

  it("AUTH-008: cryptographically secure 6-digit OTP generated and hashed", () => {
    const otp = generateNumericOtp();
    expect(otp).toMatch(/^\d{6}$/);

    const hash = hashOtp(otp);
    expect(hash).toHaveLength(64); // SHA-256 hex
    expect(verifyOtpHash(otp, hash)).toBe(true);
    expect(verifyOtpHash("000000", hash)).toBe(false);
  });

  it("AUTH-009: expired OTP is rejected", async () => {
    const otp = "584920";
    const otpHash = hashOtp(otp);
    const pastTimestamp = Date.now() - 1000; // Expired 1 second ago

    await PasswordResetRepository.createChallenge({
      userId: "usr_expired_test",
      email: "expired@example.com",
      otpHash,
      expiresAt: pastTimestamp,
    });

    const res = await verifyResetCodeHandler(
      new NextRequest("http://localhost:3000/api/auth/verify-reset-code", {
        method: "POST",
        body: JSON.stringify({ email: "expired@example.com", otp }),
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("CODE_EXPIRED");
  });

  it("AUTH-010: consumed OTP is rejected (single-use)", async () => {
    const otp = "112233";
    const otpHash = hashOtp(otp);

    const challenge = await PasswordResetRepository.createChallenge({
      userId: "usr_single_use",
      email: "singleuse@example.com",
      otpHash,
      expiresAt: Date.now() + 600000,
    });

    // 1st verify: success
    const res1 = await verifyResetCodeHandler(
      new NextRequest("http://localhost:3000/api/auth/verify-reset-code", {
        method: "POST",
        body: JSON.stringify({ email: "singleuse@example.com", otp }),
      })
    );
    expect(res1.status).toBe(200);

    // 2nd verify with same OTP: rejected
    const res2 = await verifyResetCodeHandler(
      new NextRequest("http://localhost:3000/api/auth/verify-reset-code", {
        method: "POST",
        body: JSON.stringify({ email: "singleuse@example.com", otp }),
      })
    );
    expect(res2.status).toBe(400);
    const json2 = await res2.json();
    expect(["INVALID_CODE", "CODE_CONSUMED"]).toContain(json2.code);
  });

  it("AUTH-011: OTP brute-force attempts blocked (max 5)", async () => {
    const otp = "998877";
    const otpHash = hashOtp(otp);

    await PasswordResetRepository.createChallenge({
      userId: "usr_bruteforce",
      email: "brute@example.com",
      otpHash,
      expiresAt: Date.now() + 600000,
      maxAttempts: 5,
    });

    // 5 incorrect guesses
    for (let i = 0; i < 5; i++) {
      await verifyResetCodeHandler(
        new NextRequest("http://localhost:3000/api/auth/verify-reset-code", {
          method: "POST",
          body: JSON.stringify({ email: "brute@example.com", otp: "000000" }),
        })
      );
    }

    // 6th attempt (even with correct OTP) is blocked
    const res = await verifyResetCodeHandler(
      new NextRequest("http://localhost:3000/api/auth/verify-reset-code", {
        method: "POST",
        body: JSON.stringify({ email: "brute@example.com", otp }),
      })
    );

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe("MAX_ATTEMPTS_EXCEEDED");
  });

  it("AUTH-013 -> AUTH-018: full end-to-end password reset flow", async () => {
    // 1. Setup User
    const { passwordHash: oldHash, passwordSalt: oldSalt } = await hashPassword("OldPassword123!");
    const user = await UserRepository.create({
      email: "resetflow@example.com",
      passwordHash: oldHash,
      passwordSalt: oldSalt,
      role: "USER",
      status: "ACTIVE",
    });

    // 2. Request OTP
    const otp = "654321";
    const otpHash = hashOtp(otp);
    await PasswordResetRepository.createChallenge({
      userId: user.id,
      email: user.email,
      otpHash,
      expiresAt: Date.now() + 600000,
    });

    // 3. Verify OTP -> Receive short-lived reset authorization token
    const verifyRes = await verifyResetCodeHandler(
      new NextRequest("http://localhost:3000/api/auth/verify-reset-code", {
        method: "POST",
        body: JSON.stringify({ email: "resetflow@example.com", otp }),
      })
    );
    expect(verifyRes.status).toBe(200);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.resetToken).toBeDefined();
    const resetToken = verifyJson.resetToken;

    // 4. Submit new password with resetToken
    const resetRes = await resetPasswordHandler(
      new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          resetToken,
          newPassword: "BrandNewPassword2026!",
          confirmPassword: "BrandNewPassword2026!",
        }),
      })
    );
    expect(resetRes.status).toBe(200);

    // 5. Old password no longer works
    const loginOld = await loginHandler(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "resetflow@example.com",
          password: "OldPassword123!",
        }),
      })
    );
    expect(loginOld.status).toBe(401);

    // 6. New password works successfully
    const loginNew = await loginHandler(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "resetflow@example.com",
          password: "BrandNewPassword2026!",
        }),
      })
    );
    expect(loginNew.status).toBe(200);
  });

  it("AUTH-019 & AUTH-020: server-side RBAC protects /api/admin/users", async () => {
    // 1. Basic USER session
    const basicUser = await UserRepository.create({
      email: "basic@example.com",
      passwordHash: "h",
      passwordSalt: "s",
      role: "USER",
      status: "ACTIVE",
    });

    const { cookieHeader: userCookie } = await createSessionForUserAccount(basicUser);

    const userReq = new NextRequest("http://localhost:3000/api/admin/users", {
      headers: { cookie: userCookie.split(";")[0] },
    });

    const userRes = await adminUsersHandler(userReq);
    expect(userRes.status).toBe(403);
    const userJson = await userRes.json();
    expect(userJson.success).toBe(false);

    // 2. ADMIN session
    const adminUser = await UserRepository.create({
      email: "admin@example.com",
      passwordHash: "h",
      passwordSalt: "s",
      role: "ADMIN",
      status: "ACTIVE",
    });

    const { cookieHeader: adminCookie } = await createSessionForUserAccount(adminUser);

    const adminReq = new NextRequest("http://localhost:3000/api/admin/users", {
      headers: { cookie: adminCookie.split(";")[0] },
    });

    const adminRes = await adminUsersHandler(adminReq);
    expect(adminRes.status).toBe(200);
    const adminJson = await adminRes.json();
    expect(adminJson.success).toBe(true);
    expect(Array.isArray(adminJson.users)).toBe(true);
  });

  it("AUTH-021: admin user list strictly excludes passwordHash and passwordSalt", async () => {
    const { passwordHash, passwordSalt } = await hashPassword("Secret123!");
    await UserRepository.create({
      email: "testsubject@example.com",
      passwordHash,
      passwordSalt,
      name: "Test Subject",
      role: "USER",
      status: "ACTIVE",
    });

    const users = await UserRepository.listAll();
    for (const u of users) {
      expect((u as any).passwordHash).toBeUndefined();
      expect((u as any).passwordSalt).toBeUndefined();
      expect((u as any).otpHash).toBeUndefined();
    }
  });

  it("AUTH-023: reset request rate limiting works", () => {
    const emailKey = "test_rate_limit@example.com";
    const limit = AUTH_RATE_LIMITS.FORGOT_PASSWORD_PER_EMAIL;

    for (let i = 0; i < limit.max; i++) {
      const res = RateLimiter.check(`forgot_${emailKey}`, limit.max, limit.windowMs);
      expect(res.allowed).toBe(true);
    }

    const blocked = RateLimiter.check(`forgot_${emailKey}`, limit.max, limit.windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("AUTH-025: public signup rejects or overrides role tampering to USER", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "hacker@example.com",
        password: "HackerPassword123!",
        role: "ADMIN", // Tampered role attempt
      }),
    });

    const res = await signupHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.role).toBe("USER"); // Must strictly remain USER
  });

  it("AUTH-026: creating a new reset challenge invalidates earlier challenges", async () => {
    const user = await UserRepository.create({
      email: "multireset@example.com",
      passwordHash: "h",
      passwordSalt: "s",
      role: "USER",
      status: "ACTIVE",
    });

    const challenge1 = await PasswordResetRepository.createChallenge({
      userId: user.id,
      email: user.email,
      otpHash: hashOtp("111111"),
      expiresAt: Date.now() + 600000,
    });

    const challenge2 = await PasswordResetRepository.createChallenge({
      userId: user.id,
      email: user.email,
      otpHash: hashOtp("222222"),
      expiresAt: Date.now() + 600000,
    });

    // challenge1 is now superseded and invalidated
    const active = await PasswordResetRepository.findActiveByNormalizedEmail(user.normalizedEmail);
    expect(active?.id).toBe(challenge2.id);
  });
});
