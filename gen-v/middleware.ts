import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "__session";

// Explicit Public Paths (No authentication required)
const PUBLIC_PREFIXES = [
  "/login",
  "/prototypes",
  "/api/published-video",
  "/api/health",
  "/api/auth",
  "/api/render-workers/pair",
  "/api/render-workers/heartbeat",
  "/_next",
  "/public",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Exact Root Public Landing Page (/)
  if (pathname === "/") {
    return NextResponse.next();
  }

  // 2. Check if Path is Explicitly Exempt / Public
  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );

  if (isPublic) {
    // If authenticated user visits /login, redirect to /dashboard
    if (pathname === "/login") {
      const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (sessionCookie) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Extract Session Cookie & API Secret Key
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization");
  const queryKey = request.nextUrl.searchParams.get("key");
  const secretKey = process.env.INTERNAL_API_SECRET_KEY;

  const isSecretKeyValid =
    !!secretKey && (authHeader === `Bearer ${secretKey}` || authHeader === secretKey || queryKey === secretKey);

  const isAuthenticated = !!sessionCookie || isSecretKeyValid;

  // 4. Protect API Endpoints (Fail-Closed 401)
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return NextResponse.json(
        {
          error: "Unauthorized: Access to FactoryOS API requires an active admin session or secret key.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 5. Protect UI Pages (Redirect to /login)
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files with extensions (e.g. .css, .js, .png, .jpg, .svg)
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
