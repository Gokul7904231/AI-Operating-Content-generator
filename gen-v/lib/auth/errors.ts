/**
 * Custom Authentication & Authorization Exceptions — FactoryOS v1
 */

export class AuthError extends Error {
  constructor(message: string, public code: string = "AUTH_ERROR", public status: number = 401) {
    super(message);
    this.name = "AuthError";
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = "Authentication required to access this resource") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = "You do not have permission to perform this action") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class AccountDisabledError extends AuthError {
  constructor(message: string = "This admin account has been disabled") {
    super(message, "ACCOUNT_DISABLED", 403);
    this.name = "AccountDisabledError";
  }
}

export class RateLimitExceededError extends AuthError {
  constructor(message: string = "Too many authentication attempts. Please try again later.") {
    super(message, "RATE_LIMIT_EXCEEDED", 429);
    this.name = "RateLimitExceededError";
  }
}

/**
 * Cleanly maps raw Firebase SDK error codes/messages to human-readable strings
 */
export function formatAuthErrorMessage(err: any): string {
  if (!err) return "An unknown authentication error occurred.";
  
  const code = err.code || "";
  const msg = typeof err === "string" ? err : err.message || String(err);

  if (code === "auth/invalid-credential" || msg.includes("auth/invalid-credential")) {
    return "Invalid email address or password. Please check your credentials and try again.";
  }
  if (code === "auth/user-not-found" || msg.includes("auth/user-not-found")) {
    return "No account found matching this email address.";
  }
  if (code === "auth/wrong-password" || msg.includes("auth/wrong-password")) {
    return "Incorrect password. Please try again or click 'Forgot?' to reset.";
  }
  if (code === "auth/invalid-email" || msg.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (code === "auth/too-many-requests" || msg.includes("auth/too-many-requests")) {
    return "Access temporarily blocked due to multiple failed attempts. Please try again in a few minutes.";
  }
  if (code === "auth/user-disabled" || msg.includes("auth/user-disabled")) {
    return "This admin account has been disabled. Please contact system support.";
  }
  if (code === "auth/popup-closed-by-user" || msg.includes("auth/popup-closed-by-user")) {
    return "Google sign-in window was closed before completing authentication.";
  }
  if (code === "auth/network-request-failed" || msg.includes("auth/network-request-failed")) {
    return "Network connection issue. Please check your internet connection and try again.";
  }

  // Strip raw "Firebase: Error (auth/...)." prefix if any other unhandled code matches
  if (msg.startsWith("Firebase:")) {
    const cleaned = msg.replace(/^Firebase:\s*Error\s*\([^)]+\)\.?\s*/i, "").trim();
    return cleaned || "Authentication failed.";
  }

  return msg;
}

