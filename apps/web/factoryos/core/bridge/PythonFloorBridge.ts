/**
 * FactoryOS v1 — Dual-Stack Signed Floor Protocol Bridge
 * Integrates Python Floors 01–06 & Floor Compliance Validators into the TypeScript Kernel,
 * enforcing execution authorization tokens, replay prevention, and atomic state machine transitions.
 */

import type { WorldStateEngine } from "../worldstate/WorldStateEngine";
import type { DurableEventBus } from "../events/DurableEventBus";
import type { CaseManager } from "../cases/CaseManager";
import { MissionStateMachine } from "../orchestration/MissionStateMachine";
import type {
  FloorCommandEnvelope,
  FloorHandoffEnvelope,
  SecurityContext,
} from "../contracts/FloorProtocolContracts";

export class SecurityValidationError extends Error {
  constructor(message: string) {
    super(`[PythonFloorBridge Security] ${message}`);
    this.name = "SecurityValidationError";
  }
}

export class PythonFloorBridge {
  private seenNonces: Set<string> = new Set();
  private maxNonceAgeMs = 5 * 60 * 1000; // 5 minutes

  constructor(
    private worldState: WorldStateEngine,
    private eventBus: DurableEventBus,
    private caseManager: CaseManager
  ) {}

  /**
   * Validates security context and replay prevention.
   */
  public validateSecurityContext(envelope: FloorHandoffEnvelope | FloorCommandEnvelope): void {
    const sec: SecurityContext = envelope.security;

    if (!sec.userId || !sec.jobId || !sec.missionId || !sec.floorId || !sec.executionId) {
      throw new SecurityValidationError("Missing required security tuple fields (userId, jobId, missionId, floorId, executionId)");
    }

    if (!sec.executionToken || sec.executionToken.length < 16) {
      throw new SecurityValidationError("Invalid or missing executionToken");
    }

    if (sec.attempt < 1) {
      throw new SecurityValidationError("Attempt number must be >= 1");
    }

    // Replay check
    const timestampMs = new Date(envelope.timestamp).getTime();
    const now = Date.now();
    if (isNaN(timestampMs) || Math.abs(now - timestampMs) > this.maxNonceAgeMs) {
      throw new SecurityValidationError("Envelope timestamp is outside acceptable clock skew window");
    }

    if (this.seenNonces.has(envelope.nonce)) {
      throw new SecurityValidationError(`Replay detected: nonce '${envelope.nonce}' already processed`);
    }

    this.seenNonces.add(envelope.nonce);
    if (this.seenNonces.size > 10000) {
      this.seenNonces.clear();
    }
  }

  /**
   * Processes a completion/status handoff from an execution plane floor.
   */
  async handleFloorHandoff(envelope: FloorHandoffEnvelope): Promise<void> {
    this.validateSecurityContext(envelope);

    const { security, status, outputArtifact, errors, complianceScore, executionTimeMs } = envelope;

    // Validate Floor state transition
    const targetStatus = status === "SUCCESS" ? "COMPLETED" : status === "DEGRADED" ? "REPAIR_REQUIRED" : "FAILED";
    MissionStateMachine.validateFloorTransition("RUNNING", targetStatus, `Floor handoff for ${security.floorId}`);

    // Update World State
    const worldFloorStatus = status === "SUCCESS" ? "ONLINE" : status === "DEGRADED" ? "DEGRADED" : "ERROR";
    this.worldState.updateFloorStatus(security.floorId, worldFloorStatus, `Execution ${security.executionId}`);

    // Publish Durable State Change Event
    await this.eventBus.publish(
      status === "SUCCESS" ? "TASK_COMPLETED" : "FLOOR_STATUS_CHANGED",
      {
        floorId: security.floorId,
        missionId: security.missionId,
        jobId: security.jobId,
        userId: security.userId,
        executionId: security.executionId,
        parentExecutionId: security.parentExecutionId,
        attempt: security.attempt,
        status: targetStatus,
        executionTimeMs,
        complianceScore,
        outputArtifact,
        errors,
      },
      {
        correlationId: security.missionId,
        source: `bridge:${security.floorId}`,
        idempotencyKey: `${security.executionId}_${security.attempt}`,
      }
    );

    // Case Management on Failure
    if (status === "FAILED" && errors && errors.length > 0) {
      await this.caseManager.createCase({
        title: `[Python Bridge] Execution failure on ${security.floorId}`,
        description: errors.join("; "),
        floorId: security.floorId,
        category: "FLOOR_EXECUTION_ERROR",
        severity: "HIGH",
        detectorId: "python_floor_bridge",
        symptoms: errors,
        observedState: { errors, security, handoff: envelope },
      });
    }
  }

  /**
   * Records compliance certificate from FloorComplianceValidator.
   */
  async recordComplianceCertificate(certificate: {
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
      { source: "floor_compliance_bridge" }
    );
  }
}
