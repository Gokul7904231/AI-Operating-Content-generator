import { describe, it, expect, beforeEach } from "vitest";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS v1 — World State Engine Suite", () => {
  let repo: InMemoryWorldStateRepository;
  let engine: WorldStateEngine;

  beforeEach(() => {
    repo = new InMemoryWorldStateRepository();
    engine = new WorldStateEngine(repo, true);
  });

  it("01: Initializes with authoritative default floors and operational state", () => {
    const state = engine.getState();
    expect(state.factoryStatus).toBe("OPERATIONAL");
    expect(state.schemaVersion).toBe("1.0.0");
    expect(state.floors["floor01_strategy"].status).toBe("ONLINE");
    expect(state.floors["floor02_scripting"].status).toBe("ONLINE");
    expect(state.floors["floor03_asset_realization"].status).toBe("ONLINE");
    expect(state.floors["floor07_compliance"].status).toBe("ONLINE");
    expect(state.resources.gpuAvailable).toBe(true);
    expect(state.systemConfidence).toBe(0.98);
  });

  it("02: State mutations produce immutable snapshots with sequence increments", () => {
    const s1 = engine.getState();
    engine.updateFloorStatus("floor02_scripting", "DEGRADED", "Scripting latency spike");
    const s2 = engine.getState();

    expect(s1.floors["floor02_scripting"].status).toBe("ONLINE");
    expect(s2.floors["floor02_scripting"].status).toBe("DEGRADED");
    expect(s2.floors["floor02_scripting"].currentObjective).toBe("Scripting latency spike");
    expect(s2.sequenceNumber).toBe(s1.sequenceNumber + 1);
  });

  it("03: Persists state to repository and restores accurately on reboot", async () => {
    engine.updateFloorStatus("floor03_asset_realization", "ONLINE", "Rendering Batch #42", ["job_001"]);
    engine.addActiveCase("case_test_123");
    await engine.persist();

    // Create a new fresh engine instance with same repo
    const rebootedEngine = new WorldStateEngine(repo, true);
    const restored = await rebootedEngine.restore();

    expect(restored).toBe(true);
    const state = rebootedEngine.getState();
    expect(state.floors["floor03_asset_realization"].currentObjective).toBe("Rendering Batch #42");
    expect(state.floors["floor03_asset_realization"].activeJobs).toContain("job_001");
    expect(state.activeCaseIds).toContain("case_test_123");
  });

  it("04: Registers workers and updates heartbeats and metrics", () => {
    engine.registerWorker({
      workerId: "worker_agent_01",
      role: "SLAYER",
      specialization: "GPU_COMPUTE",
      status: "HEALTHY",
      lastSeen: new Date().toISOString(),
      metrics: {
        tasksCompleted: 10,
        tasksFailed: 0,
        uptimeSeconds: 120,
        averageLatencyMs: 45,
      },
    });

    const s1 = engine.getState();
    expect(s1.workers["worker_agent_01"].status).toBe("HEALTHY");

    engine.updateWorkerHeartbeat("worker_agent_01", "BUSY", "task_999", "case_888");
    const s2 = engine.getState();
    expect(s2.workers["worker_agent_01"].status).toBe("BUSY");
    expect(s2.workers["worker_agent_01"].currentTaskId).toBe("task_999");
    expect(s2.workers["worker_agent_01"].currentCaseId).toBe("case_888");
  });

  it("05: Automatically updates factoryStatus to ATTENTION_REQUIRED when cases active", () => {
    expect(engine.getState().factoryStatus).toBe("OPERATIONAL");
    engine.addActiveCase("case_crit_01");
    expect(engine.getState().factoryStatus).toBe("ATTENTION_REQUIRED");

    engine.removeActiveCase("case_crit_01");
    expect(engine.getState().factoryStatus).toBe("OPERATIONAL");
  });
});
