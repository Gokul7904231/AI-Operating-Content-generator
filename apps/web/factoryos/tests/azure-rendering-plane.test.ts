import { describe, test, expect, beforeEach } from "vitest";
import { WorkerPoolRegistry } from "../../lib/rendering/WorkerPoolRegistry";
import { AzureWorkerManager } from "../../lib/rendering/AzureWorkerManager";
import { AzureFinOpsGuard } from "../../lib/rendering/AzureFinOpsGuard";
import { RenderQueueManager } from "../../lib/rendering/RenderQueueManager";

describe("FactoryOS — Azure Rendering Plane & FinOps Compute Appliance Suite", () => {
  beforeEach(() => {
    WorkerPoolRegistry.clear();
    AzureWorkerManager.reset();
    AzureFinOpsGuard.reset();
  });

  test("01: Vendor-neutral WorkerPoolRegistry registers multi-cloud workers and handles heartbeats", () => {
    WorkerPoolRegistry.registerWorker({
      workerId: "azure-b4ls-01",
      vendor: "azure",
      name: "Azure B4ls_v2 Worker",
      endpoint: "https://azure.factoryos.local",
      tokenHash: "token_azure_valid",
      capabilities: {
        vendor: "azure",
        architecture: "x86_64",
        vCPU: 4,
        memoryMb: 8192,
        ffmpegVersion: "6.1.1",
        supportsGpu: false,
        maxConcurrentRenders: 1,
      },
      state: "READY",
      telemetry: {
        cpuUtilizationPct: 15.0,
        ramUtilizationPct: 30.0,
        activeRenders: 0,
        tempStorageFreeMb: 20000,
        b2Connectivity: true,
        lastHeartbeatTimestamp: Date.now(),
      },
      lastHeartbeat: new Date().toISOString(),
    });

    const workers = WorkerPoolRegistry.getAllWorkers();
    expect(workers.length).toBe(1);
    expect(workers[0].vendor).toBe("azure");

    // Heartbeat update
    const heartbeatOk = WorkerPoolRegistry.handleHeartbeat("azure-b4ls-01", "token_azure_valid", "BUSY", {
      cpuUtilizationPct: 85.0,
      ramUtilizationPct: 45.0,
      activeRenders: 1,
      tempStorageFreeMb: 19000,
      b2Connectivity: true,
      lastHeartbeatTimestamp: Date.now(),
    }, "job_101");

    expect(heartbeatOk).toBe(true);
    expect(WorkerPoolRegistry.getWorker("azure-b4ls-01")?.state).toBe("BUSY");
  });

  test("02: WorkerPoolRegistry detects stale heartbeat and marks worker LOST", () => {
    WorkerPoolRegistry.registerWorker({
      workerId: "stale-worker-99",
      vendor: "oracle",
      name: "Stale Worker",
      endpoint: "https://stale.factoryos.local",
      tokenHash: "hash_stale",
      capabilities: {
        vendor: "oracle",
        architecture: "arm64",
        vCPU: 4,
        memoryMb: 24576,
        ffmpegVersion: "6.0",
        supportsGpu: false,
        maxConcurrentRenders: 1,
      },
      state: "READY",
      telemetry: {
        cpuUtilizationPct: 0,
        ramUtilizationPct: 10,
        activeRenders: 0,
        tempStorageFreeMb: 10000,
        b2Connectivity: true,
        lastHeartbeatTimestamp: Date.now() - 120000, // 2 minutes ago
      },
      lastHeartbeat: new Date(Date.now() - 120000).toISOString(),
    });

    const lostIds = WorkerPoolRegistry.checkStaleWorkers(60000); // 60s timeout
    expect(lostIds).toContain("stale-worker-99");
    expect(WorkerPoolRegistry.getWorker("stale-worker-99")?.state).toBe("LOST");
  });

  test("03: Scale-to-zero lifecycle: VM starts on job enqueue, drains on zero queue, and deallocates after grace period", async () => {
    expect(AzureWorkerManager.getState()).toBe("DEALLOCATED");

    // Enqueue job
    const job = RenderQueueManager.enqueue({
      jobId: "job_scale_test_01",
      topic: "Scale to Zero Short",
      tenantId: "tenant_scale_1",
      userId: "user_scale_1",
      tier: "ADMIN",
    });

    expect(job.status).toBe("QUEUED");

    // Wait for VM start simulation
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(AzureWorkerManager.getState()).toBe("READY");

    // Process job
    const processed = RenderQueueManager.processNextJob("azure-b4ls-01");
    expect(processed?.id).toBe(job.id);

    // Complete job
    RenderQueueManager.completeJob(job.id, {
      uri: "b2://temp-renders/job_scale_test_01.mp4",
      sizeBytes: 15400000,
      durationMs: 45000,
    });

    expect(AzureWorkerManager.getState()).toBe("DRAINING");

    // Fast-forward grace period check (10 mins)
    const expired = AzureWorkerManager.evaluateGracePeriod(Date.now() + 11 * 60 * 1000);
    expect(expired).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(AzureWorkerManager.getState()).toBe("DEALLOCATED");
  });

  test("04: New job during DRAINING grace period cancels deallocation and restores worker READY", async () => {
    // Start VM
    AzureWorkerManager.requestStartVm();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Enter Draining
    AzureWorkerManager.enterDrainingState();
    expect(AzureWorkerManager.getState()).toBe("DRAINING");

    // Enqueue new job during grace period
    RenderQueueManager.enqueue({
      jobId: "job_grace_recovery_01",
      topic: "Grace Period Job",
      tenantId: "tenant_grace",
      userId: "user_grace",
      tier: "ADMIN",
    });

    expect(AzureWorkerManager.getState()).toBe("READY");
  });

  test("05: 6-Layer FinOps Guard enforces budget limits, policy SKU checks, and emergency lockdown", () => {
    // Allowed SKU check
    expect(AzureFinOpsGuard.isSkuAllowed("Standard_B4ls_v2")).toBe(true);
    expect(AzureFinOpsGuard.isSkuAllowed("Standard_ND96asr_v4")).toBe(false); // GPU SKU denied

    // Budget update check
    AzureFinOpsGuard.updateSpend(46.0); // 92% of $50 budget
    const freeCheck = AzureFinOpsGuard.canAcceptRenderJob("FREE");
    expect(freeCheck.allowed).toBe(false);
    expect(freeCheck.reason).toContain("BUDGET_CAP_EXCEEDED");

    const proCheck = AzureFinOpsGuard.canAcceptRenderJob("PRO");
    expect(proCheck.allowed).toBe(true);

    // Emergency Lockdown Switch
    AzureFinOpsGuard.setEmergencyLockdown(true);
    expect(AzureFinOpsGuard.isLockdownActive()).toBe(true);

    expect(() => {
      RenderQueueManager.enqueue({
        jobId: "job_lockdown_fail",
        topic: "Lockdown Render",
        tenantId: "tenant_lock",
        userId: "user_lock",
        tier: "ADMIN",
      });
    }).toThrow("FINOPS_GUARD_REJECTED: AZURE_RENDERING_LOCKDOWN");
  });

  test("06: Fallback worker routing to GitHub Actions overflow when Azure is locked/exhausted", () => {
    // Register GitHub Actions Worker
    WorkerPoolRegistry.registerWorker({
      workerId: "gha-overflow-01",
      vendor: "github-actions",
      name: "GitHub Actions Overflow Worker",
      endpoint: "https://gha-runner.factoryos.local",
      tokenHash: "gha_token_hash",
      capabilities: {
        vendor: "github-actions",
        architecture: "x86_64",
        vCPU: 2,
        memoryMb: 7168,
        ffmpegVersion: "6.0",
        supportsGpu: false,
        maxConcurrentRenders: 1,
      },
      state: "READY",
      telemetry: {
        cpuUtilizationPct: 10,
        ramUtilizationPct: 20,
        activeRenders: 0,
        tempStorageFreeMb: 15000,
        b2Connectivity: true,
        lastHeartbeatTimestamp: Date.now(),
      },
      lastHeartbeat: new Date().toISOString(),
    });

    const available = WorkerPoolRegistry.findAvailableWorker({
      id: "j_fallback",
      jobId: "j_fallback",
      factoryVersion: "v1",
      contentEngine: "quiz",
      tenantId: "t_fb",
      userId: "u_fb",
      tier: "PRO",
      aiExecutionMode: "CLOUD",
      topic: "Fallback Short",
      status: "QUEUED",
      attempts: 0,
      maxAttempts: 3,
      timeline: {},
      assets: [],
      audio: [],
      subtitles: {},
      output: { format: "mp4", width: 1080, height: 1920, fps: 30 },
      delivery: { download: true, googleDrive: true },
      createdAt: new Date().toISOString(),
    });

    expect(available).not.toBeNull();
    expect(available?.vendor).toBe("github-actions");
  });

  test("07: Preservation of 10 frozen core files", async () => {
    const { execSync } = await import("child_process");
    const frozenFiles = [
      "agents/script-agent.ts",
      "agents/quiz-corrector-agent.ts",
      "app/api/quiz/compile/route.ts",
      "app/api/quiz/generate/route.ts",
      "app/api/quiz/geo/route.ts",
      "app/api/quiz/mock/route.ts",
      "app/api/quiz/render-batch/route.ts",
      "content-engines/quiz/critic.json",
      "content-engines/quiz/index.ts",
      "lib/core/QuestionOptimizer.ts",
    ];

    const gitOutput = execSync(`git status --porcelain ${frozenFiles.join(" ")}`, {
      encoding: "utf-8",
      cwd: process.cwd(),
    }).trim();

    expect(gitOutput).toBe("");
  });
});
