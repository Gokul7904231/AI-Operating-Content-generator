import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/lib/auth/user-repository";
import { PasswordResetRepository } from "@/lib/auth/password-reset-repository";
import { hashResetToken, hashPassword } from "@/lib/auth/password-hasher";
import { RateLimiter, AUTH_RATE_LIMITS } from "@/lib/auth/rate-limiter";
import { logAuthEvent } from "@/lib/auth/audit-logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resetToken, newPassword, confirmPassword } = body;

    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    if (!resetToken || typeof resetToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid or missing reset authorization.", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long.", code: "WEAK_PASSWORD" },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match.", code: "PASSWORD_MISMATCH" },
        { status: 400 }
      );
    }

    // 1. IP rate limiting
    const ipRate = RateLimiter.check(`reset_pwd_ip_${ipAddress}`, AUTH_RATE_LIMITS.RESET_PASSWORD_PER_IP.max, AUTH_RATE_LIMITS.RESET_PASSWORD_PER_IP.windowMs);
    if (!ipRate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Please try again in a few minutes.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    // 2. Lookup challenge by hashed reset authorization token
    const resetTokenHash = hashResetToken(resetToken);
    const challenge = await PasswordResetRepository.findByResetTokenHash(resetTokenHash);

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Reset authorization is invalid or has already been used.", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    // 3. Expiration check for reset authorization
    if (!challenge.resetTokenExpiresAt || Date.now() > challenge.resetTokenExpiresAt) {
      return NextResponse.json(
        { success: false, error: "Reset authorization has expired. Please request a new code.", code: "TOKEN_EXPIRED" },
        { status: 400 }
      );
    }

    // 4. Locate user record
    const user = await UserRepository.findById(challenge.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found.", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 5. Scrypt hash the new password
    const { passwordHash, passwordSalt } = await hashPassword(newPassword);

    // 6. Update user's password record
    await UserRepository.update(user.id, {
      passwordHash,
      passwordSalt,
    });

    // 7. Invalidate all outstanding challenges for this user
    await PasswordResetRepository.invalidateAllForUser(user.id);

    await logAuthEvent({
      eventType: "PASSWORD_RESET",
      uid: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      details: { action: "PASSWORD_RESET_SUCCESS" },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successful. Please sign in with your new password.",
    });
  } catch (error: any) {
    console.error("[Auth API] Reset password error:", error.message);
    return NextResponse.json(
      { success: false, error: "Password reset failed. Please try again later.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
