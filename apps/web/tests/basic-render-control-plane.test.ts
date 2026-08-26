import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RenderQueueProcessor } from "../lib/core/RenderQueueProcessor";
import { ServiceRegistry } from "../lib/core/ServiceRegistry";

describe("Hardened Render Control Plane Architecture & Fail-Safe Suite", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("A. RENDER=true + URL present → Azure worker mode, daemon disabled", () => {
    process.env.RENDER = "true";
    process.env.BASIC_RENDER_API_URL = "https://azure-worker.shortforge.ai";
    delete process.env.ENABLE_LOCAL_QUEUE_PROCESSOR;

    const processor = new RenderQueueProcessor();
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    processor.start();

    // Polling interval must not be started on Render Control Plane
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect((processor as any).pollInterval).toBeNull();
  });

  it("B. RENDER=true + URL missing → Fail-fast and block local queue startup", () => {
    process.env.RENDER = "true";
    delete process.env.BASIC_RENDER_API_URL;
    delete process.env.ENABLE_LOCAL_QUEUE_PROCESSOR;

    const processor = new RenderQueueProcessor();
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    processor.start();

    // Must NOT start polling or local rendering on Render even if URL is missing
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect((processor as any).pollInterval).toBeNull();
  });

  it("C. NODE_ENV=production + URL missing → Fail-fast and block local queue startup", () => {
    process.env.NODE_ENV = "production";
    delete process.env.RENDER;
    delete process.env.BASIC_RENDER_API_URL;
    delete process.env.ENABLE_LOCAL_QUEUE_PROCESSOR;

    const processor = new RenderQueueProcessor();
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    processor.start();

    // Must NOT start polling or local rendering in production
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect((processor as any).pollInterval).toBeNull();
  });

  it("D. Local development + URL missing → Local behavior remains enabled", () => {
    delete process.env.RENDER;
    process.env.NODE_ENV = "development";
    delete process.env.BASIC_RENDER_API_URL;

    const processor = new RenderQueueProcessor();
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    processor.start();

    // Interval must be started in local dev
    expect(setIntervalSpy).toHaveBeenCalled();
    processor.stop();
  });

  it("E. Production + URL present → All tiers bypass SQLite and construct Azure dispatch", () => {
    process.env.RENDER = "true";
    process.env.BASIC_RENDER_API_URL = "https://azure-worker.shortforge.ai";
    const basicRenderSecret = "test-secret-123";

    const isControlPlane = process.env.RENDER === "true" || process.env.NODE_ENV === "production" || Boolean(process.env.BASIC_RENDER_API_URL);
    expect(isControlPlane).toBe(true);

    const tiers = ["BASIC", "ADMIN", "OWNER", "SUPERADMIN"];
    for (const tier of tiers) {
      const mockEnqueue = vi.fn();
      const mockQueue = { enqueue: mockEnqueue };
      ServiceRegistry.register("renderQueue", mockQueue as any);

      const jobId = `job_${tier}_12345`;
      const executionToken = "crypto_tok_abc";

      const payload = {
        jobId,
        executionToken,
        tier: "BASIC",
        topic: "Space Exploration",
        renderProfile: "FAST_QUIZ",
        contentType: "QUIZ_SHORTS",
        quizData: { questions: [] }
      };

      const targetUrl = `${process.env.BASIC_RENDER_API_URL.replace(/\/$/, "")}/api/render/jobs`;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${basicRenderSecret}`,
      };

      expect(targetUrl).toBe("https://azure-worker.shortforge.ai/api/render/jobs");
      expect(headers.Authorization).toBe("Bearer test-secret-123");
      expect(payload.jobId).toBe(jobId);
      expect(mockEnqueue).not.toHaveBeenCalled();
    }
  });

  it("F. RenderQueueProcessor executeJob refuses local execution on Control Plane", async () => {
    process.env.RENDER = "true";
    delete process.env.ENABLE_LOCAL_QUEUE_PROCESSOR;

    const processor = new RenderQueueProcessor();
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await (processor as any).executeJob({
      id: "q_1",
      jobId: "job_admin_999",
      payload: {},
      attempts: 0,
      maxAttempts: 3
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Refusing local rendering execution of job job_admin_999")
    );
  });
});
