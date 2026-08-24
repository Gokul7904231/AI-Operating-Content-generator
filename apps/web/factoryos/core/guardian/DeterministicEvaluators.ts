/**
 * FactoryOS v0.1 — Deterministic Evaluators
 *
 * Fully deterministic output validation.
 * No LLMs. Pure, fast code checking.
 */

import type { Evaluator, EvaluationReport, EvaluationMetric, EvaluationDecision } from "./GuardianContracts";

// ─── Schema Validity Evaluator ───────────────────────────────────────────────

export class SchemaValidityEvaluator implements Evaluator<any> {
  readonly name = "schema_validity";

  constructor(private readonly requiredSchemaKeys: string[]) {}

  async evaluate(output: any): Promise<EvaluationReport> {
    const metrics: EvaluationMetric[] = [];
    let passedCount = 0;

    if (!output || typeof output !== "object") {
      metrics.push({
        name: "object_check",
        score: 0,
        passed: false,
        reason: "Output is not a valid object",
      });
    } else {
      for (const key of this.requiredSchemaKeys) {
        const hasKey = key in output;
        if (hasKey) passedCount++;
        metrics.push({
          name: `key_${key}`,
          score: hasKey ? 1 : 0,
          passed: hasKey,
          reason: hasKey ? undefined : `Missing required schema key: ${key}`,
        });
      }
    }

    const overallScore = this.requiredSchemaKeys.length > 0
      ? passedCount / this.requiredSchemaKeys.length
      : 1.0;

    let decision: EvaluationDecision = "PASS";
    if (overallScore < 1.0) decision = "FAIL"; // Any missing schema key is a terminal FAIL

    return {
      success: decision === "PASS",
      decision,
      metrics,
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── Completeness Evaluator ──────────────────────────────────────────────────

export class CompletenessEvaluator implements Evaluator<any> {
  readonly name = "completeness";

  constructor(private readonly textFieldKeys: string[]) {}

  async evaluate(output: any): Promise<EvaluationReport> {
    const metrics: EvaluationMetric[] = [];
    let completedCount = 0;

    if (!output || typeof output !== "object") {
      metrics.push({ name: "completeness_check", score: 0, passed: false, reason: "Invalid object" });
    } else {
      for (const key of this.textFieldKeys) {
        const val = output[key];
        const isComplete = typeof val === "string" && val.trim().length >= 10;
        if (isComplete) completedCount++;

        metrics.push({
          name: `field_${key}_complete`,
          score: isComplete ? 1 : 0,
          passed: isComplete,
          reason: isComplete ? undefined : `Field "${key}" must be at least 10 chars long`,
        });
      }
    }

    const score = this.textFieldKeys.length > 0 ? completedCount / this.textFieldKeys.length : 1.0;
    let decision: EvaluationDecision = "PASS";
    if (score < 0.5) decision = "FAIL";
    else if (score < 1.0) decision = "REPAIR";

    return {
      success: decision === "PASS",
      decision,
      metrics,
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── Grounding Evaluator ─────────────────────────────────────────────────────

export class GroundingEvaluator implements Evaluator<any> {
  readonly name = "grounding";

  constructor(private readonly searchFields: string[]) {}

  async evaluate(output: any, referenceEvidence?: any): Promise<EvaluationReport> {
    const metrics: EvaluationMetric[] = [];

    const evidenceText = this._extractEvidenceText(referenceEvidence).toLowerCase();

    if (!evidenceText) {
      // If no reference evidence is provided, we cannot verify grounding
      return {
        success: true,
        decision: "PASS",
        metrics: [{ name: "grounding_skip", score: 1.0, passed: true, reason: "No evidence provided for grounding check" }],
        timestamp: new Date().toISOString(),
      };
    }

    let totalTerms = 0;
    let matchedTerms = 0;

    if (output && typeof output === "object") {
      for (const key of this.searchFields) {
        const text = output[key];
        if (typeof text === "string" && text.trim().length > 0) {
          const words = text.match(/\b[A-Za-z0-9_]+\b/g) || [];
          for (const word of words) {
            // Check only words of length >= 3
            if (word.length >= 3) {
              totalTerms++;
              if (evidenceText.includes(word.toLowerCase())) {
                matchedTerms++;
              }
            }
          }
        }
      }
    }

    const score = totalTerms > 0 ? matchedTerms / totalTerms : 1.0;
    let decision: EvaluationDecision = "PASS";
    if (score < 0.4) decision = "FAIL";
    else if (score < 0.8) decision = "REPAIR"; // Needs repair if grounding is weak

    metrics.push({
      name: "grounding_density",
      score,
      passed: score >= 0.8,
      reason: score >= 0.8 ? undefined : `Grounding density too low: ${(score * 100).toFixed(0)}%`,
    });

    return {
      success: decision === "PASS",
      decision,
      metrics,
      timestamp: new Date().toISOString(),
    };
  }

  private _extractEvidenceText(evidence: any): string {
    if (!evidence) return "";
    if (typeof evidence === "string") return evidence;
    if (Array.isArray(evidence)) {
      return evidence.map((e) => e.content ?? "").join(" ");
    }
    if (typeof evidence === "object") {
      if (Array.isArray(evidence.items)) {
        return evidence.items.map((i: any) => i.content ?? "").join(" ");
      }
      if (Array.isArray(evidence.evidence)) {
        return evidence.evidence.map((i: any) => i.content ?? "").join(" ");
      }
    }
    return "";
  }
}
