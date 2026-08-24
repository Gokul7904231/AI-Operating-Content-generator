/**
 * Production Authentication & Authorization Type Definitions — FactoryOS v1
 */

export type UserRole = "OWNER" | "ADMIN" | "USER" | "EDITOR" | "VIEWER";
export type UserStatus = "ACTIVE" | "DISABLED";

export interface UserAccount {
  id: string;
  email: string;
  normalizedEmail: string;
  name?: string;
  photoURL?: string;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  adminExpiresAt?: string | null; // ISO timestamp string or null for permanent
  proxyAdminGrantedBy?: string;
  proxyAdminGrantedAt?: string;
}

export type SafeUser = Omit<UserAccount, "passwordHash" | "passwordSalt"> & {
  uid: string;
  active: boolean;
  disabled: boolean;
  isProxyAdmin?: boolean;
  isExpiredAdmin?: boolean;
};

export interface PasswordResetChallenge {
  id: string;
  userId: string;
  email: string;
  normalizedEmail: string;
  otpHash: string;
  createdAt: string;
  expiresAt: number; // Unix timestamp in ms
  attempts: number;
  maxAttempts: number;
  consumedAt?: string;
  resetTokenHash?: string;
  resetTokenExpiresAt?: number;
}

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
  adminExpiresAt?: string | null;
  proxyAdminGrantedBy?: string;
  proxyAdminGrantedAt?: string;
  isProxyAdmin?: boolean;
  isExpiredAdmin?: boolean;
}

export interface AuthSession {
  uid: string;
  email: string;
  role: UserRole;
  active: boolean;
  disabled: boolean;
  issuedAt: number;
  expiresAt: number;
  adminExpiresAt?: string | null;
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
