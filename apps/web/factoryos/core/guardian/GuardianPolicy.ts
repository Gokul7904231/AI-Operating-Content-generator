/**
 * FactoryOS Frontier v2 — Floor Guardian Policy & Safety Boundary Engine
 * Strictly enforces single-floor ownership, safety gates, and mandatory Overseer escalation rules.
 */

import type { GuardianDecision, GuardianActionType } from "./GuardianContracts";

export interface PolicyContext {
  floorId: string;
  targetFloorId?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isCrossFloor?: boolean;
  consecutiveFailures?: number;
  isIrreversible?: boolean;
}

export class GuardianPolicy {
  private floorId: string;

  constructor(floorId: string) {
    this.floorId = floorId;
  }

  /**
   * Validates if an action is legally within this Guardian's floor scope.
   */
  canExecuteLocally(action: GuardianActionType, ctx: PolicyContext): { allowed: boolean; reason?: string } {
    // 1. Cross-Floor Prohibition: Guardian cannot mutate foreign floors
    if (ctx.targetFloorId && ctx.targetFloorId !== this.floorId) {
      return {
        allowed: false,
        reason: `Policy Violation: Guardian of ${this.floorId} attempted action on foreign floor ${ctx.targetFloorId}. Requires Overseer escalation.`,
      };
    }

    // 2. Mandatory Escalation for Critical Safety Incidents
    if (ctx.severity === "CRITICAL") {
      return {
        allowed: false,
        reason: `Policy Boundary: CRITICAL severity on ${this.floorId} requires global Overseer escalation.`,
      };
    }

    // 3. Repeated Failure Threshold
    if ((ctx.consecutiveFailures || 0) >= 2 && action !== "ESCALATE") {
      return {
        allowed: false,
        reason: `Repeated Local Failure: Worker failed recovery ${ctx.consecutiveFailures} times. Escalation mandatory.`,
      };
    }

    // 4. Irreversible Action Gate
    if (ctx.isIrreversible && action !== "ESCALATE") {
      return {
        allowed: false,
        reason: "Irreversible action requires Overseer confirmation and TransactionalRepairGate.",
      };
    }

    return { allowed: true };
  }

  /**
   * Checks if an incident MUST be escalated to the Overseer.
   */
  shouldEscalate(ctx: PolicyContext): boolean {
    if (ctx.severity === "CRITICAL" || ctx.severity === "HIGH") return true;
    if (ctx.isCrossFloor) return true;
    if ((ctx.consecutiveFailures || 0) >= 2) return true;
    if (ctx.isIrreversible) return true;
    return false;
  }
}
