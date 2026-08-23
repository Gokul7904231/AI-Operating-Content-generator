import { NextRequest, NextResponse } from "next/server";
import { UserRepository, normalizeEmail } from "@/lib/auth/user-repository";
import { verifyPassword, hashPassword } from "@/lib/auth/password-hasher";
import { createSessionForUserAccount } from "@/lib/auth/session";
import { RateLimiter, AUTH_RATE_LIMITS } from "@/lib/auth/rate-limiter";
import { logAuthEvent } from "@/lib/auth/audit-logger";
import { isEffectiveAdmin } from "@/lib/auth/roles";
import { ALLOWED_BOOTSTRAP_OWNER_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, targetRole } = body;

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

    // 2. Query user record or verify bootstrap owner
    const isBootstrapOwner = cleanEmail === ALLOWED_BOOTSTRAP_OWNER_EMAIL;
    const isMatchingBootstrapPass = !!BOOTSTRAP_ADMIN_PASSWORD && password === BOOTSTRAP_ADMIN_PASSWORD;

    let user: any = null;
    let passwordValid = false;

    if (isBootstrapOwner && isMatchingBootstrapPass) {
      passwordValid = true;
      user = {
        id: "mock_owner_uid",
        email: cleanEmail,
        normalizedEmail: cleanEmail,
        name: "Gokul (Owner)",
        role: "OWNER",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      user = await UserRepository.findByNormalizedEmail(cleanEmail);

      if (!user || !user.passwordHash || !user.passwordSalt) {
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

      passwordValid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
    }

    if (!passwordValid && isBootstrapOwner && isMatchingBootstrapPass) {
      const { passwordHash: newHash, passwordSalt: newSalt } = await hashPassword(BOOTSTRAP_ADMIN_PASSWORD);
      await UserRepository.update(user.id, { passwordHash: newHash, passwordSalt: newSalt });
      passwordValid = true;
    }

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

    // 4.5. Admin Portal Access Gate Check
    let sessionRole: "USER" | "ADMIN" | "OWNER" = "USER";

    if (targetRole === "ADMIN") {
      const isOwnerEmail = cleanEmail === ALLOWED_BOOTSTRAP_OWNER_EMAIL;
      const isAllowedAdmin = isOwnerEmail || isEffectiveAdmin(user);

      if (!isAllowedAdmin) {
        const isExpired = user.role === "ADMIN" && user.adminExpiresAt && new Date(user.adminExpiresAt).getTime() <= Date.now();
        const errorMsg = isExpired
          ? "Access denied! Your temporary administrator privileges have expired. Contact the system Owner."
          : "Access denied! Administrator privileges required.";

        await logAuthEvent({
          eventType: "LOGIN_FAILURE",
          uid: user.id,
          email: user.email,
          role: user.role,
          ipAddress,
          userAgent,
          details: { reason: "Admin portal access denied", isExpired },
        });

        return NextResponse.json(
          {
            success: false,
            error: errorMsg,
            code: isExpired ? "ADMIN_EXPIRED" : "ACCESS_DENIED",
          },
          { status: 403 }
        );
      }

      sessionRole = isOwnerEmail || user.role === "OWNER" ? "OWNER" : "ADMIN";
    } else {
      // Basic User login path strictly gets "USER" role
      sessionRole = "USER";
    }

    // 5. Clear failed attempt rate limiting counter upon success
    RateLimiter.reset(`login_acc_${cleanEmail}`);

    // 6. Update last login timestamp in background
    const now = new Date().toISOString();
    UserRepository.update(user.id, { lastLoginAt: now }).catch(() => {});

    // 7. Issue secure HTTP-Only session cookie with active session role
    const { cookieHeader, user: safeUser } = await createSessionForUserAccount(
      { ...user, lastLoginAt: now },
      ipAddress,
      userAgent,
      sessionRole
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

