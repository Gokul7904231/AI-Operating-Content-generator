/**
 * FactoryOS v1 — Overseer Multi-Mode Thinking Controller
 * Dynamically selects reasoning depth: REFLEX, DELIBERATE, or DEEP based on uncertainty, severity, and risk.
 */

import type { GoalDefinition, ThinkingMode } from "../contracts/OverseerThinkingContracts";
import type { Case } from "../contracts/CaseContracts";
import type { WorldState } from "../contracts/WorldStateContracts";

export interface ThinkingAssessment {
  readonly mode: ThinkingMode;
  readonly rationale: string;
  readonly maxPlanningDepth: number;
  readonly tokenBudget: number;
  readonly timeoutMs: number;
  readonly parallelWorkersAllowed: number;
}

export class OverseerThinkingController {
  assessCommand(command: string, worldState: WorldState): ThinkingAssessment {
    const lower = command.toLowerCase();

    // Check for high-complexity / multi-stage directives
    if (
      lower.includes("operate the factory") ||
      lower.includes("autonomous") ||
      lower.includes("full pipeline") ||
      lower.includes("deep") ||
      lower.includes("recover from crash")
    ) {
      return {
        mode: "DEEP",
        rationale: "Complex multi-agent operational mission requires deep reasoning and continuous DAG evaluation.",
        maxPlanningDepth: 5,
        tokenBudget: 15000,
        timeoutMs: 300000,
        parallelWorkersAllowed: 4,
      };
    }

    if (
      lower.includes("produce") ||
      lower.includes("generate") ||
      lower.includes("heal") ||
      lower.includes("investigate") ||
      lower.includes("plan")
    ) {
      return {
        mode: "DELIBERATE",
        rationale: "Standard workflow or triage requires structured multi-step planning and evaluation.",
        maxPlanningDepth: 3,
        tokenBudget: 4000,
        timeoutMs: 60000,
        parallelWorkersAllowed: 2,
      };
    }

    // Default fast reflex
    return {
      mode: "REFLEX",
      rationale: "Deterministic direct operation or status query requires fast reflex response.",
      maxPlanningDepth: 1,
      tokenBudget: 500,
      timeoutMs: 5000,
      parallelWorkersAllowed: 1,
    };
  }

  assessCase(caseItem: Case, worldState: WorldState): ThinkingAssessment {
    if (caseItem.severity === "CRITICAL" || caseItem.category === "POLICY_VIOLATION" || caseItem.linkedCaseIds.length > 2) {
      return {
        mode: "DEEP",
        rationale: `Critical severity anomaly or cascading failure on floor ${caseItem.floorId} requires deep multi-agent coordination.`,
        maxPlanningDepth: 4,
        tokenBudget: 10000,
        timeoutMs: 120000,
        parallelWorkersAllowed: 4,
      };
    }

    if (caseItem.severity === "HIGH" || caseItem.severity === "MEDIUM") {
      return {
        mode: "DELIBERATE",
        rationale: `Medium/High severity case requires structured triage, independent diagnostic verification, and transactional repair.`,
        maxPlanningDepth: 2,
        tokenBudget: 3000,
        timeoutMs: 45000,
        parallelWorkersAllowed: 2,
      };
    }

    return {
      mode: "REFLEX",
      rationale: "Low-severity isolated anomaly handled via deterministic reflex repair rule.",
      maxPlanningDepth: 1,
      tokenBudget: 500,
      timeoutMs: 5000,
      parallelWorkersAllowed: 1,
    };
  }
}
