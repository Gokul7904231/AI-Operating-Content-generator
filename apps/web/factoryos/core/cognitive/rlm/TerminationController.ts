/**
 * FactoryOS Frontier v2 — Termination Controller (Bounded Recursion Supervisor)
 * Computes dynamic recursion budgets and enforces safety bounds against runaway token loops.
 */

import type { RecursionBudget } from "../CognitiveContracts";

export interface BudgetAssessmentInput {
  readonly uncertainty: number; // 0.0 to 1.0
  readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly novelty: number; // 0.0 to 1.0
  readonly expectedInformationGain: number; // 0.0 to 1.0
  readonly costCeiling?: number;
}

export class TerminationController {
  calculateBudget(input: BudgetAssessmentInput): RecursionBudget {
    const sevScore =
      input.severity === "CRITICAL" ? 1.0 : input.severity === "HIGH" ? 0.75 : input.severity === "MEDIUM" ? 0.5 : 0.25;

    // Composite urgency & depth factor
    const urgency = 0.4 * sevScore + 0.3 * input.uncertainty + 0.3 * input.novelty;

    let maxDepth = 1;
    let maxTokens = 2000;
    let maxTimeMs = 10000;
    let maxSubcalls = 2;
    let maxParallelBranches = 1;

    if (urgency > 0.8 && input.expectedInformationGain > 0.5) {
      maxDepth = 3;
      maxTokens = 12000;
      maxTimeMs = 60000;
      maxSubcalls = 8;
      maxParallelBranches = 3;
    } else if (urgency > 0.5 && input.expectedInformationGain > 0.3) {
      maxDepth = 2;
      maxTokens = 6000;
      maxTimeMs = 30000;
      maxSubcalls = 4;
      maxParallelBranches = 2;
    }

    return {
      maxDepth,
      maxTokens,
      maxTimeMs,
      maxSubcalls,
      maxCost: input.costCeiling || (maxTokens / 1000) * 0.002, // $0.002 per 1k tokens est
      maxParallelBranches,
    };
  }

  shouldTerminate(
    currentDepth: number,
    currentTokens: number,
    elapsedMs: number,
    subcallsMade: number,
    budget: RecursionBudget,
    lastInfoGain: number = 0.5
  ): { terminate: boolean; reason?: string } {
    if (lastInfoGain < 0.05) {
      return { terminate: true, reason: "Diminishing information gain plateau detected" };
    }
    if (currentDepth >= budget.maxDepth) {
      return { terminate: true, reason: `Max recursion depth reached (${budget.maxDepth})` };
    }
    if (currentTokens >= budget.maxTokens) {
      return { terminate: true, reason: `Max token budget exhausted (${currentTokens}/${budget.maxTokens})` };
    }
    if (elapsedMs >= budget.maxTimeMs) {
      return { terminate: true, reason: `Max time limit exceeded (${elapsedMs}ms)` };
    }
    if (subcallsMade >= budget.maxSubcalls) {
      return { terminate: true, reason: `Max subcalls limit reached (${subcallsMade}/${budget.maxSubcalls})` };
    }
    return { terminate: false };
  }
}
