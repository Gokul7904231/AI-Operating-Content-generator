import { NextRequest, NextResponse } from "next/server";
import { UserRepository, normalizeEmail } from "@/lib/auth/user-repository";
import { PasswordResetRepository } from "@/lib/auth/password-reset-repository";
import { generateNumericOtp, hashOtp, hashPassword } from "@/lib/auth/password-hasher";
import { BrevoEmailService } from "@/lib/auth/email/BrevoEmailService";
import { RateLimiter, AUTH_RATE_LIMITS } from "@/lib/auth/rate-limiter";
import { logAuthEvent } from "@/lib/auth/audit-logger";

const GENERIC_RESPONSE_MESSAGE = "If an account exists for that email, a verification code has been sent.";
const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: true, message: GENERIC_RESPONSE_MESSAGE });
    }

    const cleanEmail = normalizeEmail(email);

    // 1. Rate limiting per account and IP
    const ipRate = RateLimiter.check(`forgot_ip_${ipAddress}`, AUTH_RATE_LIMITS.FORGOT_PASSWORD_PER_IP.max, AUTH_RATE_LIMITS.FORGOT_PASSWORD_PER_IP.windowMs);
    const emailRate = RateLimiter.check(`forgot_email_${cleanEmail}`, AUTH_RATE_LIMITS.FORGOT_PASSWORD_PER_EMAIL.max, AUTH_RATE_LIMITS.FORGOT_PASSWORD_PER_EMAIL.windowMs);

    if (!ipRate.allowed || !emailRate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many reset requests. Please wait a few minutes before trying again.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    // 2. Query user record
    const user = await UserRepository.findByNormalizedEmail(cleanEmail);

    if (user && user.status === "ACTIVE") {
      // 3. Generate cryptographically random 6-digit OTP
      const otp = generateNumericOtp();
      const otpHash = hashOtp(otp);
      const expiresAt = Date.now() + OTP_EXPIRY_MS;

      // 4. Record reset challenge in repository (invalidates previous challenges)
      await PasswordResetRepository.createChallenge({
        userId: user.id,
        email: user.email,
        otpHash,
        expiresAt,
        maxAttempts: 5,
      });

      // 5. Dispatch transactional email via Brevo SMTP
      await BrevoEmailService.sendPasswordResetOtp({
        to: user.email,
        otp,
        expiresInMinutes: 15,
      });

      await logAuthEvent({
        eventType: "PASSWORD_RESET",
        uid: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        details: { action: "OTP_DISPATCHED" },
      });
    } else {
      // Equalize execution timing to prevent email enumeration
      await hashPassword("timing_mitigation_dummy_hash");
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_RESPONSE_MESSAGE,
    });
  } catch (error: any) {
    console.error("[Auth API] Forgot password error:", error.message);
    return NextResponse.json({
      success: true,
      message: GENERIC_RESPONSE_MESSAGE,
    });
  }
}
