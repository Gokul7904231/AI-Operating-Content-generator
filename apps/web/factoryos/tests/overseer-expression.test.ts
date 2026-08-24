import { describe, it, expect } from "vitest";
import {
  OverseerExpressionEngine,
  OverseerAnimationController,
  OVERSEER_EXPRESSION_PRESETS,
  type FaceParameters,
} from "../core/overseer/presence";

describe("FactoryOS Frontier v2 — Overseer Expression & Animation Suite", () => {
  const engine = new OverseerExpressionEngine();

  it("1. Expression Resolution: Resolves distinct geometry and colors for all operational intents", () => {
    const idleFace = engine.resolveFaceParameters({
      intent: "IDLE",
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

    const criticalFace = engine.resolveFaceParameters({
      intent: "CRITICAL",
      affect: {
        valence: -0.8,
        arousal: 0.9,
        confidence: 0.7,
        uncertainty: 0.3,
        curiosity: 0.1,
        urgency: 0.95,
        satisfaction: 0.0,
        concern: 1.0,
        frustration: 0.0,
      },
    });

    expect(idleFace.accentColor).toBe("#0A84FF"); // Darker FactoryOS Primary Blue
    expect(criticalFace.accentColor).toBe("#EF4444"); // Controlled Crimson Red
    expect(criticalFace.glowIntensity).toBeGreaterThan(idleFace.glowIntensity);
    expect(criticalFace.eye.eyebrowAngle).toBeLessThan(idleFace.eye.eyebrowAngle);
  });

  it("2. Attention Mapping: Maps attention target gaze coordinates directly to eye parameters", () => {
    const face = engine.resolveFaceParameters({
      intent: "OBSERVING",
      affect: {
        valence: 0.0,
        arousal: 0.3,
        confidence: 0.8,
        uncertainty: 0.2,
        curiosity: 0.4,
        urgency: 0.2,
        satisfaction: 0.5,
        concern: 0.2,
        frustration: 0.0,
      },
      attention: {
        target: "floor03_asset_realization",
        reason: "Checking render GPU buffer",
        priority: "HIGH",
        confidence: 0.9,
        gazeX: 0.5,
        gazeY: 0.4,
        startedAt: new Date().toISOString(),
        durationMs: 4000,
        expiresAt: new Date(Date.now() + 4000).toISOString(),
      },
    });

    expect(face.eye.gazeX).toBe(0.5);
    expect(face.eye.gazeY).toBe(0.4);
  });

  it("3. Voice State Synchronization: Expands mouth aperture when SPEAKING", () => {
    const silentFace = engine.resolveFaceParameters({
      intent: "IDLE",
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
      voiceState: "IDLE",
    });

    const speakingFace = engine.resolveFaceParameters({
      intent: "IDLE",
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
      voiceState: "SPEAKING",
    });

    expect(silentFace.mouthOpenness).toBe(0.0);
    expect(speakingFace.mouthOpenness).toBeGreaterThanOrEqual(0.35);
  });

  it("4. Blink Integration: Fully closes eyelid when blinkAmount is 1.0", () => {
    const blinkedFace = engine.resolveFaceParameters({
      intent: "IDLE",
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
      blinkAmount: 1.0,
    });

    expect(blinkedFace.eye.openness).toBe(0.0);
    expect(blinkedFace.eye.blinkAmount).toBe(1.0);
  });

  it("5. Spring Interpolation: Geometry changes smoothly over successive frames without teleportation", () => {
    const initial = OVERSEER_EXPRESSION_PRESETS.IDLE;
    const target = OVERSEER_EXPRESSION_PRESETS.CRITICAL;

    const animController = new OverseerAnimationController(initial);

    const frame1 = animController.stepToward(target, 1.0);
    expect(frame1.eye.openness).not.toBe(target.eye.openness);
    expect(frame1.eye.openness).not.toBe(initial.eye.openness);

    // After multiple iterations, approaches target closely
    let current: FaceParameters = frame1;
    for (let i = 0; i < 30; i++) {
      current = animController.stepToward(target, 1.0);
    }

    expect(Math.abs(current.eye.openness - target.eye.openness)).toBeLessThan(0.05);
  });
});
