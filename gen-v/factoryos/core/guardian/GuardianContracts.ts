/**
 * FactoryOS v0.1 — Evaluation Guardian Contracts
 *
 * Contracts for checking output validity, completeness, and RAG grounding.
 */

export type EvaluationDecision = "PASS" | "REPAIR" | "FAIL";

export interface EvaluationMetric {
  name: string;
  score: number; // Normalised score [0.0, 1.0]
  passed: boolean;
  reason?: string;
}

export interface EvaluationReport {
  success: boolean;
  decision: EvaluationDecision;
  metrics: EvaluationMetric[];
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface Evaluator<TOutput = unknown> {
  readonly name: string;
  evaluate(output: TOutput, referenceEvidence?: any): Promise<EvaluationReport>;
}
