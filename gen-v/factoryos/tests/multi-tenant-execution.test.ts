import { describe, it, expect } from "vitest";
import { QuotaManager } from "../../lib/auth/quota-manager";
import { RenderQueueManager } from "../../lib/rendering/RenderQueueManager";
import { buildSessionCookieHeader } from "../../lib/auth/cookies";

describe("FactoryOS v1 — Phase 9: Multi-Tenant Execution & Admin Adobe Suite", () => {
  // 1. Quota Enforcement
  it("enforces tier limits (ADMIN: 5/day, FREE: 5/month)", () => {
    const freeUserCheck = QuotaManager.canExecuteJob("u_free", "tenant_free", "FREE");
    expect(freeUserCheck.allowed).toBe(true);

    for (let i = 0; i < 5; i++) {
      QuotaManager.incrementUsage("u_free", "tenant_free", "FREE");
    }

    const freeLimitCheck = QuotaManager.canExecuteJob("u_free", "tenant_free", "FREE");
    expect(freeLimitCheck.allowed).toBe(false);
    expect(freeLimitCheck.reason).toContain("Monthly quota limit reached");

    const adminCheck = QuotaManager.canExecuteJob("u_admin", "tenant_admin", "ADMIN");
    expect(adminCheck.allowed).toBe(true);
  });

  // 2. Multi-Tenant Job & Asset Isolation
  it("prevents User A from cancelling User B's render job", () => {
    RenderQueueManager.enqueue({
      id: "job_b",
      jobId: "job_b",
      tenantId: "tenant_user_b",
      userId: "user_b",
      tier: "FREE",
      topic: "User B Job",
    });

    const userACancel = RenderQueueManager.cancelJob("job_b", "tenant_user_a");
    expect(userACancel).toBe(false);

    const userBCancel = RenderQueueManager.cancelJob("job_b", "tenant_user_b");
    expect(userBCancel).toBe(true);
  });

  // 3. Admin Adobe Express Layer Authorization & Truth
  it("rejects non-admin users from accessing GET /api/admin/adobe-creative (401/403)", async () => {
    const { GET } = await import("../../app/api/admin/adobe-creative/route");
    const viewerCookie = buildSessionCookieHeader("mock_viewer_session_token");

    const req = new Request("http://localhost:3000/api/admin/adobe-creative", {
      headers: { Cookie: viewerCookie },
    });

    const res = await GET(req);
    expect([401, 403]).toContain(res.status);
  });

  it("serves Admin Adobe Express entitlement status without hardcoded credit numbers", async () => {
    const { GET } = await import("../../app/api/admin/adobe-creative/route");
    const secretKey = process.env.INTERNAL_API_SECRET_KEY || "factoryos-internal-secret-key-2026";
    process.env.INTERNAL_API_SECRET_KEY = secretKey;

    const req = new Request("http://localhost:3000/api/admin/adobe-creative", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.service).toBe("Adobe Express Premium Creative Layer");
    expect(body.status).toBe("NOT_CONFIGURED"); // Truth layer: not hardcoded connected
    expect(body.entitlement?.status).toBe("ENTITLEMENT_DETECTED");
  });

  // 4. BYOK Credential Masking
  it("masks raw API keys in GET /api/user/credentials", async () => {
    const { POST, GET } = await import("../../app/api/user/credentials/route");
    const secretKey = process.env.INTERNAL_API_SECRET_KEY || "factoryos-internal-secret-key-2026";
    process.env.INTERNAL_API_SECRET_KEY = secretKey;
    const authHeaders = { Authorization: `Bearer ${secretKey}` };

    const postReq = new Request("http://localhost:3000/api/user/credentials", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google", apiKey: "AIzaSyD-Secret123456Key" }),
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody.maskedKey).toBe("AIza...6Key");

    const getReq = new Request("http://localhost:3000/api/user/credentials", {
      headers: authHeaders,
    });

    const getRes = await GET(getReq);
    const getBody = await getRes.json();
    expect(getBody.providers.google.maskedKey).toBe("AIza...6Key");
  });
});
