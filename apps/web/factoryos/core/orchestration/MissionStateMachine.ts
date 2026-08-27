/**
 * FactoryOS v1 — Authoritative Mission State Machine
 * Owns and enforces legal state transitions for Missions and Floor Executions.
 */

import type { MissionState } from "../contracts/MissionContracts";
import type { FloorExecutionStatus } from "../contracts/FloorProtocolContracts";

export type MissionStatus = MissionState;

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly entityType: "MISSION" | "FLOOR",
    public readonly currentStatus: string,
    public readonly targetStatus: string,
    public readonly reason?: string
  ) {
    super(
      `Invalid ${entityType} state transition from '${currentStatus}' to '${targetStatus}'${reason ? `: ${reason}` : ""}`
    );
    this.name = "InvalidStateTransitionError";
  }
}

export class MissionStateMachine {
  private static readonly LEGAL_MISSION_TRANSITIONS: Record<MissionState, MissionState[]> = {
    CREATED: ["PLANNING", "AUTHORIZED", "RUNNING", "CANCELLED"],
    PLANNING: ["AUTHORIZED", "RUNNING", "BLOCKED", "CANCELLED", "FAILED"],
    AUTHORIZED: ["RUNNING", "PAUSED", "CANCELLED", "FAILED"],
    RUNNING: ["PAUSED", "BLOCKED", "REPLANNING", "VERIFYING", "COMPLETING", "COMPLETED", "FAILED", "CANCELLED"],
    PAUSED: ["RUNNING", "CANCELLED", "FAILED"],
    BLOCKED: ["RUNNING", "REPLANNING", "FAILED", "CANCELLED"],
    REPLANNING: ["RUNNING", "BLOCKED", "FAILED", "CANCELLED"],
    VERIFYING: ["COMPLETING", "COMPLETED", "FAILED", "REPLANNING"],
    COMPLETING: ["COMPLETED", "FAILED"],
    COMPLETED: [], // Terminal
    FAILED: ["REPLANNING", "RECOVERING", "RETRYING"], // May transition to REPLANNING via Healer/Overseer
    RECOVERING: ["RUNNING", "FAILED", "CANCELLED"],
    RETRYING: ["RUNNING", "FAILED", "CANCELLED"],
    WAITING_FOR_APPROVAL: ["AUTHORIZED", "RUNNING", "CANCELLED"],
    CANCELLED: [], // Terminal
    TERMINATED: [], // Terminal
  };

  private static readonly LEGAL_FLOOR_TRANSITIONS: Record<FloorExecutionStatus, FloorExecutionStatus[]> = {
    PENDING: ["STARTING", "CANCELLED", "FAILED"],
    STARTING: ["RUNNING", "FAILED", "CANCELLED"],
    RUNNING: ["VERIFYING", "COMPLETED", "FAILED", "REPAIR_REQUIRED", "CANCELLED"],
    VERIFYING: ["COMPLETED", "FAILED", "REPAIR_REQUIRED"],
    COMPLETED: [], // Terminal for this execution
    FAILED: ["REPAIR_REQUIRED", "CANCELLED"],
    REPAIR_REQUIRED: ["REPAIRED", "FAILED", "CANCELLED"],
    REPAIRED: ["RUNNING", "VERIFYING", "COMPLETED"],
    CANCELLED: [], // Terminal
  };

  public static canTransitionMission(current: MissionState, target: MissionState): boolean {
    if (current === target) return true;
    const allowed = this.LEGAL_MISSION_TRANSITIONS[current] || [];
    return allowed.includes(target);
  }

  public static validateMissionTransition(current: MissionState, target: MissionState, context?: string): void {
    if (!this.canTransitionMission(current, target)) {
      throw new InvalidStateTransitionError("MISSION", current, target, context);
    }
  }

  public static canTransitionFloor(current: FloorExecutionStatus, target: FloorExecutionStatus): boolean {
    if (current === target) return true;
    const allowed = this.LEGAL_FLOOR_TRANSITIONS[current] || [];
    return allowed.includes(target);
  }

  public static validateFloorTransition(
    current: FloorExecutionStatus,
    target: FloorExecutionStatus,
    context?: string
  ): void {
    if (!this.canTransitionFloor(current, target)) {
      throw new InvalidStateTransitionError("FLOOR", current, target, context);
    }
  }
}
