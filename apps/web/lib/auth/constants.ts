/**
 * Authentication System Constants — FactoryOS v1
 */

export const SESSION_COOKIE_NAME = "__session";
export const DEFAULT_SESSION_DURATION_HOURS = 168; // 7 days (168 hours)

export const ALLOWED_BOOTSTRAP_OWNER_EMAIL = (process.env.BOOTSTRAP_OWNER_EMAIL || "gokul32499@gmail.com").toLowerCase().trim();
export const BOOTSTRAP_ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || "Gokul#333";

export const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  EDITOR: 2,
  USER: 1,
  VIEWER: 1,
};

export const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/published-video",
  "/api/health",
  "/favicon.ico",
  "/_next",
  "/public",
];

export const PUBLIC_API_PATHS = [
  "/api/health",
  "/api/published-video",
  "/api/auth/session",
];
