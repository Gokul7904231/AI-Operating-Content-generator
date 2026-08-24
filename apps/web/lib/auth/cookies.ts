/**
 * HTTP-Only Cookie Management — FactoryOS v1
 */

import { SESSION_COOKIE_NAME, DEFAULT_SESSION_DURATION_HOURS } from "./constants";

export function getSessionDurationMs(): number {
  const envHours = process.env.AUTH_SESSION_DURATION_HOURS;
  const hours = envHours ? parseInt(envHours, 10) : DEFAULT_SESSION_DURATION_HOURS;
  return (isNaN(hours) ? DEFAULT_SESSION_DURATION_HOURS : hours) * 60 * 60 * 1000;
}

export function buildSessionCookieHeader(sessionCookieString: string): string {
  const durationMs = getSessionDurationMs();
  const maxAge = Math.floor(durationMs / 1000);
  const isProd = process.env.NODE_ENV === "production";

  return `${SESSION_COOKIE_NAME}=${sessionCookieString}; Path=/; Max-Age=${maxAge}; HttpOnly; ${isProd ? "Secure; " : ""}SameSite=Lax`;
}

export function buildLogoutCookieHeader(): string {
  const isProd = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; ${isProd ? "Secure; " : ""}SameSite=Lax`;
}
