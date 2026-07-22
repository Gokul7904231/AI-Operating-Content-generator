import type { RateLimiterProvider } from "./index";

class RedisRateLimiterClass implements RateLimiterProvider {
  async allow(ip: string, limit: number, windowSec: number): Promise<boolean> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn("[RedisRateLimiter] Upstash credentials missing, falling back to memory allow.");
      return true; // fail open
    }

    try {
      const key = `rate_limit:${ip}`;
      const now = Math.floor(Date.now() / 1000);
      const minTime = now - windowSec;

      // Pipeline evaluation: remove older entries, add new entries, count total entries inside the window
      const commands = [
        ["ZREMRANGEBYSCORE", key, "-inf", String(minTime)],
        ["ZADD", key, String(now), `${now}_${Math.random().toString(36).slice(2, 6)}`],
        ["ZCARD", key],
        ["EXPIRE", key, String(windowSec)],
      ];

      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(commands),
      });

      if (!res.ok) throw new Error(res.statusText);
      const results = await res.json();
      
      const count = Number(results[2]?.result ?? 0);
      return count <= limit;

    } catch (err: any) {
      console.error("[RedisRateLimiter] Pipeline query failed:", err.message);
      return true; // fail open in SRE context
    }
  }
}

export const RedisRateLimiter = new RedisRateLimiterClass();
