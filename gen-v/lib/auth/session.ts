/**
 * Server-Side Session Management Engine — FactoryOS v1
 */

import { verifyIdTokenServer, getAdminByUid, createSessionCookieServer } from "./firebase-admin";
import { getSessionDurationMs, buildSessionCookieHeader, buildLogoutCookieHeader } from "./cookies";
import { logAuthEvent } from "./audit-logger";
import { AdminUser, AuthSession, UserAccount, SafeUser } from "./types";
import { ForbiddenError, AccountDisabledError } from "./errors";
import { createSignedSessionToken } from "./jwt-session";
import { toSafeUser } from "./user-repository";

export async function createSessionFromIdToken(
  idToken: string,
  isGoogleLogin = false,
  ipAddress?: string,
  userAgent?: string
): Promise<{ cookieHeader: string; user: AdminUser }> {
  // 1. Verify ID Token with Firebase Admin SDK
  const { uid, email } = await verifyIdTokenServer(idToken);

  // 2. Lookup / Bootstrap Admin Profile in Firestore (admins/<uid>)
  const adminUser = await getAdminByUid(uid, email);

  if (!adminUser) {
    await logAuthEvent({
      eventType: "LOGIN_FAILURE",
      uid,
      email,
      ipAddress,
      userAgent,
      details: { reason: "Unauthorized admin email address" },
    });
    throw new ForbiddenError(`Unauthorized admin account: ${email}`);
  }

  if (adminUser.disabled || !adminUser.active) {
    await logAuthEvent({
      eventType: "ACCOUNT_DISABLED",
      uid,
      email,
      role: adminUser.role,
      ipAddress,
      userAgent,
    });
    throw new AccountDisabledError(`Admin account ${email} is currently disabled.`);
  }

  // 3. Generate Firebase Session Cookie String
  const durationMs = getSessionDurationMs();
  const sessionCookieString = await createSessionCookieServer(idToken, durationMs);
  const cookieHeader = buildSessionCookieHeader(sessionCookieString);

  // 4. Record Successful Login Audit Event
  await logAuthEvent({
    eventType: isGoogleLogin ? "GOOGLE_LOGIN" : "LOGIN_SUCCESS",
    uid: adminUser.uid,
    email: adminUser.email,
    role: adminUser.role,
    ipAddress,
    userAgent,
  });

  return { cookieHeader, user: adminUser };
}

export async function createSessionForUserAccount(
  user: UserAccount | SafeUser,
  ipAddress?: string,
  userAgent?: string
): Promise<{ cookieHeader: string; user: SafeUser }> {
  const isUserDisabled = user.status === "DISABLED" || ("disabled" in user && (user as any).disabled);
  const uid = user.id || (user as any).uid;

  if (isUserDisabled) {
    await logAuthEvent({
      eventType: "ACCOUNT_DISABLED",
      uid,
      email: user.email,
      role: user.role,
      ipAddress,
      userAgent,
    });
    throw new AccountDisabledError(`Account ${user.email} is currently disabled.`);
  }

  // Generate signed session cookie
  const durationMs = getSessionDurationMs();
  const sessionToken = createSignedSessionToken(uid, user.email, user.role, durationMs);
  const cookieHeader = buildSessionCookieHeader(sessionToken);

  await logAuthEvent({
    eventType: "LOGIN_SUCCESS",
    uid,
    email: user.email,
    role: user.role,
    ipAddress,
    userAgent,
  });

  const safeUser: SafeUser = "passwordHash" in user ? toSafeUser(user as UserAccount) : (user as SafeUser);
  return { cookieHeader, user: safeUser };
}

export async function destroySession(
  email?: string,
  uid?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  await logAuthEvent({
    eventType: "LOGOUT",
    uid,
    email,
    ipAddress,
    userAgent,
  });
  return buildLogoutCookieHeader();
}
