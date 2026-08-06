import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "__session";

// UI Routes that require authentication
const PROTECTED_UI_PATHS = [
  "/dashboard",
  "/admin",
  "/analytics",
  "/media",
  "/factory",
  "/engines",
  "/publishing",
  "/settings",
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_PATHS = ["/login"];

// Public API endpoints accessible without authentication
const PUBLIC_API_PATHS = [
  "/api/health",
  "/api/published-video",
  "/api/auth/session",
  "/api/media/thumb/",
  "/api/engines",
  "/api/templates",
  "/api/tts/voices",
  "/api/voice/registry",
  "/api/voice-pair",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = !!sessionCookie?.value;

  // 1. Fail-Closed API Control Route Protection
  if (pathname.startsWith("/api/")) {
    const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(p));
    if (!isPublicApi) {
      const authHeader = request.headers.get("authorization");
      const queryKey = request.nextUrl.searchParams.get("key");
      const secretKey = process.env.INTERNAL_API_SECRET_KEY;

      const isSecretKeyValid = !!secretKey && (authHeader === `Bearer ${secretKey}` || queryKey === secretKey);

      if (!isAuthenticated && !isSecretKeyValid) {
        return NextResponse.json(
          { error: "Unauthorized: FactoryOS production control endpoints require server authentication." },
          { status: 401 }
        );
      }
    }
    return NextResponse.next();
  }

  // 2. UI Page Protection
  const isProtected = PROTECTED_UI_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/analytics/:path*",
    "/media/:path*",
    "/factory/:path*",
    "/engines/:path*",
    "/publishing/:path*",
    "/settings/:path*",
    "/login",
    "/api/:path*",
  ],
};
