import { describe, it, expect } from "vitest";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";
import { GuardianMemory } from "../core/guardian/GuardianMemory";
import { GuardianWorkerManager } from "../core/guardian/GuardianWorkerManager";

describe("FactoryOS Frontier v2 — Floor Guardian Worker Management Suite", () => {
  it("1. Local Worker Recovery: Recovers degraded worker on first failure", async () => {
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository());
    const memory = new GuardianMemory("floor02_scripting");
    const manager = new GuardianWorkerManager("floor02_scripting", worldState, memory);

    worldState.registerWorker({
      workerId: "worker_script_01",
      role: "EXECUTOR",
      specialization: "floor02_scripting",
      status: "FAILED",
      lastSeen: new Date().toISOString(),
      assignedFloor: "floor02_scripting",
      metrics: { tasksCompleted: 5, tasksFailed: 1, uptimeSeconds: 100, averageLatencyMs: 20 },
    });

    const res = await manager.recoverWorker("worker_script_01");
    expect(res.success).toBe(true);
    expect(res.quarantined).toBe(false);
    expect(worldState.getState().workers["worker_script_01"].status).toBe("HEALTHY");
  });

  it("2. Quarantine Threshold: Repeated worker failure (>2) triggers automatic quarantine", async () => {
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository());
    const memory = new GuardianMemory("floor02_scripting");
    const manager = new GuardianWorkerManager("floor02_scripting", worldState, memory);

    worldState.registerWorker({
      workerId: "worker_script_02",
      role: "EXECUTOR",
      specialization: "floor02_scripting",
      status: "FAILED",
      lastSeen: new Date().toISOString(),
      assignedFloor: "floor02_scripting",
      metrics: { tasksCompleted: 5, tasksFailed: 3, uptimeSeconds: 100, averageLatencyMs: 20 },
    });

    await manager.recoverWorker("worker_script_02"); // 1st failure
    await manager.recoverWorker("worker_script_02"); // 2nd failure
    const res = await manager.recoverWorker("worker_script_02"); // 3rd failure -> quarantine!

    expect(res.quarantined).toBe(true);
    expect(worldState.getState().workers["worker_script_02"].status).toBe("OFFLINE");
  });
});
