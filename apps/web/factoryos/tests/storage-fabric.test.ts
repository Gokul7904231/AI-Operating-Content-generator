import { describe, it, expect, beforeEach } from "vitest";
import { B2StorageManager } from "../../lib/storage/b2-storage-manager";

describe("FactoryOS v1 — Phase 10: Asset & Temporary Storage Fabric Suite", () => {
  beforeEach(() => {
    B2StorageManager.clearStoreForTesting();
  });

  // 1. Permanent Asset Protection Safety Rule
  it("never deletes permanent assets in permanent/ during temporary cleanup", () => {
    // Save permanent asset
    B2StorageManager.savePermanentAsset("backgrounds/nature_01.mp4", 500 * 1024 * 1024);

    // Save temporary render
    B2StorageManager.saveTempRender("tenant_123", "job_456", 50 * 1024 * 1024);

    // Simulate 31 minutes into future
    const futureMs = Date.now() + 31 * 60 * 1000;
    const purged = B2StorageManager.purgeExpiredTempRenders(futureMs);
    expect(purged).toBe(1);

    // Verify permanent asset is still present!
    const permObj = B2StorageManager.getObject("permanent/backgrounds/nature_01.mp4");
    expect(permObj).not.toBeNull();
    expect(permObj?.prefix).toBe("permanent");
  });

  // 2. 30-Minute Server-Authoritative Expiration
  it("expires temporary renders after 30 minutes", () => {
    const tempObj = B2StorageManager.saveTempRender("tenant_123", "job_789", 25 * 1024 * 1024);
    expect(tempObj.expiresAt).toBeDefined();

    const createdAt = new Date(tempObj.createdAt).getTime();
    const expiresAt = new Date(tempObj.expiresAt!).getTime();
    expect(expiresAt - createdAt).toBe(30 * 60 * 1000); // Exactly 30 minutes

    // Purge before 30 min -> 0 purged
    const earlyPurged = B2StorageManager.purgeExpiredTempRenders(createdAt + 10 * 60 * 1000);
    expect(earlyPurged).toBe(0);

    // Purge after 30 min -> 1 purged
    const latePurged = B2StorageManager.purgeExpiredTempRenders(createdAt + 31 * 60 * 1000);
    expect(latePurged).toBe(1);
  });

  // 3. Storage Pressure State Machine
  it("calculates storage pressure state correctly based on temporary usage limits", () => {
    const gb = 1024 * 1024 * 1024;

    // < 1.5 GB -> NORMAL
    B2StorageManager.saveTempRender("t1", "j1", 1.0 * gb);
    expect(B2StorageManager.getTelemetry().pressureState).toBe("NORMAL");

    // 1.5 - 1.8 GB -> WARNING
    B2StorageManager.clearStoreForTesting();
    B2StorageManager.saveTempRender("t1", "j2", 1.6 * gb);
    expect(B2StorageManager.getTelemetry().pressureState).toBe("WARNING");

    // 1.8 - 2.0 GB -> AGGRESSIVE_CLEANUP
    B2StorageManager.clearStoreForTesting();
    B2StorageManager.saveTempRender("t1", "j3", 1.9 * gb);
    expect(B2StorageManager.getTelemetry().pressureState).toBe("AGGRESSIVE_CLEANUP");
  });

  // 4. Capacity Reached & Overflow Safety Gate
  it("throws error when temp storage limit (2.0 GB) is exceeded without expired files", () => {
    const gb = 1024 * 1024 * 1024;
    B2StorageManager.saveTempRender("t1", "j1", 2.1 * gb);

    expect(() => {
      B2StorageManager.saveTempRender("t1", "j2", 100 * 1024 * 1024);
    }).toThrow("STORAGE_CAPACITY_REACHED");
  });

  // 5. Telemetry API Endpoint
  it("exposes storage health telemetry via GET /api/storage/health", async () => {
    const { GET } = await import("../../app/api/storage/health/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.telemetry.bucketName).toBeDefined();
    expect(body.telemetry.retentionWindowMinutes).toBe(30);
  });
});
