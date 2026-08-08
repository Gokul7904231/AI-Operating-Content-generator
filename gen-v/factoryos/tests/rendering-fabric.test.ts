import { describe, it, expect } from "vitest";
import { RenderQueueManager } from "../../lib/rendering/RenderQueueManager";

describe("FactoryOS v1 — Generic Production Execution & Rendering Fabric Suite", () => {
  it("enqueues universal RenderJob contract objects and sorts by priority (ADMIN > ENTERPRISE > PRO > FREE)", () => {
    RenderQueueManager.enqueue({ id: "j1", jobId: "job_1", tenantId: "t1", userId: "u1", tier: "FREE", topic: "Free Quiz", contentEngine: "quiz" });
    RenderQueueManager.enqueue({ id: "j2", jobId: "job_2", tenantId: "t2", userId: "u2", tier: "ADMIN", topic: "Admin Auto 5/Day", contentEngine: "facts" });
    RenderQueueManager.enqueue({ id: "j3", jobId: "job_3", tenantId: "t3", userId: "u3", tier: "PRO", topic: "Pro Story", contentEngine: "stories" });

    const queue = RenderQueueManager.getQueue();
    expect(queue[0].tier).toBe("ADMIN");
    expect(queue[0].contentEngine).toBe("facts");
    expect(queue[1].tier).toBe("PRO");
    expect(queue[2].tier).toBe("FREE");

    RenderQueueManager.cancelJob("job_1");
    RenderQueueManager.cancelJob("job_2");
    RenderQueueManager.cancelJob("job_3");
  });

  it("assigns render jobs to Oracle Always Free ARM64 worker (oracle-a1-01)", () => {
    const job = RenderQueueManager.enqueue({ id: "j4", jobId: "job_4", tenantId: "t4", userId: "u4", tier: "PRO", topic: "Render Test", contentEngine: "quiz" });
    const processed = RenderQueueManager.processNextJob("oracle-a1-01");

    expect(processed).not.toBeNull();
    expect(processed?.id).toBe("j4");
    expect(processed?.workerId).toBe("oracle-a1-01");

    const workers = RenderQueueManager.getWorkers();
    expect(workers[0].architecture).toBe("arm64");
    expect(workers[0].status).toBe("BUSY");

    // Complete job
    RenderQueueManager.completeJob("j4", {
      uri: "b2://temp-renders/j4/final.mp4",
      sizeBytes: 12345678,
      durationMs: 38200,
    });

    expect(workers[0].status).toBe("READY");
  });

  it("enforces multi-tenant cancellation protection", () => {
    RenderQueueManager.enqueue({ id: "j5", jobId: "job_5", tenantId: "tenant_alpha", userId: "u1", tier: "FREE", topic: "Isolated Job" });
    
    // Attempt cancellation with wrong tenantId -> fails
    const wrongTenantCancelled = RenderQueueManager.cancelJob("job_5", "tenant_beta");
    expect(wrongTenantCancelled).toBe(false);

    // Right tenantId -> succeeds
    const rightTenantCancelled = RenderQueueManager.cancelJob("job_5", "tenant_alpha");
    expect(rightTenantCancelled).toBe(true);
  });

  it("exposes render worker telemetry via GET /api/rendering/workers", async () => {
    const { GET } = await import("../../app/api/rendering/workers/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.workers[0].architecture).toBe("arm64");
    expect(body.provenance?.source).toBe("/api/rendering/workers");
  });
});
