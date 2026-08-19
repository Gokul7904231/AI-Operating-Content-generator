/**
 * FactoryOS Frontier v2 — Mission State Machine
 * Enforces authoritative, deterministic state transitions for autonomous Missions.
 */

import type { MissionState } from "../contracts/MissionContracts";

export class InvalidMissionStateTransitionError extends Error {
  constructor(
    public readonly missionId: string,
    public readonly currentState: MissionState,
    public readonly targetState: MissionState,
    reason?: string
  ) {
    const msg = `Invalid mission state transition for ${missionId}: cannot transition from '${currentState}' to '${targetState}'${
      reason ? ` (${reason})` : ""
    }.`;
    super(msg);
    this.name = "InvalidMissionStateTransitionError";
  }
}

export class MissionStateMachine {
  private static readonly VALID_TRANSITIONS: Record<MissionState, readonly MissionState[]> = {
    CREATED: ["PLANNING", "TERMINATED"],
    PLANNING: ["RUNNING", "BLOCKED", "FAILED", "TERMINATED"],
    RUNNING: ["PAUSED", "BLOCKED", "REPLANNING", "COMPLETING", "FAILED", "CANCELLED", "TERMINATED"],
    PAUSED: ["RUNNING", "CANCELLED", "TERMINATED"],
    BLOCKED: ["REPLANNING", "CANCELLED", "FAILED", "TERMINATED"],
    REPLANNING: ["RUNNING", "BLOCKED", "FAILED", "TERMINATED"],
    COMPLETING: ["COMPLETED", "REPLANNING", "FAILED", "TERMINATED"],
    COMPLETED: [],
    FAILED: [],
    CANCELLED: [],
    TERMINATED: [],
  };

  private static readonly TERMINAL_STATES: ReadonlySet<MissionState> = new Set([
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "TERMINATED",
  ]);

  static canTransition(from: MissionState, to: MissionState): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  static assertTransition(missionId: string, current: MissionState, target: MissionState, reason?: string): void {
    if (current === target) return; // Idempotent no-op

    if (this.TERMINAL_STATES.has(current)) {
      throw new InvalidMissionStateTransitionError(
        missionId,
        current,
        target,
        `Mission is in terminal state '${current}' and cannot be modified`
      );
    }

    if (!this.canTransition(current, target)) {
      throw new InvalidMissionStateTransitionError(missionId, current, target, reason);
    }
  }

  static isTerminal(state: MissionState): boolean {
    return this.TERMINAL_STATES.has(state);
  }
}
