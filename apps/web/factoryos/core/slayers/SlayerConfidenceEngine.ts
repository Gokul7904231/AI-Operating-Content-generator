/**
 * FactoryOS Frontier v2 — Slayer Confidence & False-Positive Dampening Engine
 * Calibrates signal confidence, dampens transient noise for low/medium signals,
 * and ensures instant high-priority escalation for critical anomalies.
 */

import type { AnomalyObservation, SlayerReputation } from "../contracts/SlayerContracts";

export interface ConfidenceEvaluation {
  readonly isConfirmed: boolean;
  readonly effectiveConfidence: number;
  readonly rationale: string;
  readonly observationCount: number;
}

export class SlayerConfidenceEngine {
  private observationBuffer: Map<string, AnomalyObservation[]> = new Map();
  private readonly dampeningThreshold: number;

  constructor(dampeningThreshold: number = 2) {
    this.dampeningThreshold = dampeningThreshold;
  }

  /**
   * Evaluates an anomaly observation against false-positive dampening and reputation weighting.
   */
  evaluateConfidence(
    observation: AnomalyObservation,
    reputation: SlayerReputation
  ): ConfidenceEvaluation {
    const key = `${observation.floorId}:${observation.category}:${observation.target}`;
    const buffer = this.observationBuffer.get(key) || [];
    buffer.push(observation);
    this.observationBuffer.set(key, buffer);

    // Keep buffer bounded (last 10 observations)
    if (buffer.length > 10) buffer.shift();

    // 1. Critical & High Severity: IMMEDIATE CONFIRMATION (Bypass dampening window)
    if (observation.severity === "CRITICAL" || observation.severity === "HIGH") {
      const baseConfidence = observation.severity === "CRITICAL" ? 0.95 : 0.85;
      const effectiveConfidence = Math.min(
        1.0,
        Math.max(0.7, baseConfidence * 0.7 + reputation.trustScore * 0.3)
      );

      return {
        isConfirmed: true,
        effectiveConfidence,
        rationale: `Immediate confirmation for ${observation.severity} severity anomaly on ${observation.floorId}.`,
        observationCount: buffer.length,
      };
    }

    // 2. Low / Medium Severity: Multi-tick Dampening Window
    if (buffer.length >= this.dampeningThreshold) {
      const consistencyBonus = Math.min(0.2, (buffer.length - 1) * 0.05);
      const effectiveConfidence = Math.min(
        1.0,
        Math.max(0.65, 0.75 * 0.6 + reputation.trustScore * 0.2 + consistencyBonus)
      );

      return {
        isConfirmed: true,
        effectiveConfidence,
        rationale: `Persistent anomaly confirmed after ${buffer.length} observations (confidence: ${effectiveConfidence.toFixed(2)}).`,
        observationCount: buffer.length,
      };
    }

    // 3. Transient signal under threshold -> Dampened
    return {
      isConfirmed: false,
      effectiveConfidence: 0.4,
      rationale: `Transient signal observed (${buffer.length}/${this.dampeningThreshold} required observations for ${observation.severity} severity). Dampened.`,
      observationCount: buffer.length,
    };
  }

  clearObservation(floorId: string, category: string, target: string): void {
    const key = `${floorId}:${category}:${target}`;
    this.observationBuffer.delete(key);
  }

  clearAll(): void {
    this.observationBuffer.clear();
  }
}
