/**
 * FactoryOS Entitlements & Quota Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getUserQuota,
  reserveGenerationSlot,
  consumeGenerationSlot,
  releaseGenerationSlot,
  getCalendarMonthBounds,
  QuotaExceededError,
} from "../../lib/quota/quota-service";
import { db } from "../../lib/firebase-admin";

describe("Entitlements & Quota System", () => {
  const basicUid = `test_basic_${Date.now()}`;
  const proUid = `test_pro_${Date.now()}`;
  const adminUid = `test_admin_${Date.now()}`;

  it("01: Basic user starts with 0/5 lifetime quota and 5 remaining", async () => {
    const quota = await getUserQuota(basicUid, "USER");
    expect(quota.tier).toBe("BASIC");
    expect(quota.limit).toBe(5);
    expect(quota.totalUsed).toBe(0);
    expect(quota.remaining).toBe(5);
    expect(quota.isExceeded).toBe(false);
    expect(quota.periodType).toBe("LIFETIME");
  });

  it("02: Basic user reserves slots up to 5 and blocks the 6th with QuotaExceededError", async () => {
    // Reserve 5 slots
    for (let i = 1; i <= 5; i++) {
      const res = await reserveGenerationSlot(basicUid, "USER", `job_${basicUid}_${i}`);
      expect(res.success).toBe(true);
      expect(res.quota.totalUsed).toBe(i);
      expect(res.quota.remaining).toBe(5 - i);
    }

    // 6th reservation must fail
    await expect(
      reserveGenerationSlot(basicUid, "USER", `job_${basicUid}_6`)
    ).rejects.toThrow(QuotaExceededError);

    const check = await getUserQuota(basicUid, "USER");
    expect(check.totalUsed).toBe(5);
    expect(check.remaining).toBe(0);
    expect(check.isExceeded).toBe(true);
  });

  it("03: Pro user calculates monthly bounds and allows 8 shorts per month", async () => {
    const bounds = getCalendarMonthBounds();
    expect(bounds.periodKey).toMatch(/^\d{4}-\d{2}$/);

    const quota = await getUserQuota(proUid, "PRO");
    expect(quota.tier).toBe("PRO");
    expect(quota.limit).toBe(8);
    expect(quota.periodType).toBe("CALENDAR_MONTH");
    expect(quota.periodStart).toBeDefined();
    expect(quota.periodEnd).toBeDefined();

    // Reserve 8 slots
    for (let i = 1; i <= 8; i++) {
      const res = await reserveGenerationSlot(proUid, "PRO", `job_${proUid}_${i}`);
      expect(res.success).toBe(true);
      expect(res.quota.totalUsed).toBe(i);
    }

    // 9th reservation must fail
    await expect(
      reserveGenerationSlot(proUid, "PRO", `job_${proUid}_9`)
    ).rejects.toThrow(QuotaExceededError);
  });

  it("04: Admin and Owner pass through reservation with unlimited quota", async () => {
    const res = await reserveGenerationSlot(adminUid, "ADMIN", `job_${adminUid}_1`);
    expect(res.success).toBe(true);
    expect(res.quota.isUnlimited).toBe(true);
    expect(res.quota.limit).toBe(Infinity);
    expect(res.quota.remaining).toBe(Infinity);
  });

  it("05: Releasing a slot restores available quota for user", async () => {
    const freshUser = `test_release_${Date.now()}`;
    await reserveGenerationSlot(freshUser, "USER", "job_to_cancel");
    
    let quota = await getUserQuota(freshUser, "USER");
    expect(quota.totalUsed).toBe(1);
    expect(quota.remaining).toBe(4);

    await releaseGenerationSlot(freshUser, "USER", "job_to_cancel");
    
    quota = await getUserQuota(freshUser, "USER");
    expect(quota.totalUsed).toBe(0);
    expect(quota.remaining).toBe(5);
  });
});
