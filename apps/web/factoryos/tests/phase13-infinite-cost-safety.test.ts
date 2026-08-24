import { describe, it, expect } from "vitest";
import { TerminationController } from "../core/cognitive/rlm/TerminationController";

describe("FactoryOS Frontier v2 — Phase 13: Economic Safety & Termination Bounds Suite", () => {
  it("1. Bounded Cost Ceilings: Clamps maximum recursion depth, tokens, and budget cost", () => {
    const controller = new TerminationController();

    const budget = controller.calculateBudget({
      severity: "CRITICAL",
      uncertainty: 0.9,
      novelty: 0.8,
      expectedInformationGain: 0.9,
    });

    expect(budget.maxDepth).toBeLessThanOrEqual(5);
    expect(budget.maxTokens).toBeLessThanOrEqual(15000);
    expect(budget.maxCost).toBeLessThanOrEqual(0.10);
    expect(budget.maxTimeMs).toBeLessThanOrEqual(60000);
  });
});
