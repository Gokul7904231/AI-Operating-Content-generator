/**
 * FactoryOS Frontier v2 — Guardian Worker Manager
 * Manages floor-local worker lifecycles, health checks, local recoveries, and quarantines.
 */

import type { WorkerState } from "../contracts/WorldStateContracts";
import type { WorldStateEngine } from "../worldstate/WorldStateEngine";
import type { GuardianMemory } from "./GuardianMemory";

export class GuardianWorkerManager {
  private floorId: string;
  private worldState: WorldStateEngine;
  private memory: GuardianMemory;

  constructor(floorId: string, worldState: WorldStateEngine, memory: GuardianMemory) {
    this.floorId = floorId;
    this.worldState = worldState;
    this.memory = memory;
  }

  getFloorWorkers(): WorkerState[] {
    const allWorkers = this.worldState.getState().workers;
    return Object.values(allWorkers).filter(
      (w) => w.assignedFloor === this.floorId || w.workerId.includes(this.floorId)
    );
  }

  /**
   * Recovers a degraded or failed worker locally if allowed.
   */
  async recoverWorker(workerId: string): Promise<{ success: boolean; quarantined: boolean }> {
    const incident = this.memory.recordWorkerFailure(workerId);

    // If failed > 2 times, quarantine
    if (incident.failureCount > 2) {
      this.memory.quarantineWorker(workerId);
      this.worldState.updateWorkerHeartbeat(workerId, "OFFLINE" as any);
      return { success: false, quarantined: true };
    }

    this.memory.recordWorkerRecoveryAttempt(workerId);
    // Restore health in WorldState
    this.worldState.updateWorkerHeartbeat(workerId, "HEALTHY");
    return { success: true, quarantined: false };
  }

  /**
   * Quarantines a rogue or repeated failing worker.
   */
  quarantineWorker(workerId: string): void {
    this.memory.quarantineWorker(workerId);
    this.worldState.updateWorkerHeartbeat(workerId, "OFFLINE" as any);
  }

  /**
   * Checks for stale worker heartbeats.
   */
  checkStaleWorkers(maxStaleMs: number = 45000): WorkerState[] {
    const now = Date.now();
    const stale: WorkerState[] = [];

    for (const w of this.getFloorWorkers()) {
      const lastSeen = new Date(w.lastSeen).getTime();
      if (now - lastSeen > maxStaleMs && w.status === "HEALTHY") {
        stale.push(w);
      }
    }

    return stale;
  }
}
