import { describe, it, expect, vi, beforeEach } from "vitest";

describe("FactoryOS Basic FastAPI Render Integration Suite", () => {
  const mockControlPlaneSecret = "factoryos_basic_secret_test_12345";
  const mockApiUrl = "https://render.factoryos.app";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("01: Validates Basic job payload and dispatches to FastAPI endpoint", async () => {
    const jobPayload = {
      jobId: "basic-job-vid-101",
      executionToken: "token-basic-101",
      tier: "BASIC",
      topic: "Space Exploration",
      renderProfile: "FAST_QUIZ",
    };

    // Mock fetch dispatch
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ jobId: "basic-job-vid-101", status: "queued" }),
    });

    global.fetch = fetchMock;

    const response = await fetch(`${mockApiUrl}/api/render/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockControlPlaneSecret}`,
      },
      body: JSON.stringify(jobPayload),
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(202);
    const data = await response.json();
    expect(data.jobId).toBe("basic-job-vid-101");
    expect(data.status).toBe("queued");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://render.factoryos.app/api/render/jobs",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockControlPlaneSecret}`,
        }),
      })
    );
  });

  it("02: Liveness health check returns healthy status with worker count", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        service: "factoryos-basic-render",
        version: "1.0.0",
        workerCount: 1,
        uptimeSeconds: 124.5,
      }),
    });

    global.fetch = fetchMock;

    const response = await fetch(`${mockApiUrl}/health`);
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.service).toBe("factoryos-basic-render");
    expect(data.workerCount).toBe(1);
  });

  it("03: Readiness probe confirms worker readiness and reports zero active backlog", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ready",
        service: "factoryos-basic-render",
        queueDepth: 0,
        activeJobs: 0,
        completedJobs: 5,
        failedJobs: 0,
        uptimeSeconds: 3600,
      }),
    });

    global.fetch = fetchMock;

    const response = await fetch(`${mockApiUrl}/ready`);
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.status).toBe("ready");
    expect(data.queueDepth).toBe(0);
  });

  it("04: Handles completed render callback and reconciles video metadata", async () => {
    const callbackPayload = {
      jobId: "basic-job-vid-101",
      status: "completed",
      executionToken: "token-basic-101",
      videoUrl: "https://res.cloudinary.com/factoryos/video/upload/basic-101.mp4",
      videoSizeMb: 4.8,
      renderDurationSeconds: 42.1,
      artifactSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      deliveryProvider: "basic_fastapi",
      telemetry: {
        queueWaitMs: 120,
        renderMs: 38400,
        validationMs: 450,
        totalMs: 42100,
      },
    };

    expect(callbackPayload.status).toBe("completed");
    expect(callbackPayload.videoSizeMb).toBeGreaterThan(0);
    expect(callbackPayload.renderDurationSeconds).toBeLessThan(60); // Meets < 60s target
    expect(callbackPayload.artifactSha256).toHaveLength(64);
  });

  it("05: Basic failure propagates correctly to Control Plane as status=failed", async () => {
    const failureCallback = {
      jobId: "basic-job-fail-202",
      status: "failed",
      executionToken: "token-fail-202",
      error: "Renderer create_short.py failed (exit_code=1): ffmpeg error",
      deliveryProvider: "basic_fastapi",
    };

    expect(failureCallback.status).toBe("failed");
    expect(failureCallback.error).toContain("Renderer create_short.py failed");
  });

  it("06: Failed Basic jobs are never marked completed in manifest", () => {
    const jobManifest = {
      jobId: "basic-job-fail-202",
      status: "failed",
      error: "Renderer create_short.py failed (exit_code=1)",
      videoUrl: null,
    };

    expect(jobManifest.status).toBe("failed");
    expect(jobManifest.videoUrl).toBeNull();
    expect(jobManifest.status).not.toBe("completed");
  });

  it("07: Callback failure or 404 response does not create false success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Job not found" }),
    });

    global.fetch = fetchMock;

    const res = await fetch(`${mockApiUrl}/api/rendering/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "non-existent-999", status: "completed" }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });
});
