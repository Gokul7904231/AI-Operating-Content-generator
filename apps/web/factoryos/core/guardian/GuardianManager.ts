/**
 * FactoryOS Frontier v2 — Guardian Manager
 * Coordinates lifecycle and multi-guardian operation across all production floors.
 */

import { GuardianKernel } from "./GuardianKernel";
import type { DurableEventBus } from "../events/DurableEventBus";
import type { WorldStateEngine } from "../worldstate/WorldStateEngine";
import type { CaseManager } from "../cases/CaseManager";

export class GuardianManager {
  private guardians: Map<string, GuardianKernel> = new Map();
  private eventBus: DurableEventBus;
  private worldState: WorldStateEngine;
  private caseManager?: CaseManager;
  private isRunning: boolean = false;

  constructor(
    eventBus: DurableEventBus,
    worldState: WorldStateEngine,
    caseManager?: CaseManager
  ) {
    this.eventBus = eventBus;
    this.worldState = worldState;
    this.caseManager = caseManager;

    this.registerDefaultGuardians();
  }

  private registerDefaultGuardians(): void {
    const floors = [
      { name: "Floor 01 Guardian (Strategy)", floorId: "floor01_strategy" },
      { name: "Floor 02 Guardian (Scripting)", floorId: "floor02_scripting" },
      { name: "Floor 03 Guardian (Asset Realization)", floorId: "floor03_asset_realization" },
      { name: "Floor 07 Guardian (Compliance)", floorId: "floor07_compliance" },
    ];

    for (const f of floors) {
      const guardian = new GuardianKernel(
        {
          name: f.name,
          floorId: f.floorId,
          auditIntervalMs: 2000,
          heartbeatIntervalMs: 3000,
        },
        this.worldState,
        this.eventBus,
        this.caseManager
      );
      this.guardians.set(f.floorId, guardian);
    }
  }

  getGuardian(floorId: string): GuardianKernel | undefined {
    return this.guardians.get(floorId);
  }

  getAllGuardians(): GuardianKernel[] {
    return Array.from(this.guardians.values());
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    for (const guardian of this.guardians.values()) {
      await guardian.start();
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    for (const guardian of this.guardians.values()) {
      await guardian.stop();
    }
  }
}
