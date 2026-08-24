import { NextRequest, NextResponse } from "next/server";
import { UserRepository, normalizeEmail } from "@/lib/auth/user-repository";
import { hashPassword } from "@/lib/auth/password-hasher";
import { createSessionForUserAccount } from "@/lib/auth/session";
import { validateEmail } from "@/lib/auth/validators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // 1. Email format validation
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address.", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    // 2. Password complexity validation (min 8 chars)
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters long.",
          code: "WEAK_PASSWORD",
        },
        { status: 400 }
      );
    }

    const cleanEmail = normalizeEmail(email);

    // 3. Unique account validation
    const existingUser = await UserRepository.findByNormalizedEmail(cleanEmail);
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email address already exists.",
          code: "DUPLICATE_EMAIL",
        },
        { status: 409 }
      );
    }

    // 4. Secure scrypt password hashing
    const { passwordHash, passwordSalt } = await hashPassword(password);

    // 5. Create user account with default USER role (server-enforced)
    const user = await UserRepository.create({
      email: email.trim(),
      passwordHash,
      passwordSalt,
      name: typeof name === "string" ? name.trim() : undefined,
      role: "USER",
      status: "ACTIVE",
    });

    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    // 6. Issue secure session cookie
    const { cookieHeader, user: safeUser } = await createSessionForUserAccount(user, ipAddress, userAgent);

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      message: "Account created successfully.",
    });

    response.headers.set("Set-Cookie", cookieHeader);
    return response;
  } catch (error: any) {
    console.error("[Auth API] Signup error:", error.message);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again later.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
