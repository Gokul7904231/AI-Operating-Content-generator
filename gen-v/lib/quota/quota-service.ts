import { db } from "../firebase-admin";
import { isAdminUser } from "../auth/roles";

export const MAX_BASIC_USER_VIDEOS = 5;

export interface UserQuotaInfo {
  userId: string;
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
 * Calculates current quota state for a user.
 */
export async function getUserQuota(userId: string, role: string = "USER"): Promise<UserQuotaInfo> {
  if (!userId) {
    throw new Error("userId is required to query quota");
  }

  const isUnlimited = isAdminUser(role);
  if (isUnlimited) {
    return {
      userId,
      limit: Infinity,
      completed: 0,
      reserved: 0,
      totalUsed: 0,
      remaining: Infinity,
      isUnlimited: true,
      isExceeded: false,
    };
  }

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
    // If no quota document exists yet, check videos collection for existing completed videos
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

  const totalUsed = completed + reserved;
  const remaining = Math.max(0, MAX_BASIC_USER_VIDEOS - totalUsed);
  const isExceeded = totalUsed >= MAX_BASIC_USER_VIDEOS;

  return {
    userId,
    limit: MAX_BASIC_USER_VIDEOS,
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
 * Guarantees that even if 10 simultaneous requests hit for a user at 4/5,
 * exactly ONE request claims slot #5 and the remaining 9 are rejected.
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

  // Admins & Owners bypass quota
  if (isAdminUser(role)) {
    return {
      success: true,
      quota: {
        userId,
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

  const quotaRef = db.collection("quotas").doc(userId);

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
          limit: MAX_BASIC_USER_VIDEOS,
          completed,
          reserved: Object.keys(reservedSlots).length,
          totalUsed,
          remaining: Math.max(0, MAX_BASIC_USER_VIDEOS - totalUsed),
          isUnlimited: false,
          isExceeded: totalUsed >= MAX_BASIC_USER_VIDEOS,
        },
      };
    }

    const currentReservedCount = Object.keys(reservedSlots).length;
    const totalCurrentUsage = completed + currentReservedCount;

    if (totalCurrentUsage >= MAX_BASIC_USER_VIDEOS) {
      const quotaInfo: UserQuotaInfo = {
        userId,
        limit: MAX_BASIC_USER_VIDEOS,
        completed,
        reserved: currentReservedCount,
        totalUsed: totalCurrentUsage,
        remaining: 0,
        isUnlimited: false,
        isExceeded: true,
      };
      throw new QuotaExceededError(
        `Video generation quota exceeded. Basic user tier is limited to ${MAX_BASIC_USER_VIDEOS} successfully generated videos. You currently have ${totalCurrentUsage}/${MAX_BASIC_USER_VIDEOS} used (Completed: ${completed}, In-Progress: ${currentReservedCount}).`,
        quotaInfo
      );
    }

    // Atomically reserve the slot
    reservedSlots[jobId] = {
      jobId,
      reservedAt: new Date().toISOString(),
    };

    const newReservedCount = Object.keys(reservedSlots).length;
    const newTotalUsed = completed + newReservedCount;

    transaction.set(
      quotaRef,
      {
        userId,
        completed,
        reservedSlots,
        totalReserved: newReservedCount,
        totalUsed: newTotalUsed,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const quota: UserQuotaInfo = {
      userId,
      limit: MAX_BASIC_USER_VIDEOS,
      completed,
      reserved: newReservedCount,
      totalUsed: newTotalUsed,
      remaining: Math.max(0, MAX_BASIC_USER_VIDEOS - newTotalUsed),
      isUnlimited: false,
      isExceeded: newTotalUsed >= MAX_BASIC_USER_VIDEOS,
    };

    return { success: true, quota };
  });
}

/**
 * Releases a reserved slot when a render job fails or is cancelled.
 * Idempotent: safe to call multiple times without corrupting quota.
 */
export async function releaseGenerationSlot(userId: string, jobId: string): Promise<void> {
  if (!userId || !jobId) return;

  const quotaRef = db.collection("quotas").doc(userId);

  try {
    await db.runTransaction(async (transaction: any) => {
      const doc = await transaction.get(quotaRef);
      if (!doc.exists) return;

      const data = doc.data() || {};
      const completed = typeof data.completed === "number" ? data.completed : 0;
      const reservedSlots = { ...(data.reservedSlots || {}) };

      if (!reservedSlots[jobId]) {
        // Nothing to release
        return;
      }

      delete reservedSlots[jobId];
      const newReservedCount = Object.keys(reservedSlots).length;
      const newTotalUsed = completed + newReservedCount;

      transaction.set(
        quotaRef,
        {
          reservedSlots,
          totalReserved: newReservedCount,
          totalUsed: newTotalUsed,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  } catch (err: any) {
    console.error(`[Quota] Error releasing slot ${jobId} for user ${userId}:`, err.message);
  }
}

/**
 * Finalizes quota consumption upon verified successful video generation.
 * Idempotent: Calling multiple times will not double-increment completed count.
 */
export async function finalizeGenerationSlot(userId: string, jobId: string): Promise<void> {
  if (!userId || !jobId) return;

  const quotaRef = db.collection("quotas").doc(userId);

  try {
    await db.runTransaction(async (transaction: any) => {
      const doc = await transaction.get(quotaRef);
      let completed = 0;
      let reservedSlots: Record<string, any> = {};
      let completedJobIds: string[] = [];

      if (doc.exists) {
        const data = doc.data() || {};
        completed = typeof data.completed === "number" ? data.completed : 0;
        reservedSlots = { ...(data.reservedSlots || {}) };
        completedJobIds = Array.isArray(data.completedJobIds) ? [...data.completedJobIds] : [];
      }

      // If already finalized for this jobId, do not increment again
      if (completedJobIds.includes(jobId)) {
        return;
      }

      // Remove reservation if it was reserved
      delete reservedSlots[jobId];
      completed += 1;
      completedJobIds.push(jobId);

      const newReservedCount = Object.keys(reservedSlots).length;
      const newTotalUsed = completed + newReservedCount;

      transaction.set(
        quotaRef,
        {
          userId,
          completed,
          completedJobIds,
          reservedSlots,
          totalReserved: newReservedCount,
          totalUsed: newTotalUsed,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  } catch (err: any) {
    console.error(`[Quota] Error finalizing slot ${jobId} for user ${userId}:`, err.message);
  }
}

/**
 * Reconciles user quota document by querying Firestore videos collection.
 */
export async function reconcileUserQuota(userId: string): Promise<UserQuotaInfo> {
  if (!userId) throw new Error("userId is required");

  const videosSnapshot = await db
    .collection("videos")
    .where("userId", "==", userId)
    .get();

  let completedCount = 0;
  const completedJobIds: string[] = [];

  videosSnapshot.docs.forEach((d) => {
    const data = d.data();
    if (data.status === "completed") {
      completedCount++;
      completedJobIds.push(d.id);
    }
  });

  const quotaRef = db.collection("quotas").doc(userId);
  const doc = await quotaRef.get();
  const existingData = doc.exists ? doc.data() || {} : {};
  const reservedSlots = existingData.reservedSlots || {};

  const totalReserved = Object.keys(reservedSlots).length;
  const totalUsed = completedCount + totalReserved;

  await quotaRef.set(
    {
      userId,
      completed: completedCount,
      completedJobIds,
      reservedSlots,
      totalReserved,
      totalUsed,
      reconciledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return {
    userId,
    limit: MAX_BASIC_USER_VIDEOS,
    completed: completedCount,
    reserved: totalReserved,
    totalUsed,
    remaining: Math.max(0, MAX_BASIC_USER_VIDEOS - totalUsed),
    isUnlimited: false,
    isExceeded: totalUsed >= MAX_BASIC_USER_VIDEOS,
  };
}
