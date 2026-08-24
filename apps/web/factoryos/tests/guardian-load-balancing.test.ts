import { describe, it, expect } from "vitest";
import { GuardianLoadBalancer } from "../core/guardian/GuardianLoadBalancer";
import type { WorkerState } from "../core/contracts/WorldStateContracts";

describe("FactoryOS Frontier v2 — Floor Guardian Load Balancing Suite", () => {
  const balancer = new GuardianLoadBalancer("floor01_strategy", 10);

  it("1. Workload Rebalancing: Detects overloaded and idle workers", () => {
    const workers: WorkerState[] = [
      {
        workerId: "w1",
        role: "EXECUTOR",
        specialization: "floor01_strategy",
        status: "HEALTHY",
        lastSeen: new Date().toISOString(),
        metrics: { tasksCompleted: 4, tasksFailed: 0, uptimeSeconds: 100, averageLatencyMs: 20 },
      },
      {
        workerId: "w2",
        role: "EXECUTOR",
        specialization: "floor01_strategy",
        status: "HEALTHY",
        lastSeen: new Date().toISOString(),
        metrics: { tasksCompleted: 1, tasksFailed: 0, uptimeSeconds: 100, averageLatencyMs: 20 },
      },
    ];

    const result = balancer.evaluateLoad(workers, 5);
    expect(result.needsRebalance).toBe(true);
    expect(result.overloadedWorkers).toContain("w1");
    expect(result.idleWorkers).toContain("w2");
  });

  it("2. Queue Congestion Throttling: Reduces concurrency when queue is congested", () => {
    const workers: WorkerState[] = [
      {
        workerId: "w1",
        role: "EXECUTOR",
        specialization: "floor01_strategy",
        status: "HEALTHY",
        lastSeen: new Date().toISOString(),
        metrics: { tasksCompleted: 2, tasksFailed: 0, uptimeSeconds: 100, averageLatencyMs: 20 },
      },
    ];

    const result = balancer.evaluateLoad(workers, 25);
    expect(result.targetConcurrency).toBeLessThan(10);
    expect(balancer.getThrottle()).toBe(0.5);
  });
});
