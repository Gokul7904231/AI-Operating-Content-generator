/**
 * Auth Validation & Rate Limiting Helpers — FactoryOS v1
 */

const attemptMap = new Map<string, { count: number; firstAttempt: number }>();

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase().trim());
}

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 600000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = attemptMap.get(key);

  if (!entry || now - entry.firstAttempt > windowMs) {
    attemptMap.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  attemptMap.set(key, entry);
  return { allowed: true, remaining: maxAttempts - entry.count };
}

export function resetRateLimit(key: string): void {
  attemptMap.delete(key);
}
