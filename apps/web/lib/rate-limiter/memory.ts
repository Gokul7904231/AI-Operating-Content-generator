import type { RateLimiterProvider } from "./index";

class MemoryRateLimiterClass implements RateLimiterProvider {
  private cache = new Map<string, number[]>();

  async allow(ip: string, limit: number, windowSec: number): Promise<boolean> {
    const now = Date.now();
    const windowMs = windowSec * 1000;
    
    let timestamps = this.cache.get(ip) ?? [];
    // Filter timestamps outside window bounds
    timestamps = timestamps.filter((t) => now - t < windowMs);
    
    if (timestamps.length >= limit) {
      return false;
    }
    
    timestamps.push(now);
    this.cache.set(ip, timestamps);
    return true;
  }
}

export const MemoryRateLimiter = new MemoryRateLimiterClass();
