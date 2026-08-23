/**
 * FactoryOS Pro Scheduler & Idempotency Tests
 */

import { describe, it, expect } from "vitest";
import { SchedulerService } from "../../lib/scheduler/SchedulerService";

describe("Pro Scheduler & Idempotency", () => {
  it("01: Computes nextRunAt UTC timestamp for 20:00 schedule", () => {
    const nextUtc = SchedulerService.computeNextRunAt("20:00", "UTC", "DAILY");
    const d = new Date(nextUtc);

    expect(d.getUTCHours()).toBe(20);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getTime()).toBeGreaterThan(Date.now());
  });

  it("02: Generates deterministic execution IDs based on scheduleId and scheduledForUtc", () => {
    const schedId = "sched_abc123";
    const utcTimestamp = "2026-08-24T20:00:00.000Z";

    const id1 = SchedulerService.generateExecutionId(schedId, utcTimestamp);
    const id2 = SchedulerService.generateExecutionId(schedId, utcTimestamp);
    const id3 = SchedulerService.generateExecutionId(schedId, "2026-08-25T20:00:00.000Z");

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(typeof id1).toBe("string");
  });
});
