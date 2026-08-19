/**
 * FactoryOS Frontier v2 — Repair Lock Manager (Shared-Resource Concurrency)
 * Enforces exclusive locking on workers, GPUs, queues, and storage during transactional repairs.
 */

import type { LeaseManager } from "../leases/LeaseManager";
import type { ResourceLock } from "../contracts/HealerContracts";

export class RepairLockManager {
  private inMemoryLocks: Map<string, ResourceLock> = new Map();
  private leaseManager?: LeaseManager;

  constructor(leaseManager?: LeaseManager) {
    this.leaseManager = leaseManager;
  }

  /**
   * Acquires exclusive lock on a protected resource.
   */
  async acquireLock(
    resourceId: string,
    healerId: string,
    caseId: string,
    ttlMs: number = 30000
  ): Promise<boolean> {
    const lockKey = `lock:resource:${resourceId}`;

    // Check LeaseManager first
    if (this.leaseManager) {
      const acquired = await this.leaseManager.acquire(lockKey, healerId, ttlMs);
      if (!acquired) return false;
    }

    // Check in-memory locks
    const now = Date.now();
    const existing = this.inMemoryLocks.get(lockKey);
    if (existing && new Date(existing.expiresAt).getTime() > now && existing.ownerHealerId !== healerId) {
      return false; // Resource locked by another healer
    }

    const acquiredAt = new Date().toISOString();
    const expiresAt = new Date(now + ttlMs).toISOString();

    this.inMemoryLocks.set(lockKey, {
      resourceId,
      ownerHealerId: healerId,
      caseId,
      acquiredAt,
      expiresAt,
    });

    return true;
  }

  /**
   * Releases exclusive lock on a resource.
   */
  async releaseLock(resourceId: string, healerId: string): Promise<void> {
    const lockKey = `lock:resource:${resourceId}`;
    if (this.leaseManager) {
      await this.leaseManager.release(lockKey, healerId);
    }
    const existing = this.inMemoryLocks.get(lockKey);
    if (existing && existing.ownerHealerId === healerId) {
      this.inMemoryLocks.delete(lockKey);
    }
  }

  getLock(resourceId: string): ResourceLock | null {
    const lockKey = `lock:resource:${resourceId}`;
    const existing = this.inMemoryLocks.get(lockKey);
    if (!existing) return null;
    if (new Date(existing.expiresAt).getTime() <= Date.now()) {
      this.inMemoryLocks.delete(lockKey);
      return null;
    }
    return structuredClone(existing);
  }

  clear(): void {
    this.inMemoryLocks.clear();
  }
}
