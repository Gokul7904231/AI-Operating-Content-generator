/**
 * Pluggable Rate Limiter
 *
 * Directs traffic through sliding window checks.
 * Resolves to memory caches during local development, or Redis (Upstash) in production.
 */

export interface RateLimiterProvider {
  allow(ip: string, limit: number, windowSec: number): Promise<boolean>;
}

import { MemoryRateLimiter } from "./memory";
import { RedisRateLimiter } from "./redis";

export const RateLimiter: RateLimiterProvider =
  process.env.NODE_ENV === "production" && process.env.UPSTASH_REDIS_REST_URL
    ? RedisRateLimiter
    : MemoryRateLimiter;
