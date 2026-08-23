/**
 * Authentication Audit Logging Engine — FactoryOS v1
 */

import { AuthAuditEvent, AuthAuditEventType, UserRole } from "./types";
import { db } from "./firebase-admin";

const inMemoryAuditLogs: AuthAuditEvent[] = [];

export async function logAuthEvent(params: {
  eventType: AuthAuditEventType;
  uid?: string;
  email?: string;
  role?: UserRole;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}): Promise<AuthAuditEvent> {
  const event: AuthAuditEvent = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    eventType: params.eventType,
    uid: params.uid,
    email: params.email,
    role: params.role,
    ipAddress: params.ipAddress || "127.0.0.1",
    userAgent: params.userAgent || "Unknown",
    details: params.details,
    timestamp: new Date().toISOString(),
  };

  // Always keep in-memory audit log for fast diagnostic inspection
  inMemoryAuditLogs.unshift(event);
  if (inMemoryAuditLogs.length > 500) {
    inMemoryAuditLogs.pop();
  }

  // Persist to Firestore asynchronously in background if available
  if (db) {
    const firestoreData = JSON.parse(JSON.stringify(event));
    db.collection("auth_audit")
      .doc(event.id)
      .set(firestoreData)
      .catch((err: any) => {
        console.warn("[AuthAuditLogger] Failed to persist audit event to Firestore:", err.message);
      });
  }

  console.log(`[AuthAudit] ${event.timestamp} | ${event.eventType} | Email: ${event.email || "N/A"} | Role: ${event.role || "N/A"}`);
  return event;
}

export function getInMemoryAuditLogs(): AuthAuditEvent[] {
  return [...inMemoryAuditLogs];
}
