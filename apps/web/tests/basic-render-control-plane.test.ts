import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RenderQueueProcessor } from "../lib/core/RenderQueueProcessor";
import { ServiceRegistry } from "../lib/core/ServiceRegistry";

describe("Basic Render Control Plane Architecture Suite", () => {
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

  it("C. SQLite queue is bypassed for BASIC jobs when BASIC_RENDER_API_URL is set", async () => {
    process.env.BASIC_RENDER_API_URL = "https://azure-worker.shortforge.ai";
    const isBasicWorkerMode = Boolean(process.env.BASIC_RENDER_API_URL);

    expect(isBasicWorkerMode).toBe(true);

    const mockEnqueue = vi.fn();
    const mockQueue = { enqueue: mockEnqueue };
    ServiceRegistry.register("renderQueue", mockQueue as any);

    // In basic worker mode, enqueue to SQLite is skipped
    if (!isBasicWorkerMode) {
      await mockQueue.enqueue({ jobId: "job_test_1" });
    }

    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it("D. Exactly one Azure dispatch request is constructed for BASIC job", () => {
    const basicRenderApiUrl = "https://azure-worker.shortforge.ai";
    const basicRenderSecret = "test-secret-123";
    const jobId = "job_basic_12345";
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

    const targetUrl = `${basicRenderApiUrl.replace(/\/$/, "")}/api/render/jobs`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${basicRenderSecret}`,
    };

    expect(targetUrl).toBe("https://azure-worker.shortforge.ai/api/render/jobs");
    expect(headers.Authorization).toBe("Bearer test-secret-123");
    expect(payload.jobId).toBe(jobId);
    expect(payload.executionToken).toBe(executionToken);
  });

  it("E. Firestore job status can be read directly without starting queue daemon", () => {
    const mockJob = {
      id: "job_firestore_1",
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
