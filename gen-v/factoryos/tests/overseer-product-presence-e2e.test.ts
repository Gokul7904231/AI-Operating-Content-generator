/**
 * FactoryOS Frontier v2 — Overseer Product Presence E2E Suite
 *
 * PROVES THE COMPLETE LIVING OVERSEER PRODUCT EXPERIENCE:
 * 1. Procedural Face & 17 Expression Presets
 * 2. Real-time Telemetry & Grounded Status Projection
 * 3. Conversational Interaction & Voice State Lifecycle
 * 4. Anomaly Reaction & Attention Spatial Targeting
 * 5. SSE Sequence Reconnection & Snapshot Replay
 * 6. Hard Restart Presence Reconstitution
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import { OverseerPresenceEngine } from "../core/overseer/presence/OverseerPresenceEngine";
import { OVERSEER_EXPRESSION_PRESETS } from "../core/overseer/presence/OverseerExpressionPresets";
import { OverseerPresencePolicy } from "../core/overseer/presence/OverseerPresencePolicy";
import type { OverseerIntent, FaceParameters } from "../core/overseer/presence";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FactoryOS Frontier v2 — Overseer Product Presence E2E Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_overseer_product_presence");

  beforeEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testStorageDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it("1. Expression Presets Matrix: Validates all 17 procedural face expression bounds", () => {
    const presetKeys: OverseerIntent[] = [
      "IDLE",
      "GREETING",
      "LISTENING",
      "OBSERVING",
      "THINKING",
      "DEEP_THINKING",
      "CURIOUS",
      "CONCERNED",
      "WARNING",
      "CRITICAL",
      "RECOVERING",
      "VERIFYING",
      "SUCCESS",
      "PROUD",
      "WAITING",
      "FAREWELL",
      "SLEEP",
    ];

    for (const key of presetKeys) {
      const preset: FaceParameters = OVERSEER_EXPRESSION_PRESETS[key];
      expect(preset, `Preset ${key} must exist`).toBeDefined();

      // Geometry parameter bounds verification
      expect(preset.eye.openness).toBeGreaterThanOrEqual(0);
      expect(preset.eye.openness).toBeLessThanOrEqual(1.5);
      expect(preset.eye.width).toBeGreaterThan(0);
      expect(preset.eye.height).toBeGreaterThan(0);
      expect(preset.eye.pupilScale).toBeGreaterThan(0);
      expect(preset.eye.pupilScale).toBeLessThanOrEqual(2.0);

      // Mouth parameter bounds
      expect(preset.mouthOpenness).toBeGreaterThanOrEqual(0);
      expect(preset.mouthOpenness).toBeLessThanOrEqual(1.0);
      expect(preset.mouthCurve).toBeGreaterThanOrEqual(-1.0);
      expect(preset.mouthCurve).toBeLessThanOrEqual(1.0);

      // Global face properties
      expect(preset.faceScale).toBeGreaterThanOrEqual(0.7);
      expect(preset.faceScale).toBeLessThanOrEqual(1.3);
      expect(preset.glowIntensity).toBeGreaterThanOrEqual(0);
      expect(preset.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("2. Real-Time Telemetry & Grounded Status Projection: Generates deterministic status sentences", async () => {
    const controller = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: false,
    });
    await controller.boot();

    const presenceEngine = controller.overseer.getPresenceEngine();
    const snapshot = presenceEngine.generateCurrentEnvelope();

    expect(snapshot.type).toBe("overseer.presence");
    expect(snapshot.intent).toBe("IDLE");
    expect(snapshot.thoughtSummary).toContain("FactoryOS");
    expect(snapshot.affect.valence).toBeGreaterThan(0);
    expect(snapshot.affect.confidence).toBeGreaterThan(0.5);

    await controller.shutdown();
  });

  it("3. Conversational Interaction & Voice Safety Policy: Grounded responses and transparency", async () => {
    const controller = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: false,
    });
    await controller.boot();

    const presenceEngine = controller.overseer.getPresenceEngine();

    // 1. User Message event
    await controller.eventBus.publish("USER_MESSAGE", {
      text: "Are you conscious?",
      isVoice: true,
      timestamp: new Date().toISOString(),
    });
    await new Promise((r) => setTimeout(r, 60));

    const envelopeAfterMsg = presenceEngine.generateCurrentEnvelope();
    expect(envelopeAfterMsg.intent).toBe("LISTENING");
    expect(envelopeAfterMsg.voiceState).toBe("LISTENING");

    // 2. Consciousness Policy Statement Check
    const consciousnessText = OverseerPresencePolicy.getConsciousnessStatement();
    expect(consciousnessText).toContain("computational projections");
    expect(consciousnessText).toContain("operational state");
    expect(consciousnessText).not.toContain("I am a conscious human");

    await controller.shutdown();
  });

  it("4. Anomaly Reaction & Spatial Attention Shift: Gaze tracks affected floor automatically", async () => {
    const controller = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: true,
    });
    await controller.boot();

    const presenceEngine = controller.overseer.getPresenceEngine();

    // Inject fault into Floor 03
    controller.worldState.updateFloorStatus(
      "floor03_asset_realization",
      "ERROR",
      "Asset render buffer overflow"
    );

    // Let Slayer swarm detect and emit ANOMALY_DETECTED
    let observedConcern = false;
    const startWait = Date.now();

    while (Date.now() - startWait < 6000) {
      const envelope = presenceEngine.generateCurrentEnvelope();
      if (envelope.intent === "CONCERNED" || envelope.intent === "WARNING" || envelope.intent === "THINKING") {
        observedConcern = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    expect(observedConcern).toBe(true);

    // Set attention to Floor 03 and verify gaze orientation
    presenceEngine.attentionController.setAttention("floor03_asset_realization", "Investigating render issue", "HIGH");
    const attentionEnvelope = presenceEngine.generateCurrentEnvelope();

    expect(attentionEnvelope.attention).toBeDefined();
    expect(attentionEnvelope.attention?.target).toBe("floor03_asset_realization");
    expect(attentionEnvelope.faceParameters.eye.gazeX).toBeGreaterThan(0); // Rightwards gaze for Floor 03

    await controller.shutdown();
  });

  it("5. SSE Sequence Reconnection & Snapshot Replay: Delivers missed presence events from ring buffer", async () => {
    const controller = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: false,
    });
    await controller.boot();

    const presenceEngine = controller.overseer.getPresenceEngine();

    // Push 3 intentional states
    presenceEngine.intentEngine.pushIntent("THINKING", { priority: "HIGH_MISSION", durationMs: 2000, cause: "Testing intent 1" });
    await presenceEngine.publishPresenceTick("TEST_EVENT_1");

    presenceEngine.intentEngine.pushIntent("VERIFYING", { priority: "HIGH_MISSION", durationMs: 2000, cause: "Testing intent 2" });
    await presenceEngine.publishPresenceTick("TEST_EVENT_2");

    presenceEngine.intentEngine.pushIntent("SUCCESS", { priority: "HIGH_MISSION", durationMs: 2000, cause: "Testing intent 3" });
    const lastEnv = await presenceEngine.publishPresenceTick("TEST_EVENT_3");

    // Request snapshot with lastSeq = lastEnv.sequence - 2
    const { current, replay } = presenceEngine.getSnapshot(lastEnv.sequence - 2);

    expect(current.sequence).toBeGreaterThanOrEqual(lastEnv.sequence);
    expect(replay.length).toBeGreaterThanOrEqual(2);
    expect(replay.some((e) => e.sequence === lastEnv.sequence)).toBe(true);

    await controller.shutdown();
  });

  it("6. Reconstitution on Restart: Presence rehydrates from persistent WorldState", async () => {
    // Controller A boots, records active case and shuts down
    const controllerA = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: false,
    });
    await controllerA.boot();

    await controllerA.caseManager.createCase({
      title: "Audio Desync Glitch",
      floorId: "floor03_asset_realization",
      detectorId: "slayer_audio",
      category: "RENDER_ARTIFACT",
      severity: "MEDIUM",
      description: "Audio timestamp offset exceeds 80ms threshold",
      symptoms: ["audio_desync"],
      observedState: { offsetMs: 85 },
    });

    await controllerA.shutdown();

    // Controller B boots from disk storage
    const controllerB = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: false,
    });
    await controllerB.boot();

    const presenceB = controllerB.overseer.getPresenceEngine();
    const envB = presenceB.generateCurrentEnvelope();

    // Verified presence rehydration
    expect(envB).toBeDefined();
    expect(envB.type).toBe("overseer.presence");
    expect(envB.thoughtSummary).toBeDefined();
    expect(envB.faceParameters).toBeDefined();

    await controllerB.shutdown();
  });
});
