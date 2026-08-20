/**
 * Cryptographic Signed Session Engine — FactoryOS v1
 * 
 * Provides HMAC-SHA256 signed session cookies for local/custom auth and Firebase fallback.
 */

import crypto from "crypto";
import { UserRole } from "./types";

const SESSION_SECRET = process.env.INTERNAL_API_SECRET_KEY || "factoryos-session-secret-2026";

export interface SessionPayload {
  uid: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export function createSignedSessionToken(uid: string, email: string, role: UserRole, durationMs: number): string {
  const now = Date.now();
  const payload: SessionPayload = {
    uid,
    email: email.toLowerCase().trim(),
    role,
    iat: now,
    exp: now + durationMs,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");

  return `fos_${payloadB64}.${signature}`;
}

export function verifySignedSessionToken(token: string): SessionPayload | null {
  if (!token || !token.startsWith("fos_")) return null;

  try {
    const withoutPrefix = token.substring(4);
    const parts = withoutPrefix.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as SessionPayload;

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
