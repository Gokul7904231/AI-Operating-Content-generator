import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth/user-repository";
import { PasswordResetRepository } from "@/lib/auth/password-reset-repository";
import { verifyOtpHash, generateResetAuthToken, hashResetToken } from "@/lib/auth/password-hasher";
import { RateLimiter, AUTH_RATE_LIMITS } from "@/lib/auth/rate-limiter";
import { logAuthEvent } from "@/lib/auth/audit-logger";

const RESET_AUTH_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    if (!email || !otp || typeof email !== "string" || typeof otp !== "string") {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required.", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    // 1. IP-level rate limiting
    const ipRate = RateLimiter.check(`verify_otp_ip_${ipAddress}`, AUTH_RATE_LIMITS.VERIFY_OTP_PER_IP.max, AUTH_RATE_LIMITS.VERIFY_OTP_PER_IP.windowMs);
    if (!ipRate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Please wait a moment before trying again.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    const cleanEmail = normalizeEmail(email);

    // 2. Query active reset challenge
    const challenge = await PasswordResetRepository.findActiveByNormalizedEmail(cleanEmail);

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "The verification code is invalid or has expired.", code: "INVALID_CODE" },
        { status: 400 }
      );
    }

    // 3. Expiration check
    if (Date.now() > challenge.expiresAt) {
      return NextResponse.json(
        { success: false, error: "The verification code has expired. Please request a new code.", code: "CODE_EXPIRED" },
        { status: 400 }
      );
    }

    // 4. Single-use consumed check
    if (challenge.consumedAt) {
      return NextResponse.json(
        { success: false, error: "This verification code has already been used.", code: "CODE_CONSUMED" },
        { status: 400 }
      );
    }

    // 5. Attempt limit check
    if (challenge.attempts >= challenge.maxAttempts) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many incorrect attempts. Please request a new verification code.",
          code: "MAX_ATTEMPTS_EXCEEDED",
        },
        { status: 429 }
      );
    }

    // 6. Constant-time OTP comparison
    const isOtpValid = verifyOtpHash(otp.trim(), challenge.otpHash);

    if (!isOtpValid) {
      await PasswordResetRepository.incrementAttempts(challenge.id);
      
      await logAuthEvent({
        eventType: "PASSWORD_RESET",
        email: cleanEmail,
        ipAddress,
        userAgent,
        details: { action: "OTP_VERIFY_FAILED" },
      });

      return NextResponse.json(
        { success: false, error: "Incorrect verification code. Please check and try again.", code: "INVALID_CODE" },
        { status: 400 }
      );
    }

    // 7. Issue short-lived reset authorization token
    const resetAuthToken = generateResetAuthToken();
    const resetTokenHash = hashResetToken(resetAuthToken);
    const resetTokenExpiresAt = Date.now() + RESET_AUTH_TOKEN_EXPIRY_MS;

    await PasswordResetRepository.markConsumedWithResetToken(challenge.id, resetTokenHash, resetTokenExpiresAt);

    await logAuthEvent({
      eventType: "PASSWORD_RESET",
      email: cleanEmail,
      ipAddress,
      userAgent,
      details: { action: "OTP_VERIFY_SUCCESS" },
    });

    return NextResponse.json({
      success: true,
      resetToken: resetAuthToken,
      message: "Code verified successfully.",
    });
  } catch (error: any) {
    console.error("[Auth API] Verify reset code error:", error.message);
    return NextResponse.json(
      { success: false, error: "Verification failed. Please try again later.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
