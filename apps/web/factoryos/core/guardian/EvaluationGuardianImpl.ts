/**
 * FactoryOS v0.1 — Evaluation Guardian Implementation
 *
 * Coordinates execution of multiple deterministic evaluators to yield
 * aggregated metrics and consensus PASS/REPAIR/FAIL decisions.
 */

import type {
  EvaluationDecision,
  EvaluationMetric,
  EvaluationReport,
  Evaluator,
} from "./GuardianContracts";

export class EvaluationGuardianImpl {
  private readonly evaluators = new Map<string, Evaluator<any>>();

  registerEvaluator(evaluator: Evaluator<any>): void {
    this.evaluators.set(evaluator.name, evaluator);
  }

  getEvaluator(name: string): Evaluator<any> | null {
    return this.evaluators.get(name) ?? null;
  }

  async evaluateOutput<TOutput>(
    output: TOutput,
    referenceEvidence?: any
  ): Promise<EvaluationReport> {
    const t0 = Date.now();
    const metrics: EvaluationMetric[] = [];
    const decisions: EvaluationDecision[] = [];

    for (const evaluator of this.evaluators.values()) {
      try {
        const report = await evaluator.evaluate(output, referenceEvidence);
        metrics.push(...report.metrics);
        decisions.push(report.decision);
      } catch (err) {
        metrics.push({
          name: `${evaluator.name}_evaluator_error`,
          score: 0.0,
          passed: false,
          reason: err instanceof Error ? err.message : String(err),
        });
        decisions.push("FAIL");
      }
    }

    // Consolidated Decision logic
    let finalDecision: EvaluationDecision = "PASS";
    if (decisions.includes("FAIL") || this.evaluators.size === 0) {
      finalDecision = "FAIL";
    } else if (decisions.includes("REPAIR")) {
      finalDecision = "REPAIR";
    }

    return {
      success: finalDecision === "PASS",
      decision: finalDecision,
      metrics,
      details: {
        evaluatorCount: this.evaluators.size,
        durationMs: Date.now() - t0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  clear(): void {
    this.evaluators.clear();
  }
}
