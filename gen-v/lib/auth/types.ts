/**
 * Production Authentication & Authorization Type Definitions — FactoryOS v1
 */

export type UserRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export interface AdminUser {
  uid: string;
  email: string;
  role: UserRole;
  active: boolean;
  disabled: boolean;
  name?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface AuthSession {
  uid: string;
  email: string;
  role: UserRole;
  active: boolean;
  disabled: boolean;
  issuedAt: number;
  expiresAt: number;
}

export interface AuthState {
  user: AdminUser | null;
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
}

export type AuthAuditEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "PASSWORD_RESET"
  | "GOOGLE_LOGIN"
  | "ROLE_CHANGE"
  | "SESSION_REVOKED"
  | "ACCOUNT_DISABLED";

export interface AuthAuditEvent {
  id: string;
  eventType: AuthAuditEventType;
  uid?: string;
  email?: string;
  role?: UserRole;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
