/**
 * FactoryOS Frontier v2 — Floor Guardian Load Balancer
 * Distributes floor tasks, detects worker overload, and throttles concurrency during pressure.
 */

import type { WorkerState } from "../contracts/WorldStateContracts";

export interface TaskLoadDistribution {
  workerId: string;
  activeTasks: number;
  utilization: number; // 0.0 to 1.0
}

export class GuardianLoadBalancer {
  private floorId: string;
  private maxConcurrency: number;
  private currentThrottle: number = 1.0;

  constructor(floorId: string, maxConcurrency: number = 10) {
    this.floorId = floorId;
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Evaluates worker utilization and returns rebalancing plans if needed.
   */
  evaluateLoad(
    workers: WorkerState[],
    queueDepth: number
  ): { needsRebalance: boolean; overloadedWorkers: string[]; idleWorkers: string[]; targetConcurrency: number } {
    const overloaded: string[] = [];
    const idle: string[] = [];

    const healthy = workers.filter((w) => w.status === "HEALTHY");

    for (const w of healthy) {
      const active = w.metrics.tasksCompleted ? (w.metrics.tasksCompleted % 5) : 0;
      // High task load simulation / metric
      if (active >= 4) {
        overloaded.push(w.workerId);
      } else if (active <= 1) {
        idle.push(w.workerId);
      }
    }

    // Adjust throttle based on queue depth
    if (queueDepth > 20) {
      this.currentThrottle = 0.5; // Throttle to 50%
    } else if (queueDepth > 10) {
      this.currentThrottle = 0.8;
    } else {
      this.currentThrottle = 1.0;
    }

    const needsRebalance = overloaded.length > 0 && idle.length > 0;
    const targetConcurrency = Math.max(1, Math.round(this.maxConcurrency * this.currentThrottle));

    return {
      needsRebalance,
      overloadedWorkers: overloaded,
      idleWorkers: idle,
      targetConcurrency,
    };
  }

  getThrottle(): number {
    return this.currentThrottle;
  }
}
