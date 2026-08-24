/**
 * FactoryOS Frontier v2 — Overseer Presence Policy & Truth Gate
 * Enforces computational truthfulness, safety boundaries, transparency, and intent verification.
 */

import type { OverseerIntent, OverseerAffectState } from "./OverseerPresenceContracts";
import type { WorldState } from "../../contracts/WorldStateContracts";
import type { Case } from "../../contracts/CaseContracts";

export interface PolicyValidationContext {
  candidateIntent: OverseerIntent;
  affect: OverseerAffectState;
  worldState?: WorldState;
  activeCases?: Case[];
  missionStatus?: string;
  isValidatorPassed?: boolean;
}

export interface PolicyVerdict {
  approvedIntent: OverseerIntent;
  isModified: boolean;
  reason?: string;
}

export class OverseerPresencePolicy {
  /**
   * Evaluates candidate intent against ground truth facts.
   * Never permits visual fabrication of success or suppression of emergencies.
   */
  static evaluateTruthGate(ctx: PolicyValidationContext): PolicyVerdict {
    const { candidateIntent, affect, worldState, activeCases = [], missionStatus, isValidatorPassed } = ctx;

    const criticalCases = activeCases.filter((c) => c.severity === "CRITICAL" && c.status !== "RESOLVED");
    const highCases = activeCases.filter((c) => c.severity === "HIGH" && c.status !== "RESOLVED");

    if (criticalCases.length > 0 || worldState?.factoryStatus === "HALTED" || worldState?.factoryStatus === "ATTENTION_REQUIRED") {
      if (candidateIntent !== "CRITICAL" && candidateIntent !== "WARNING") {
        return {
          approvedIntent: "CRITICAL",
          isModified: true,
          reason: `Policy Truth Gate: Blocked '${candidateIntent}' due to active critical case (${criticalCases[0]?.caseId || "factory_error"}). Enforcing CRITICAL.`,
        };
      }
    }

    // 2. High Severity Warning Invariant
    if (highCases.length > 0 || worldState?.factoryStatus === "DEGRADED") {
      if (candidateIntent === "SUCCESS" || candidateIntent === "PROUD" || candidateIntent === "IDLE") {
        return {
          approvedIntent: "CONCERNED",
          isModified: true,
          reason: `Policy Truth Gate: Blocked '${candidateIntent}' due to active high-severity case. Enforcing CONCERNED.`,
        };
      }
    }

    // 3. Success / Proud Invariant: Must have verified pass & healthy state
    if (candidateIntent === "SUCCESS" || candidateIntent === "PROUD") {
      if (isValidatorPassed === false) {
        return {
          approvedIntent: "CONCERNED",
          isModified: true,
          reason: "Policy Truth Gate: Blocked SUCCESS because validator failed. Enforcing CONCERNED.",
        };
      }
      if (missionStatus === "FAILED") {
        return {
          approvedIntent: "CONCERNED",
          isModified: true,
          reason: "Policy Truth Gate: Blocked SUCCESS because mission is marked FAILED.",
        };
      }
      if (activeCases.some((c) => (c.severity === "CRITICAL" || c.severity === "HIGH") && c.status !== "RESOLVED")) {
        return {
          approvedIntent: "WARNING",
          isModified: true,
          reason: "Policy Truth Gate: Blocked SUCCESS due to unhealed severe cases.",
        };
      }
    }

    // 4. Uncertainty & Low Confidence Invariant
    if (affect.confidence < 0.4 || affect.uncertainty > 0.6) {
      if (candidateIntent === "SUCCESS" || candidateIntent === "PROUD") {
        return {
          approvedIntent: "THINKING",
          isModified: true,
          reason: "Policy Truth Gate: Low confidence / high uncertainty prevents triumphant expression. Enforcing THINKING.",
        };
      }
    }

    return {
      approvedIntent: candidateIntent,
      isModified: false,
    };
  }

  /**
   * Safety responses for inquiries about consciousness / emotions.
   */
  static getConsciousnessStatement(): string {
    return "I do not possess biological consciousness or human emotions. My expressions, affect metrics, and attention are computational projections of FactoryOS operational state, telemetry, and decision-making pipelines.";
  }
}
