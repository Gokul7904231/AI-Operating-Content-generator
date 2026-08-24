/**
 * FactoryOS v1 — Dual-Stack Python Floor & Guardian Bridge
 * Integrates Python Floors 01–03 & Floor 07 into the TypeScript Event Bus and World State.
 */

import type { FloorStatus } from "../contracts/WorldStateContracts";
import type { WorldStateEngine } from "../worldstate/WorldStateEngine";
import type { DurableEventBus } from "../events/DurableEventBus";
import type { CaseManager } from "../cases/CaseManager";

export interface PythonFloorHandoffPayload {
  readonly floorId: string;
  readonly status: "SUCCESS" | "FAILED" | "DEGRADED";
  readonly outputArtifact?: Record<string, unknown>;
  readonly guardianScore?: number;
  readonly errors?: string[];
  readonly executionTimeMs: number;
}

export class PythonFloorBridge {
  constructor(
    private worldState: WorldStateEngine,
    private eventBus: DurableEventBus,
    private caseManager: CaseManager
  ) {}

  async handleFloorHandoff(payload: PythonFloorHandoffPayload): Promise<void> {
    const floorStatus: FloorStatus =
      payload.status === "SUCCESS" ? "ONLINE" : payload.status === "DEGRADED" ? "DEGRADED" : "ERROR";

    this.worldState.updateFloorStatus(payload.floorId, floorStatus);

    await this.eventBus.publish("FACTORY_STATE_CHANGED", {
      floorId: payload.floorId,
      status: floorStatus,
      executionTimeMs: payload.executionTimeMs,
      guardianScore: payload.guardianScore,
    });

    if (payload.status === "FAILED" && payload.errors && payload.errors.length > 0) {
      await this.caseManager.createCase({
        title: `[Python Bridge] Execution failure on ${payload.floorId}`,
        description: payload.errors.join("; "),
        floorId: payload.floorId,
        category: "FLOOR_EXECUTION_ERROR",
        severity: "HIGH",
        detectorId: "python_floor_bridge",
        symptoms: payload.errors,
        observedState: { errors: payload.errors, handoff: payload },
      });
    }
  }

  async recordGuardianCompliance(certificate: {
    certificateId: string;
    jobId: string;
    floorId: string;
    passed: boolean;
    invariants: Record<string, boolean>;
  }): Promise<void> {
    await this.eventBus.publish(
      certificate.passed ? "VERIFICATION_PASSED" : "VERIFICATION_FAILED",
      {
        certificateId: certificate.certificateId,
        jobId: certificate.jobId,
        floorId: certificate.floorId,
        invariants: certificate.invariants,
      },
      { source: "python_guardian_bridge" }
    );
  }
}
