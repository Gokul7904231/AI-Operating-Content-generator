import { NextRequest, NextResponse } from "next/server";
import { createSessionFromIdToken, destroySession } from "@/lib/auth/session";
import { verifySession } from "@/lib/auth/auth";
import { isEffectiveAdmin } from "@/lib/auth/roles";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, isGoogleLogin, targetRole } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ success: false, error: "idToken is required" }, { status: 400 });
    }

    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    const { cookieHeader, user } = await createSessionFromIdToken(idToken, !!isGoogleLogin, ipAddress, userAgent);

    if (targetRole === "ADMIN") {
      if (!isEffectiveAdmin(user)) {
        return NextResponse.json(
          {
            success: false,
            error: "Access denied! Google account is not an authorized administrator.",
            code: "ACCESS_DENIED",
          },
          { status: 403 }
        );
      }
    }

    const response = NextResponse.json({ success: true, user });
    response.headers.set("Set-Cookie", cookieHeader);
    return response;
  } catch (error: any) {
    const status = error.status || 401;
    return NextResponse.json(
      { success: false, error: error.message || "Session establishment failed", code: error.code || "AUTH_FAILED" },
      { status }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    let email: string | undefined;
    let uid: string | undefined;

    try {
      const { user } = await verifySession(request);
      email = user.email;
      uid = user.uid;
    } catch {
      // Ignore session verification error on logout
    }

    const logoutCookieHeader = await destroySession(email, uid, ipAddress, userAgent);
    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.headers.set("Set-Cookie", logoutCookieHeader);
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}
