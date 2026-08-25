import { db } from "../firebase-admin";
import { isAdminUser } from "../auth/roles";

export const getBasicGenerationLimit = (): number => {
  const parsed = parseInt(process.env.BASIC_GENERATION_LIMIT || "5", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
};

export const MAX_BASIC_USER_VIDEOS = getBasicGenerationLimit();
export const MAX_PRO_USER_VIDEOS = 8;

export type QuotaPeriodType = "LIFETIME" | "CALENDAR_MONTH" | "SUBSCRIPTION_PERIOD";

export interface UserQuotaInfo {
  userId: string;
  tier: "BASIC" | "PRO" | "ADMIN" | "OWNER";
  periodType: QuotaPeriodType;
  periodStart?: string;
  periodEnd?: string;
  limit: number;
  completed: number;
  reserved: number;
  totalUsed: number;
  remaining: number;
  isUnlimited: boolean;
  isExceeded: boolean;
}

export class QuotaExceededError extends Error {
  public status = 429;
  public quotaInfo: UserQuotaInfo;

  constructor(message: string, quotaInfo: UserQuotaInfo) {
    super(message);
    this.name = "QuotaExceededError";
    this.quotaInfo = quotaInfo;
  }
}

/**
 * Computes the calendar month period bounds in UTC.
 */
export function getCalendarMonthBounds(date: Date = new Date()): { periodKey: string; start: string; end: string } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-11
  const periodKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
  const nextMonth = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  const end = new Date(nextMonth.getTime() - 1).toISOString();

  return { periodKey, start, end };
}

/**
 * Resolves user tier from role string.
 */
export function resolveTier(role: string = "USER"): "BASIC" | "PRO" | "ADMIN" | "OWNER" {
  const norm = role.toUpperCase();
  if (norm === "OWNER") return "OWNER";
  if (norm === "ADMIN") return "ADMIN";
  if (norm === "PRO") return "PRO";
  return "BASIC";
}

/**
 * Calculates current authoritative quota state for a user.
 */
export async function getUserQuota(userId: string, role: string = "USER"): Promise<UserQuotaInfo> {
  if (!userId) {
    throw new Error("userId is required to query quota");
  }

  const tier = resolveTier(role);
  const isUnlimited = tier === "ADMIN" || tier === "OWNER";

  if (isUnlimited) {
    return {
      userId,
      tier,
      periodType: "LIFETIME",
      limit: Infinity,
      completed: 0,
      reserved: 0,
      totalUsed: 0,
      remaining: Infinity,
      isUnlimited: true,
      isExceeded: false,
    };
  }

  if (tier === "PRO") {
    const { periodKey, start, end } = getCalendarMonthBounds();
    const quotaRef = db.collection("quotas").doc(`${userId}_${periodKey}`);
    const quotaDoc = await quotaRef.get();

    let completed = 0;
    let reserved = 0;

    if (quotaDoc.exists) {
      const data = quotaDoc.data() || {};
      completed = typeof data.completed === "number" ? data.completed : 0;
      const reservedSlots = data.reservedSlots || {};
      reserved = Object.keys(reservedSlots).length;
    } else {
      // Fallback: check videos in this month
      try {
        const videosSnapshot = await db
          .collection("videos")
          .where("userId", "==", userId)
          .where("createdAt", ">=", start)
          .where("createdAt", "<=", end)
          .where("status", "==", "completed")
          .get();
        completed = videosSnapshot.docs.length;
      } catch {
        completed = 0;
      }
    }

    const totalUsed = completed + reserved;
    const remaining = Math.max(0, MAX_PRO_USER_VIDEOS - totalUsed);
    const isExceeded = totalUsed >= MAX_PRO_USER_VIDEOS;

    return {
      userId,
      tier: "PRO",
      periodType: "CALENDAR_MONTH",
      periodStart: start,
      periodEnd: end,
      limit: MAX_PRO_USER_VIDEOS,
      completed,
      reserved,
      totalUsed,
      remaining,
      isUnlimited: false,
      isExceeded,
    };
  }

  // BASIC TIER (Lifetime 5 Videos)
  const quotaRef = db.collection("quotas").doc(userId);
  const quotaDoc = await quotaRef.get();

  let completed = 0;
  let reserved = 0;

  if (quotaDoc.exists) {
    const data = quotaDoc.data() || {};
    completed = typeof data.completed === "number" ? data.completed : 0;
    const reservedSlots = data.reservedSlots || {};
    reserved = Object.keys(reservedSlots).length;
  } else {
    try {
      const videosSnapshot = await db
        .collection("videos")
        .where("userId", "==", userId)
        .where("status", "==", "completed")
        .get();
      completed = videosSnapshot.docs.length;
    } catch {
      completed = 0;
    }
  }

  const basicLimit = getBasicGenerationLimit();
  const totalUsed = completed + reserved;
  const remaining = Math.max(0, basicLimit - totalUsed);
  const isExceeded = totalUsed >= basicLimit;

  return {
    userId,
    tier: "BASIC",
    periodType: "LIFETIME",
    limit: basicLimit,
    completed,
    reserved,
    totalUsed,
    remaining,
    isUnlimited: false,
    isExceeded,
  };
}

/**
 * Concurrency-safe atomic quota reservation.
 */
export async function reserveGenerationSlot(
  userId: string,
  role: string,
  jobId: string
): Promise<{ success: boolean; quota: UserQuotaInfo }> {
  if (!userId) {
    throw new Error("userId is required to reserve quota");
  }
  if (!jobId) {
    throw new Error("jobId is required to reserve quota");
  }

  const tier = resolveTier(role);

  // Admin and Owner go through standard reservation for ledger audit without limit constraints
  if (tier === "ADMIN" || tier === "OWNER") {
    return {
      success: true,
      quota: {
        userId,
        tier,
        periodType: "LIFETIME",
        limit: Infinity,
        completed: 0,
        reserved: 0,
        totalUsed: 0,
        remaining: Infinity,
        isUnlimited: true,
        isExceeded: false,
      },
    };
  }

  const isPro = tier === "PRO";
  const { periodKey, start, end } = getCalendarMonthBounds();
  const quotaDocId = isPro ? `${userId}_${periodKey}` : userId;
  const maxLimit = isPro ? MAX_PRO_USER_VIDEOS : getBasicGenerationLimit();
  const quotaRef = db.collection("quotas").doc(quotaDocId);

  return await db.runTransaction(async (transaction: any) => {
    const doc = await transaction.get(quotaRef);
    let completed = 0;
    let reservedSlots: Record<string, { jobId: string; reservedAt: string }> = {};

    if (doc.exists) {
      const data = doc.data() || {};
      completed = typeof data.completed === "number" ? data.completed : 0;
      reservedSlots = { ...(data.reservedSlots || {}) };
    }

    // Idempotency: if this exact jobId was already reserved, allow through
    if (reservedSlots[jobId]) {
      const totalUsed = completed + Object.keys(reservedSlots).length;
      return {
        success: true,
        quota: {
          userId,
          tier,
          periodType: isPro ? "CALENDAR_MONTH" : "LIFETIME",
          periodStart: isPro ? start : undefined,
          periodEnd: isPro ? end : undefined,
          limit: maxLimit,
          completed,
          reserved: Object.keys(reservedSlots).length,
          totalUsed,
          remaining: Math.max(0, maxLimit - totalUsed),
          isUnlimited: false,
          isExceeded: false,
        },
      };
    }

    // Check quota capacity
    const activeReservedCount = Object.keys(reservedSlots).length;
    const currentTotal = completed + activeReservedCount;

    if (currentTotal >= maxLimit) {
      const info: UserQuotaInfo = {
        userId,
        tier,
        periodType: isPro ? "CALENDAR_MONTH" : "LIFETIME",
        periodStart: isPro ? start : undefined,
        periodEnd: isPro ? end : undefined,
        limit: maxLimit,
        completed,
        reserved: activeReservedCount,
        totalUsed: currentTotal,
        remaining: 0,
        isUnlimited: false,
        isExceeded: true,
      };
      const limitMsg = isPro
        ? `Monthly generation quota exhausted. Pro plan is limited to ${maxLimit} shorts per month (Used: ${currentTotal}/${maxLimit}).`
        : `Lifetime generation quota exhausted. Basic plan is limited to ${maxLimit} videos for life (Used: ${currentTotal}/${maxLimit}). Upgrade to Pro to generate more.`;
      throw new QuotaExceededError(limitMsg, info);
    }

    // Reserve slot atomically
    reservedSlots[jobId] = {
      jobId,
      reservedAt: new Date().toISOString(),
    };

    transaction.set(
      quotaRef,
      {
        userId,
        tier,
        completed,
        reservedSlots,
        periodKey: isPro ? periodKey : "lifetime",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const newTotal = completed + Object.keys(reservedSlots).length;
    return {
      success: true,
      quota: {
        userId,
        tier,
        periodType: isPro ? "CALENDAR_MONTH" : "LIFETIME",
        periodStart: isPro ? start : undefined,
        periodEnd: isPro ? end : undefined,
        limit: maxLimit,
        completed,
        reserved: Object.keys(reservedSlots).length,
        totalUsed: newTotal,
        remaining: Math.max(0, maxLimit - newTotal),
        isUnlimited: false,
        isExceeded: false,
      },
    };
  });
}

/**
 * Releases a reserved slot without consuming quota (e.g. on early failure or cancellation).
 * Supports both (userId, jobId) and (userId, role, jobId) call shapes for backwards compat
 * (callback route calls with 2 args).
 */
export async function releaseGenerationSlot(userId: string, roleOrJobId: string, jobIdMaybe?: string): Promise<void> {
  const hasRole = jobIdMaybe !== undefined;
  const jobId = hasRole ? jobIdMaybe! : roleOrJobId;
  const role = hasRole ? roleOrJobId : "BASIC";
  const tier = hasRole ? resolveTier(role) : null;
  if (tier === "ADMIN" || tier === "OWNER") return;
  // 2-arg form: try both BASIC and PRO keys since we don't know the tier
  if (!hasRole) {
    for (const tryRole of ["BASIC", "PRO"] as const) {
      const { periodKey: pk } = getCalendarMonthBounds();
      const docId = tryRole === "PRO" ? `${userId}_${pk}` : userId;
      const ref = db.collection("quotas").doc(docId);
      await db.runTransaction(async (tx: any) => {
        const doc = await tx.get(ref);
        if (!doc.exists) return;
        const data = doc.data() || {};
        const slots = { ...(data.reservedSlots || {}) };
        if (slots[jobId]) { delete slots[jobId]; tx.update(ref, { reservedSlots: slots, updatedAt: new Date().toISOString() }); }
      });
    }
    return;
  }

  const isPro = tier === "PRO";
  const { periodKey } = getCalendarMonthBounds();
  const quotaDocId = isPro ? `${userId}_${periodKey}` : userId;
  const quotaRef = db.collection("quotas").doc(quotaDocId);

  await db.runTransaction(async (transaction: any) => {
    const doc = await transaction.get(quotaRef);
    if (!doc.exists) return;

    const data = doc.data() || {};
    const reservedSlots = { ...(data.reservedSlots || {}) };

    if (reservedSlots[jobId]) {
      delete reservedSlots[jobId];
      transaction.update(quotaRef, {
        reservedSlots,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

/**
 * Consumes a reserved slot upon successful video completion.
 * Backwards compat: may be called as finalizeGenerationSlot(userId, jobId) from callback route.
 */
export async function consumeGenerationSlot(userId: string, roleOrJobId: string, jobIdMaybe?: string): Promise<void> {
  const hasRole = jobIdMaybe !== undefined;
  const jobId = hasRole ? jobIdMaybe! : roleOrJobId;
  const role = hasRole ? roleOrJobId : "BASIC";
  if (!hasRole) {
    // 2-arg form from callback — try both keys; we don't know tier
    for (const tryRole of ["BASIC", "PRO"] as const) {
      const { periodKey: pk } = getCalendarMonthBounds();
      const docId = tryRole === "PRO" ? `${userId}_${pk}` : userId;
      const ref = db.collection("quotas").doc(docId);
      await db.runTransaction(async (tx: any) => {
        const doc = await tx.get(ref);
        let completed = 0;
        let slots: Record<string, any> = {};
        if (doc.exists) {
          const data = doc.data() || {};
          completed = typeof data.completed === "number" ? data.completed : 0;
          slots = { ...(data.reservedSlots || {}) };
        }
        if (slots[jobId]) { delete slots[jobId]; completed += 1; }
        else if (!doc.exists) return;
        else completed = completed; // no slot to consume, keep as-is but still touch doc
        if (slots[jobId] !== undefined || doc.exists) {
          tx.set(ref, { userId, tier: tryRole, completed, reservedSlots: slots, periodKey: tryRole === "PRO" ? pk : "lifetime", updatedAt: new Date().toISOString() }, { merge: true });
        }
      });
    }
    return;
  }
  const tier = resolveTier(role);
  if (tier === "ADMIN" || tier === "OWNER") return;

  const isPro = tier === "PRO";
  const { periodKey } = getCalendarMonthBounds();
  const quotaDocId = isPro ? `${userId}_${periodKey}` : userId;
  const quotaRef = db.collection("quotas").doc(quotaDocId);

  await db.runTransaction(async (transaction: any) => {
    const doc = await transaction.get(quotaRef);
    let completed = 0;
    let reservedSlots: Record<string, any> = {};

    if (doc.exists) {
      const data = doc.data() || {};
      completed = typeof data.completed === "number" ? data.completed : 0;
      reservedSlots = { ...(data.reservedSlots || {}) };
    }

    if (reservedSlots[jobId]) {
      delete reservedSlots[jobId];
      completed += 1;
    }

    transaction.set(
      quotaRef,
      {
        userId,
        tier,
        completed,
        reservedSlots,
        periodKey: isPro ? periodKey : "lifetime",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  });
}

export const finalizeGenerationSlot = consumeGenerationSlot;
