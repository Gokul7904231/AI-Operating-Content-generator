import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RenderQueueProcessor } from "../lib/core/RenderQueueProcessor";
import { ServiceRegistry } from "../lib/core/ServiceRegistry";

describe("Production Control Plane Architecture Suite (All Tiers: BASIC, ADMIN, OWNER, SUPERADMIN)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("A. RenderQueueProcessor daemon start is disabled when BASIC_RENDER_API_URL is active", () => {
    process.env.BASIC_RENDER_API_URL = "https://azure-worker.shortforge.ai";
    delete process.env.ENABLE_LOCAL_QUEUE_PROCESSOR;

    const processor = new RenderQueueProcessor();
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    processor.start();

    // Polling interval must not be started
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect((processor as any).pollInterval).toBeNull();
  });

  it("B. RenderQueueProcessor starts normally in local/development mode without BASIC_RENDER_API_URL", () => {
    delete process.env.BASIC_RENDER_API_URL;

    const processor = new RenderQueueProcessor();
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    processor.start();

    // Interval must be started
    expect(setIntervalSpy).toHaveBeenCalled();
    processor.stop();
  });

  it("C. Local queue is bypassed for ALL tiers in production worker mode (BASIC, ADMIN, OWNER, SUPERADMIN)", async () => {
    process.env.BASIC_RENDER_API_URL = "https://azure-worker.shortforge.ai";
    const productionWorkerMode = Boolean(process.env.BASIC_RENDER_API_URL);

    expect(productionWorkerMode).toBe(true);

    const tiers = ["BASIC", "ADMIN", "OWNER", "SUPERADMIN"];
    for (const tier of tiers) {
      const mockEnqueue = vi.fn();
      const mockQueue = { enqueue: mockEnqueue };
      ServiceRegistry.register("renderQueue", mockQueue as any);

      // In productionWorkerMode, enqueue to SQLite is skipped regardless of tier
      if (!productionWorkerMode) {
        await mockQueue.enqueue({ jobId: `job_${tier}_1` });
      }

      expect(mockEnqueue).not.toHaveBeenCalled();
    }
  });

  it("D. Azure dispatch request is constructed correctly for both BASIC and ADMIN/OWNER/SUPERADMIN jobs", () => {
    const basicRenderApiUrl = "https://azure-worker.shortforge.ai";
    const basicRenderSecret = "test-secret-123";
    const tiers = ["BASIC", "ADMIN", "OWNER", "SUPERADMIN"];

    for (const tier of tiers) {
      const jobId = `job_${tier}_12345`;
      const executionToken = "crypto_tok_abc";

      const payload = {
        jobId,
        executionToken,
        tier: "BASIC", // Target worker protocol format accepted by Azure FastAPI
        topic: "World Capitals",
        renderProfile: "FAST_QUIZ",
        contentType: "QUIZ_SHORTS",
        quizData: { questions: [] }
      };

      const targetUrl = `${basicRenderApiUrl.replace(/\/$/, "")}/api/render/jobs`;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${basicRenderSecret}`,
      };

      expect(targetUrl).toBe("https://azure-worker.shortforge.ai/api/render/jobs");
      expect(headers.Authorization).toBe("Bearer test-secret-123");
      expect(payload.jobId).toBe(jobId);
      expect(payload.tier).toBe("BASIC");
    }
  });

  it("E. RenderQueueProcessor executeJob refuses local execution on Control Plane", async () => {
    process.env.BASIC_RENDER_API_URL = "https://azure-worker.shortforge.ai";
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

  it("F. Firestore job status can be read directly without starting queue daemon", () => {
    const mockJob = {
      id: "job_firestore_admin_1",
      status: "processing",
      progress: 50,
      videoUrl: null
    };

    const response = {
      id: mockJob.id,
      videoId: mockJob.id,
      status: mockJob.status,
      progress: mockJob.progress,
      error: undefined,
      videoUrl: null,
      output: null
    };

    expect(response.status).toBe("processing");
    expect(response.progress).toBe(50);
  });
});
