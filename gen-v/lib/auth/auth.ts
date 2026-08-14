/**
 * Server-Side Authentication & Authorization Middleware Helpers — FactoryOS v1
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./constants";
import { verifySessionCookieServer, getAdminByUid } from "./firebase-admin";
import { isRoleAtLeast } from "./roles";
import { AdminUser, UserRole } from "./types";
import { UnauthorizedError, ForbiddenError, AccountDisabledError } from "./errors";

/**
 * Step 1: Verify Authentication (Session Cookie or Internal Secret Key)
 */
export async function verifySession(request: NextRequest | Request): Promise<{ user: AdminUser; isSecretKey: boolean }> {
  // Check Internal Secret Key Header
  const headers = request.headers;
  const authHeader = headers.get("authorization");
  const secretKey = process.env.INTERNAL_API_SECRET_KEY;

  if (secretKey && (authHeader === `Bearer ${secretKey}` || authHeader === secretKey)) {
    return {
      user: {
        uid: "system_internal_service",
        email: "system@factoryos.internal",
        role: "OWNER",
        active: true,
        disabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isSecretKey: true,
    };
  }

  // Extract HTTP-Only Cookie
  let cookieValue: string | undefined;
  if ("cookies" in request && typeof request.cookies.get === "function") {
    cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    const cookieHeader = headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
    cookieValue = match ? decodeURIComponent(match[1]) : undefined;
  }

  if (!cookieValue) {
    throw new UnauthorizedError("Session cookie missing or expired. Please sign in.");
  }

  // Verify Session Cookie
  const { uid, email } = await verifySessionCookieServer(cookieValue);
  const adminUser = await getAdminByUid(uid, email);

  if (!adminUser) {
    throw new ForbiddenError(`Admin record not found for account: ${email}`);
  }

  if (adminUser.disabled || !adminUser.active) {
    throw new AccountDisabledError(`Admin account ${email} is disabled.`);
  }

  return { user: adminUser, isSecretKey: false };
}

/**
 * Step 2: Verify Authorization (Role Hierarchy Check)
 */
export function verifyRole(user: AdminUser, requiredRole?: UserRole): void {
  if (!requiredRole) return;
  if (!isRoleAtLeast(user.role, requiredRole)) {
    throw new ForbiddenError(`Insufficient permissions. Required role: ${requiredRole}, current role: ${user.role}`);
  }
}

/**
 * Combined Auth Guard for API Route Handlers (verifySession -> verifyRole -> execute)
 */
export async function verifyAuthAndRole(
  request: NextRequest | Request,
  requiredRole?: UserRole
): Promise<AdminUser> {
  const { user } = await verifySession(request);
  verifyRole(user, requiredRole);
  return user;
}

/**
 * Step 3: Verify Write Permission (Prevents VIEWER role from mutation operations)
 */
export function verifyWritePermission(user: AdminUser): void {
  if (user.role === "VIEWER") {
    throw new ForbiddenError("Read-only access: VIEWER role cannot perform create, edit, or delete operations.");
  }
}
