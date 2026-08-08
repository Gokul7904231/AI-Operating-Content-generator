import { describe, it, expect, beforeEach } from "vitest";
import { DeliveryManager } from "../../lib/delivery/delivery-manager";
import { B2StorageManager } from "../../lib/storage/b2-storage-manager";

describe("FactoryOS v1 — Phase 11: Delivery & Publishing Fabric Suite", () => {
  beforeEach(() => {
    B2StorageManager.clearStoreForTesting();
    DeliveryManager.clearRecordsForTesting();
  });

  // 1. Direct Browser Download Signed Access
  it("generates a signed download URL for active temporary render artifact", () => {
    const tempObj = B2StorageManager.saveTempRender("tenant_alpha", "job_101", 30 * 1024 * 1024);
    const record = DeliveryManager.createDeliveryRecord(
      "job_101",
      "tenant_alpha",
      "user_alpha",
      "BROWSER_DOWNLOAD",
      tempObj.key
    );

    const downloadUrl = DeliveryManager.getSignedDownloadUrl(record.id, "tenant_alpha");
    expect(downloadUrl).toContain("https://f000.backblazeb2.com");
    expect(downloadUrl).toContain("token=signed_auth_token");

    const updatedRecord = DeliveryManager.getRecord(record.id, "tenant_alpha");
    expect(updatedRecord?.status).toBe("DELIVERING_DOWNLOAD");
  });

  // 2. Google Drive Delivery & Post-Delivery Verification Purge
  it("verifies Google Drive upload and purges temporary B2 artifact post-verification", async () => {
    const tempObj = B2StorageManager.saveTempRender("tenant_alpha", "job_202", 40 * 1024 * 1024);
    const record = DeliveryManager.createDeliveryRecord(
      "job_202",
      "tenant_alpha",
      "user_alpha",
      "GOOGLE_DRIVE",
      tempObj.key
    );

    const result = await DeliveryManager.exportToGoogleDrive(record.id, "tenant_alpha", false);
    expect(result.status).toBe("TEMP_FILE_PURGED");
    expect(result.googleDriveFileId).toBeDefined();

    // Verify temporary B2 file was purged after delivery verification
    const b2Obj = B2StorageManager.getObject(tempObj.key, "tenant_alpha");
    expect(b2Obj).toBeNull();
  });

  // 3. Golden Rule: Failed Drive Upload Retains B2 Artifact
  it("retains B2 temporary artifact when Google Drive upload fails", async () => {
    const tempObj = B2StorageManager.saveTempRender("tenant_alpha", "job_303", 50 * 1024 * 1024);
    const record = DeliveryManager.createDeliveryRecord(
      "job_303",
      "tenant_alpha",
      "user_alpha",
      "GOOGLE_DRIVE",
      tempObj.key
    );

    // Simulate Drive Upload Failure
    const result = await DeliveryManager.exportToGoogleDrive(record.id, "tenant_alpha", true);
    expect(result.status).toBe("DRIVE_UPLOAD_FAILED");
    expect(result.error).toContain("Google Drive API");

    // Golden Rule Check: Temporary B2 artifact MUST be retained!
    const b2Obj = B2StorageManager.getObject(tempObj.key, "tenant_alpha");
    expect(b2Obj).not.toBeNull();
    expect(b2Obj?.key).toBe(tempObj.key);
  });

  // 4. Multi-Tenant Authorization Protection
  it("prevents Tenant A from requesting download for Tenant B's delivery record", () => {
    const tempObj = B2StorageManager.saveTempRender("tenant_beta", "job_404", 20 * 1024 * 1024);
    const record = DeliveryManager.createDeliveryRecord(
      "job_404",
      "tenant_beta",
      "user_beta",
      "BROWSER_DOWNLOAD",
      tempObj.key
    );

    expect(() => {
      DeliveryManager.getSignedDownloadUrl(record.id, "tenant_alpha");
    }).toThrow("Unauthorized tenant access");
  });

  // 5. Delivery API Endpoint
  it("serves delivery options via GET /api/delivery", async () => {
    const { GET } = await import("../../app/api/delivery/route");
    const secretKey = process.env.INTERNAL_API_SECRET_KEY || "factoryos-internal-secret-key-2026";
    process.env.INTERNAL_API_SECRET_KEY = secretKey;

    const req = new Request("http://localhost:3000/api/delivery", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.supportedDeliveryTypes).toContain("BROWSER_DOWNLOAD");
    expect(body.supportedDeliveryTypes).toContain("GOOGLE_DRIVE");
  });
});
