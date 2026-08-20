import { NextRequest, NextResponse } from "next/server";
import { UserRepository, normalizeEmail } from "@/lib/auth/user-repository";
import { verifyPassword, hashPassword } from "@/lib/auth/password-hasher";
import { createSessionForUserAccount } from "@/lib/auth/session";
import { RateLimiter, AUTH_RATE_LIMITS } from "@/lib/auth/rate-limiter";
import { logAuthEvent } from "@/lib/auth/audit-logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid email or password.", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    const cleanEmail = normalizeEmail(email);

    // 1. Abuse protection & rate limiting per IP and per account
    const ipRate = RateLimiter.check(`login_ip_${ipAddress}`, AUTH_RATE_LIMITS.LOGIN_PER_IP.max, AUTH_RATE_LIMITS.LOGIN_PER_IP.windowMs);
    const emailRate = RateLimiter.check(`login_acc_${cleanEmail}`, AUTH_RATE_LIMITS.LOGIN_PER_ACCOUNT.max, AUTH_RATE_LIMITS.LOGIN_PER_ACCOUNT.windowMs);

    if (!ipRate.allowed || !emailRate.allowed) {
      await logAuthEvent({
        eventType: "LOGIN_FAILURE",
        email: cleanEmail,
        ipAddress,
        userAgent,
        details: { reason: "Rate limit exceeded" },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please try again in 5 minutes.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    // 2. Query user record
    const user = await UserRepository.findByNormalizedEmail(cleanEmail);

    if (!user || !user.passwordHash || !user.passwordSalt) {
      // Dummy hash computation to equalize timing against timing-based enumeration
      await hashPassword("dummy_timing_mitigation_password");
      
      await logAuthEvent({
        eventType: "LOGIN_FAILURE",
        email: cleanEmail,
        ipAddress,
        userAgent,
        details: { reason: "User not found" },
      });

      return NextResponse.json(
        { success: false, error: "Invalid email or password.", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // 3. Constant-time password verification
    const passwordValid = await verifyPassword(password, user.passwordHash, user.passwordSalt);

    if (!passwordValid) {
      await logAuthEvent({
        eventType: "LOGIN_FAILURE",
        uid: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        details: { reason: "Password mismatch" },
      });

      return NextResponse.json(
        { success: false, error: "Invalid email or password.", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // 4. Account status validation
    if (user.status !== "ACTIVE") {
      await logAuthEvent({
        eventType: "ACCOUNT_DISABLED",
        uid: user.id,
        email: user.email,
        role: user.role,
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Account is disabled. Please contact support.",
          code: "ACCOUNT_DISABLED",
        },
        { status: 403 }
      );
    }

    // 5. Clear failed attempt rate limiting counter upon success
    RateLimiter.reset(`login_acc_${cleanEmail}`);

    // 6. Update last login timestamp
    const now = new Date().toISOString();
    await UserRepository.update(user.id, { lastLoginAt: now });

    // 7. Issue secure HTTP-Only session cookie
    const { cookieHeader, user: safeUser } = await createSessionForUserAccount(
      { ...user, lastLoginAt: now },
      ipAddress,
      userAgent
    );

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      message: "Authenticated successfully.",
    });

    response.headers.set("Set-Cookie", cookieHeader);
    return response;
  } catch (error: any) {
    console.error("[Auth API] Login error:", error.message);
    return NextResponse.json(
      { success: false, error: "Authentication failed. Please try again later.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
