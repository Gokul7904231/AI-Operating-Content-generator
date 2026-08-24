/**
 * Production Rate Limiter & Abuse Prevention Engine — FactoryOS v1
 * 
 * Supports IP-based and Account-based sliding windows for critical auth endpoints.
 */

interface RateLimitRecord {
  count: number;
  firstTimestamp: number;
  lastTimestamp: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export class RateLimiter {
  /**
   * Evaluates a rate limit key against max requests within a time window.
   */
  static check(key: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const cleanKey = key.toLowerCase().trim();
    const entry = rateLimitStore.get(cleanKey);

    if (!entry || now - entry.firstTimestamp > windowMs) {
      rateLimitStore.set(cleanKey, {
        count: 1,
        firstTimestamp: now,
        lastTimestamp: now,
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (entry.count >= maxRequests) {
      const retryAfterMs = Math.max(0, windowMs - (now - entry.firstTimestamp));
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
      };
    }

    entry.count += 1;
    entry.lastTimestamp = now;
    rateLimitStore.set(cleanKey, entry);
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
    };
  }

  /**
   * Resets rate limit for a key upon successful completion (e.g. successful login).
   */
  static reset(key: string): void {
    rateLimitStore.delete(key.toLowerCase().trim());
  }

  /**
   * Test helper to clear rate limit store in vitest.
   */
  static _resetForTesting(): void {
    rateLimitStore.clear();
  }
}

/**
 * Standard Auth Rate Limit Policies
 */
export const AUTH_RATE_LIMITS = {
  LOGIN_PER_ACCOUNT: { max: 5, windowMs: 5 * 60 * 1000 }, // 5 failures per 5 minutes
  LOGIN_PER_IP: { max: 20, windowMs: 5 * 60 * 1000 }, // 20 attempts per 5 minutes
  FORGOT_PASSWORD_PER_EMAIL: { max: 3, windowMs: 15 * 60 * 1000 }, // 3 requests per 15 minutes
  FORGOT_PASSWORD_PER_IP: { max: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
  RESET_PASSWORD_PER_IP: { max: 10, windowMs: 10 * 60 * 1000 }, // 10 attempts per 10 minutes
  VERIFY_OTP_PER_IP: { max: 15, windowMs: 10 * 60 * 1000 }, // 15 verification requests per 10 minutes
};
