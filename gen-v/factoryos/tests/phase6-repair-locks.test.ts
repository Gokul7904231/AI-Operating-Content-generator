import { describe, it, expect } from "vitest";
import { RepairLockManager } from "../core/healers/RepairLockManager";

describe("FactoryOS Frontier v2 — Phase 6: Repair Locks & Shared-Resource Safety Suite", () => {
  it("1. Exclusive Lock: Prevents two simultaneous repairs on the same protected resource", async () => {
    const lockManager = new RepairLockManager();

    // Healer A acquires exclusive lock on GPU pool
    const acquiredA = await lockManager.acquireLock("gpu_pool", "healer_rendering", "case_01", 30000);
    expect(acquiredA).toBe(true);

    // Healer B attempts to acquire same GPU pool -> Rejected
    const acquiredB = await lockManager.acquireLock("gpu_pool", "healer_worker", "case_02", 30000);
    expect(acquiredB).toBe(false);

    // Healer A releases lock
    await lockManager.releaseLock("gpu_pool", "healer_rendering");

    // Healer B can now acquire lock
    const reacquiredB = await lockManager.acquireLock("gpu_pool", "healer_worker", "case_02", 30000);
    expect(reacquiredB).toBe(true);
  });

  it("2. Concurrency Isolation: Independent resources allow parallel locks", async () => {
    const lockManager = new RepairLockManager();

    const lock1 = await lockManager.acquireLock("worker_scripting_01", "healer_worker", "case_03", 30000);
    const lock2 = await lockManager.acquireLock("worker_audio_02", "healer_rendering", "case_04", 30000);

    expect(lock1).toBe(true);
    expect(lock2).toBe(true);
  });
});
