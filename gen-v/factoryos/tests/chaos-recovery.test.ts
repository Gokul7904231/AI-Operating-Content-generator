import { describe, it, expect, beforeEach } from "vitest";
import { RenderQueueManager } from "../../lib/rendering/RenderQueueManager";
import { B2StorageManager } from "../../lib/storage/b2-storage-manager";
import { DeliveryManager } from "../../lib/delivery/delivery-manager";
import { QuotaManager } from "../../lib/auth/quota-manager";
import { EventCenter } from "../../lib/observability/event-center";

describe("FactoryOS v1 — Phase 14: End-to-End QA & Chaos Testing Suite", () => {
  beforeEach(() => {
    B2StorageManager.clearStoreForTesting();
    DeliveryManager.clearRecordsForTesting();
    EventCenter.clearEventsForTesting();
  });

  // Chaos Test 1: AI & BYOLM Subsystem Offline Recovery
  it("[Chaos 1] recovers cleanly when BYOLM local AI provider is OFFLINE", async () => {
    const { POST } = await import("../../app/api/providers/local/test/route");
    const originalFetch = global.fetch;
    global.fetch = async () => {
      throw new Error("Connection refused (Ollama service offline)");
    };

    const req = new Request("http://localhost:3000/api/providers/local/test", {
      method: "POST",
      body: JSON.stringify({ endpoint: "http://127.0.0.1:9999", type: "ollama" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.status).toBe("offline");
    expect(body.error).toContain("offline");

    global.fetch = originalFetch;
  });

  // Chaos Test 2: Render Worker Crash & Retry Recovery
  it("[Chaos 2] retries render job on worker crash and recovers or sets FAILED without corruption", () => {
    const job = RenderQueueManager.enqueue({
      id: "j_chaos_render",
      jobId: "j_chaos_render",
      tenantId: "t_chaos",
      userId: "u_chaos",
      tier: "PRO",
      topic: "Chaos Render",
    });

    RenderQueueManager.processNextJob("oracle-a1-01");

    // Worker Crash 1 -> Re-enqueue
    let updated = RenderQueueManager.failJob("j_chaos_render", "FFmpeg SEGFAULT");
    expect(updated?.status).toBe("QUEUED");
    expect(updated?.attempts).toBe(1);

    // Process & Worker Crash 2 -> Re-enqueue
    RenderQueueManager.processNextJob("oracle-a1-01");
    updated = RenderQueueManager.failJob("j_chaos_render", "FFmpeg OOM");
    expect(updated?.status).toBe("QUEUED");
    expect(updated?.attempts).toBe(2);

    // Process & Worker Crash 3 -> Final FAILED state
    RenderQueueManager.processNextJob("oracle-a1-01");
    updated = RenderQueueManager.failJob("j_chaos_render", "FFmpeg Crash 3");
    expect(updated?.status).toBe("FAILED");
    expect(updated?.error).toBe("FFmpeg Crash 3");

    // Worker should be freed back to READY
    const workers = RenderQueueManager.getWorkers();
    expect(workers[0].status).toBe("READY");
  });

  // Chaos Test 3: Storage Pressure Capacity Reached & Permanent Asset Safety
  it("[Chaos 3] handles storage overflow safely without deleting permanent source assets", () => {
    const gb = 1024 * 1024 * 1024;
    // Save permanent asset
    B2StorageManager.savePermanentAsset("backgrounds/hero.mp4", 1 * gb);

    // Fill temporary storage to capacity (2.1 GB)
    B2StorageManager.saveTempRender("t_chaos", "job_full", 2.1 * gb);

    // Attempting to save new render throws capacity error
    expect(() => {
      B2StorageManager.saveTempRender("t_chaos", "job_new", 100 * 1024 * 1024);
    }).toThrow("STORAGE_CAPACITY_REACHED");

    // Golden Safety Check: Permanent asset MUST still exist!
    const permAsset = B2StorageManager.getObject("permanent/backgrounds/hero.mp4");
    expect(permAsset).not.toBeNull();
    expect(permAsset?.prefix).toBe("permanent");
  });

  // Chaos Test 4: Delivery Failure Safety (Golden Invariant)
  it("[Chaos 4] retains B2 artifact on Google Drive upload failure until retention deadline expires", async () => {
    const tempObj = B2StorageManager.saveTempRender("t_chaos", "job_drive_fail", 30 * 1024 * 1024);
    const record = DeliveryManager.createDeliveryRecord(
      "job_drive_fail",
      "t_chaos",
      "u_chaos",
      "GOOGLE_DRIVE",
      tempObj.key
    );

    // Drive Upload Fails
    const result = await DeliveryManager.exportToGoogleDrive(record.id, "t_chaos", true);
    expect(result.status).toBe("DRIVE_UPLOAD_FAILED");

    // File MUST be retained in B2 for retry
    let b2Obj = B2StorageManager.getObject(tempObj.key, "t_chaos");
    expect(b2Obj).not.toBeNull();

    // After retention window (31 mins), server cleanup purges expired file
    const futureMs = Date.now() + 31 * 60 * 1000;
    B2StorageManager.purgeExpiredTempRenders(futureMs);
    b2Obj = B2StorageManager.getObject(tempObj.key, "t_chaos");
    expect(b2Obj).toBeNull();
  });

  // Chaos Test 5: Multi-Tenant & RBAC Security Violations
  it("[Chaos 5] blocks unauthorized multi-tenant access and non-admin Adobe access", async () => {
    // 1. Cross-tenant queue cancellation rejected
    RenderQueueManager.enqueue({
      id: "j_tenant_sec",
      jobId: "j_tenant_sec",
      tenantId: "tenant_secret",
      userId: "u_secret",
      tier: "FREE",
      topic: "Secret Job",
    });

    const unauthorizedCancel = RenderQueueManager.cancelJob("j_tenant_sec", "tenant_attacker");
    expect(unauthorizedCancel).toBe(false);

    // 2. Non-admin Adobe endpoint access rejected
    const { GET } = await import("../../app/api/admin/adobe-creative/route");
    const req = new Request("http://localhost:3000/api/admin/adobe-creative"); // unauthenticated
    const res = await GET(req);
    expect([401, 403]).toContain(res.status);

    RenderQueueManager.cancelJob("j_tenant_sec", "tenant_secret");
  });
});
