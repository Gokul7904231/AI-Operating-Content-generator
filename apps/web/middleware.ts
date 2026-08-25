import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "__session";

// Explicit Public Paths (No authentication required)
// NOTE: /prototypes intentionally NOT public — gated behind auth (and ADMIN in app layer)
const PUBLIC_PREFIXES = [
  "/login",
  "/api/published-video",
  "/api/health",
  "/api/auth",
  "/api/render-workers/pair",
  "/api/render-workers/heartbeat",
  "/api/rendering",
  "/_next",
  "/public",
  "/favicon.ico",
  "/demo-short.mp4",
  "/german-quiz.mp4",
  "/german-quiz-poster.jpg",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Exact Root Public Landing Page (/) or Redirect Authenticated Users
  if (pathname === "/") {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 1b. Canonical: /landing → / (temporary 307, not 301)
  if (pathname === "/landing" || pathname.startsWith("/landing/")) {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }

  // 1.5 Canonical Redirects for Legacy / Prototype surfaces (explicit 1:1 mapping — no wildcard)
  if (pathname.startsWith("/new-ui")) {
    if (pathname === "/new-ui" || pathname === "/new-ui/") return NextResponse.redirect(new URL("/dashboard", request.url));
    if (pathname === "/new-ui/dashboard" || pathname.startsWith("/new-ui/dashboard/")) return NextResponse.redirect(new URL("/dashboard", request.url));
    if (pathname === "/new-ui/library" || pathname.startsWith("/new-ui/library/")) return NextResponse.redirect(new URL("/media/library", request.url));
    if (pathname === "/new-ui/engines" || pathname.startsWith("/new-ui/engines/")) return NextResponse.redirect(new URL("/engines", request.url));
    if (pathname === "/new-ui/factory" || pathname.startsWith("/new-ui/factory/")) return NextResponse.redirect(new URL("/factory/jobs", request.url));
    if (pathname === "/new-ui/analytics" || pathname.startsWith("/new-ui/analytics/")) return NextResponse.redirect(new URL("/analytics/heatmaps", request.url));
    if (pathname === "/new-ui/publishing" || pathname.startsWith("/new-ui/publishing/")) return NextResponse.redirect(new URL("/publishing/youtube", request.url));
    if (pathname === "/new-ui/settings" || pathname.startsWith("/new-ui/settings/")) return NextResponse.redirect(new URL("/settings", request.url));
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/dashboard/quiz") {
    return NextResponse.redirect(new URL("/engines/quiz", request.url));
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

  // 5. Protect UI Pages (Redirect to /login if not dev and not authenticated)
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
     * Match all request paths except static files with extensions (e.g. .css, .js, .png, .jpg, .svg, .mp4, .webm)
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mp4|webm|mov|mp3|wav|ogg)$).*)",
  ],
};
