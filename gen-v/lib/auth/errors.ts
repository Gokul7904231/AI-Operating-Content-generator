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
