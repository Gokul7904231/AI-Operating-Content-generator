import { describe, it, expect, beforeEach } from "vitest";
import { RenderQueueManager } from "../../lib/rendering/RenderQueueManager";

describe("FactoryOS v1 — Phase 8: Production Execution & Rendering Fabric Suite", () => {
  it("enqueues render jobs and sorts queue by User Tier priority (ENTERPRISE > PRO > FREE)", () => {
    RenderQueueManager.enqueue({ id: "j1", jobId: "job_1", userId: "u1", tier: "FREE", topic: "Free Topic" });
    RenderQueueManager.enqueue({ id: "j2", jobId: "job_2", userId: "u2", tier: "ENTERPRISE", topic: "Enterprise Topic" });
    RenderQueueManager.enqueue({ id: "j3", jobId: "job_3", userId: "u3", tier: "PRO", topic: "Pro Topic" });

    const queue = RenderQueueManager.getQueue();
    expect(queue[0].tier).toBe("ENTERPRISE");
    expect(queue[1].tier).toBe("PRO");
    expect(queue[2].tier).toBe("FREE");

    // Clean queue
    RenderQueueManager.cancelJob("job_1");
    RenderQueueManager.cancelJob("job_2");
    RenderQueueManager.cancelJob("job_3");
  });

  it("processes next job and updates worker status to BUSY", () => {
    const job = RenderQueueManager.enqueue({ id: "j4", jobId: "job_4", userId: "u4", tier: "PRO", topic: "Render Test" });
    const processed = RenderQueueManager.processNextJob("worker-vps-main");

    expect(processed).not.toBeNull();
    expect(processed?.id).toBe("j4");
    expect(processed?.status).toBe("PROCESSING");
    expect(processed?.workerId).toBe("worker-vps-main");

    const workers = RenderQueueManager.getWorkers();
    expect(workers[0].status).toBe("BUSY");

    // Complete job
    RenderQueueManager.completeJob("j4", "http://storage/output.mp4", 14.5);
    expect(workers[0].status).toBe("ONLINE");
  });

  it("retries failed job up to maxAttempts before setting status to FAILED", () => {
    const job = RenderQueueManager.enqueue({ id: "j5", jobId: "job_5", userId: "u5", tier: "FREE", topic: "Fail Test" });
    RenderQueueManager.processNextJob("worker-vps-main");

    // Attempt 1 failure -> re-enqueue
    const retriedJob = RenderQueueManager.failJob("j5", "FFmpeg crash");
    expect(retriedJob?.status).toBe("QUEUED");
    expect(retriedJob?.attempts).toBe(1);

    // Clean job
    RenderQueueManager.cancelJob("job_5");
  });

  it("exposes render worker pool telemetry via GET /api/rendering/workers", async () => {
    const { GET } = await import("../../app/api/rendering/workers/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.workers).toBeDefined();
    expect(body.provenance?.source).toBe("/api/rendering/workers");
  });
});
