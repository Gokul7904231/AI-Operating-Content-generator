/**
 * FactoryOS Frontier v2 — Cognitive Outcome Learner
 * Closes the feedback loop between cognitive decisions and verified Validator outcomes.
 */

import { randomUUID } from "node:crypto";
import type { IndexedExperienceMemory, ExperienceMemoryEntry } from "./memory/IndexedExperienceMemory";
import type { AgentEconomicsEngine } from "./economics/AgentEconomicsEngine";

export interface OutcomeFeedback {
  readonly incidentId: string;
  readonly category: string;
  readonly floorId?: string;
  readonly proposedAction: string;
  readonly predictedSuccess: boolean;
  readonly validatorPassed: boolean;
  readonly durationMs: number;
  readonly symptoms: string[];
}

export class CognitiveOutcomeLearner {
  private experienceMemory: IndexedExperienceMemory;
  private economics: AgentEconomicsEngine;
  private recentPredictionErrors: number[] = [];

  constructor(experienceMemory: IndexedExperienceMemory, economics: AgentEconomicsEngine) {
    this.experienceMemory = experienceMemory;
    this.economics = economics;
  }

  /**
   * Records verified outcome and persists experiential learning.
   */
  async recordOutcome(feedback: OutcomeFeedback): Promise<ExperienceMemoryEntry> {
    const isAccurate = feedback.predictedSuccess === feedback.validatorPassed;
    const predictionError = isAccurate ? 0.0 : 1.0;
    this.recentPredictionErrors.push(predictionError);
    if (this.recentPredictionErrors.length > 50) this.recentPredictionErrors.shift();

    // 1. Persist to Indexed Experience Memory
    const entry = await this.experienceMemory.storeExperience({
      category: "ANOMALY_RESOLUTION",
      title: `${feedback.category} resolution on ${feedback.floorId || "global"}`,
      summary: `Applied ${feedback.proposedAction} for ${feedback.symptoms.join("; ")} with validator score ${feedback.validatorPassed ? 1.0 : 0.0}.`,
      fullEvidence: {
        incidentId: feedback.incidentId,
        category: feedback.category,
        floorId: feedback.floorId,
        symptoms: feedback.symptoms,
        proposedAction: feedback.proposedAction,
        outcome: feedback.validatorPassed ? "SUCCESS" : "FAILURE",
        durationMs: feedback.durationMs,
      },
      floorId: feedback.floorId,
      confidence: feedback.validatorPassed ? 0.95 : 0.4,
    });

    // 2. Track Economics Telemetry
    this.economics.recordExecution("LARGE_REASONER", 250, feedback.durationMs);

    return entry;
  }

  getAveragePredictionError(): number {
    if (this.recentPredictionErrors.length === 0) return 0.0;
    const sum = this.recentPredictionErrors.reduce((a, b) => a + b, 0);
    return Math.round((sum / this.recentPredictionErrors.length) * 100) / 100;
  }
}
