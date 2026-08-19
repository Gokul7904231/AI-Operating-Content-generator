import { describe, it, expect } from "vitest";
import {
  OverseerAffectEngine,
  OverseerIntentEngine,
  OverseerPresencePolicy,
  type OverseerIntent,
} from "../core/overseer/presence";

describe("FactoryOS Frontier v2 — Overseer Presence State & Appraisal Suite", () => {
  it("1. Deterministic Affect Appraisal: Clamps metrics to valid ranges [0, 1] and [-1, 1]", () => {
    const affectEngine = new OverseerAffectEngine();

    const affect = affectEngine.evaluateAppraisal({
      eventType: "ANOMALY_DETECTED",
      severity: "CRITICAL",
      confidence: 0.3,
      uncertainty: 0.8,
      predictionError: 0.6,
    });

    expect(affect.valence).toBeGreaterThanOrEqual(-1.0);
    expect(affect.valence).toBeLessThanOrEqual(1.0);
    expect(affect.concern).toBeGreaterThan(0.7);
    expect(affect.urgency).toBeGreaterThan(0.7);
    expect(affect.uncertainty).toBeGreaterThan(0.5);
  });

  it("2. Priority Arbitration: Critical incident preempts casual user greeting", () => {
    const intentEngine = new OverseerIntentEngine();

    // User greeting pushed
    intentEngine.pushIntent("GREETING", {
      priority: "USER_INTERACTION",
      cause: "User said hello",
      durationMs: 3000,
    });

    // Critical safety anomaly pushed
    intentEngine.pushIntent("CRITICAL", {
      priority: "CRITICAL_SAFETY",
      cause: "Floor 03 render crash",
      isPersistent: true,
    });

    const effective = intentEngine.resolveEffectiveIntent({
      affect: {
        valence: -0.8,
        arousal: 0.9,
        confidence: 0.6,
        uncertainty: 0.4,
        curiosity: 0.2,
        urgency: 0.95,
        satisfaction: 0.0,
        concern: 1.0,
        frustration: 0.0,
      },
    });

    expect(effective).toBe("CRITICAL");
  });

  it("3. Truth Gate Policy: Rejects SUCCESS when Validator fails", () => {
    const verdict = OverseerPresencePolicy.evaluateTruthGate({
      candidateIntent: "SUCCESS",
      affect: {
        valence: 0.5,
        arousal: 0.4,
        confidence: 0.9,
        uncertainty: 0.1,
        curiosity: 0.1,
        urgency: 0.0,
        satisfaction: 0.9,
        concern: 0.0,
        frustration: 0.0,
      },
      isValidatorPassed: false,
    });

    expect(verdict.isModified).toBe(true);
    expect(verdict.approvedIntent).toBe("CONCERNED");
  });

  it("4. Truth Gate Policy: Rejects high confidence triumph when uncertainty is high", () => {
    const verdict = OverseerPresencePolicy.evaluateTruthGate({
      candidateIntent: "SUCCESS",
      affect: {
        valence: 0.5,
        arousal: 0.4,
        confidence: 0.2,
        uncertainty: 0.8,
        curiosity: 0.5,
        urgency: 0.2,
        satisfaction: 0.5,
        concern: 0.3,
        frustration: 0.0,
      },
      isValidatorPassed: true,
    });

    expect(verdict.isModified).toBe(true);
    expect(verdict.approvedIntent).toBe("THINKING");
  });

  it("5. Intent Decay: Transient intent expires and returns to baseline IDLE", async () => {
    const intentEngine = new OverseerIntentEngine();

    intentEngine.pushIntent("SUCCESS", {
      priority: "HIGH_MISSION",
      cause: "Task completed",
      durationMs: 50,
    });

    expect(intentEngine.getCurrentIntent()).toBeDefined();

    // Wait for duration to elapse
    await new Promise((r) => setTimeout(r, 60));

    const effective = intentEngine.resolveEffectiveIntent({
      affect: {
        valence: 0.3,
        arousal: 0.1,
        confidence: 0.9,
        uncertainty: 0.1,
        curiosity: 0.1,
        urgency: 0.0,
        satisfaction: 0.6,
        concern: 0.0,
        frustration: 0.0,
      },
    });

    expect(effective).toBe("IDLE");
  });

  it("6. Consciousness Inquiry Transparency: Returns truthful non-biological statement", () => {
    const statement = OverseerPresencePolicy.getConsciousnessStatement();
    expect(statement).toContain("biological consciousness");
    expect(statement).toContain("computational");
  });
});
