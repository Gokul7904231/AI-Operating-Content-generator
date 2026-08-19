/**
 * FactoryOS Frontier v2 — Overseer Affect & Appraisal Engine
 * Deterministic, policy-controlled computational appraisal mapping operational ground truth to bounded affect states.
 */

import type { OverseerAffectState } from "./OverseerPresenceContracts";
import type { WorldState } from "../../contracts/WorldStateContracts";
import type { Case } from "../../contracts/CaseContracts";

export interface AppraisalInput {
  eventType?: string;
  worldState?: WorldState;
  activeCases?: Case[];
  missionStatus?: string;
  predictionError?: number;
  confidence?: number;
  uncertainty?: number;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isUserInteracting?: boolean;
  userQuery?: string;
}

export class OverseerAffectEngine {
  private currentAffect: OverseerAffectState;

  constructor(initialAffect?: Partial<OverseerAffectState>) {
    this.currentAffect = {
      valence: 0.2,
      arousal: 0.1,
      confidence: 0.9,
      uncertainty: 0.1,
      curiosity: 0.1,
      urgency: 0.0,
      satisfaction: 0.5,
      concern: 0.0,
      frustration: 0.0,
      ...initialAffect,
    };
  }

  getAffect(): OverseerAffectState {
    return structuredClone(this.currentAffect);
  }

  /**
   * Evaluates operational context and updates computational affect.
   */
  evaluateAppraisal(input: AppraisalInput): OverseerAffectState {
    const {
      eventType,
      worldState,
      activeCases = [],
      missionStatus,
      predictionError = 0,
      confidence,
      uncertainty,
      severity,
      isUserInteracting,
    } = input;

    // Check for critical / high severity cases in the factory
    const criticalCases = activeCases.filter((c) => c.severity === "CRITICAL" && c.status !== "RESOLVED");
    const highCases = activeCases.filter((c) => c.severity === "HIGH" && c.status !== "RESOLVED");
    const openCasesCount = activeCases.filter((c) => c.status !== "RESOLVED").length;

    // 1. Base Calm State
    let valence = 0.3;
    let arousal = 0.1;
    let conf = confidence !== undefined ? confidence : 0.85;
    let uncert = uncertainty !== undefined ? uncertainty : Math.max(0.05, 1.0 - conf);
    let curiosity = 0.1;
    let urgency = 0.0;
    let satisfaction = 0.6;
    let concern = 0.0;
    let frustration = 0.0;

    // 2. Adjust for WorldState health
    if (worldState) {
      if (worldState.factoryStatus === "HALTED" || worldState.factoryStatus === "ATTENTION_REQUIRED") {
        concern = Math.max(concern, 0.9);
        urgency = Math.max(urgency, 0.85);
        arousal = Math.max(arousal, 0.8);
        valence = -0.7;
      } else if (worldState.factoryStatus === "DEGRADED") {
        concern = Math.max(concern, 0.6);
        urgency = Math.max(urgency, 0.5);
        arousal = Math.max(arousal, 0.5);
        valence = -0.2;
      }
    }

    // 3. Adjust for Cases
    if (criticalCases.length > 0 || severity === "CRITICAL") {
      concern = 1.0;
      urgency = 0.95;
      arousal = 0.9;
      valence = -0.8;
      conf = Math.min(conf, 0.7);
    } else if (highCases.length > 0 || severity === "HIGH") {
      concern = Math.max(concern, 0.75);
      urgency = Math.max(urgency, 0.7);
      arousal = Math.max(arousal, 0.65);
      valence = Math.min(valence, -0.4);
    } else if (openCasesCount > 0) {
      concern = Math.max(concern, 0.35);
      urgency = Math.max(urgency, 0.3);
      arousal = Math.max(arousal, 0.35);
    }

    // 4. Adjust for Prediction Errors (e.g. Healer failed, unexpected anomaly)
    if (predictionError > 0.3) {
      uncert = Math.max(uncert, Math.min(1.0, predictionError));
      curiosity = Math.max(curiosity, 0.7);
      concern = Math.max(concern, 0.5);
      frustration = Math.min(1.0, frustration + predictionError * 0.5);
      conf = Math.max(0.1, conf - predictionError * 0.4);
      arousal = Math.max(arousal, 0.55);
    }

    // 5. Adjust for Mission Events
    if (missionStatus === "COMPLETED" || eventType === "MISSION_COMPLETED") {
      satisfaction = 0.95;
      valence = 0.85;
      arousal = 0.4;
      concern = 0.0;
      urgency = 0.0;
      conf = 0.95;
    } else if (missionStatus === "FAILED" || eventType === "MISSION_FAILED") {
      satisfaction = 0.1;
      valence = -0.7;
      concern = 0.8;
      frustration = 0.6;
    } else if (eventType === "VALIDATION_PASSED") {
      satisfaction = Math.max(satisfaction, 0.9);
      valence = Math.max(valence, 0.7);
      concern = Math.max(0, concern - 0.5);
    }

    // 6. User Interaction
    if (isUserInteracting) {
      arousal = Math.max(arousal, 0.3);
      curiosity = Math.max(curiosity, 0.4);
    }

    // Smooth blending with previous affect (faster response on critical alerts)
    const isCriticalAlert = severity === "CRITICAL" || criticalCases.length > 0;
    const alpha = isCriticalAlert ? 0.95 : 0.75;
    this.currentAffect = {
      valence: this.clamp(this.currentAffect.valence * (1 - alpha) + valence * alpha, -1.0, 1.0),
      arousal: this.clamp(this.currentAffect.arousal * (1 - alpha) + arousal * alpha, 0.0, 1.0),
      confidence: this.clamp(this.currentAffect.confidence * (1 - alpha) + conf * alpha, 0.0, 1.0),
      uncertainty: this.clamp(this.currentAffect.uncertainty * (1 - alpha) + uncert * alpha, 0.0, 1.0),
      curiosity: this.clamp(this.currentAffect.curiosity * (1 - alpha) + curiosity * alpha, 0.0, 1.0),
      urgency: this.clamp(this.currentAffect.urgency * (1 - alpha) + urgency * alpha, 0.0, 1.0),
      satisfaction: this.clamp(this.currentAffect.satisfaction * (1 - alpha) + satisfaction * alpha, 0.0, 1.0),
      concern: this.clamp(this.currentAffect.concern * (1 - alpha) + concern * alpha, 0.0, 1.0),
      frustration: this.clamp(this.currentAffect.frustration * (1 - alpha) + frustration * alpha, 0.0, 1.0),
    };

    return structuredClone(this.currentAffect);
  }

  private clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }
}
