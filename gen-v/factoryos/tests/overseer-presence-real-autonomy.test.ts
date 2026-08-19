import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import * as fs from "node:fs";
import * as path from "node:path";

describe("FactoryOS Frontier v2 — True Real Autonomous Presence Closed-Loop E2E", () => {
  const testStoragePath = path.join(process.cwd(), "data", "test_presence_autonomy_runtime");
  let controller: AutonomousFactoryController;

  beforeEach(async () => {
    if (fs.existsSync(testStoragePath)) {
      fs.rmSync(testStoragePath, { recursive: true, force: true });
    }

    controller = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStoragePath,
      patrolIntervalMs: 1000,
      supervisorIntervalMs: 1000,
      watchdogIntervalMs: 2000,
      autoStartSwarm: true,
    });

    await controller.boot();
  });

  afterEach(async () => {
    if (controller) {
      await controller.shutdown();
    }
    if (fs.existsSync(testStoragePath)) {
      fs.rmSync(testStoragePath, { recursive: true, force: true });
    }
  });

  it("Full Autonomous Chain: Real Factory Event -> Overseer Reasoning -> Affect/Intent -> Attention -> Face -> Resolution -> Restored Presence", async () => {
    const overseer = controller.overseer;
    const presenceEngine = overseer.getPresenceEngine();

    // 1. Initial State: Nominal Idle Presence
    const initialEnv = presenceEngine.generateCurrentEnvelope();
    expect(initialEnv.type).toBe("overseer.presence");
    expect(initialEnv.intent).toBe("IDLE");
    expect(initialEnv.faceParameters.accentColor).toBe("#0A84FF"); // Darker FactoryOS Primary Blue

    // 2. User Interaction: Listening & Answering
    await controller.eventBus.publish("USER_MESSAGE", {
      text: "How is Floor 03 performing?",
      isVoice: false,
    });

    const userEnv = presenceEngine.generateCurrentEnvelope();
    expect(userEnv.intent).toBe("LISTENING");
    expect(userEnv.attention?.target).toBe("user");

    // 3. Slayer Anomaly Detection: Floor 03 Anomaly
    await controller.eventBus.publish("ANOMALY_DETECTED", {
      floorId: "floor03_asset_realization",
      severity: "CRITICAL",
      description: "GPU pipeline buffer bottleneck detected",
    });

    const anomalyEnv = presenceEngine.generateCurrentEnvelope();
    expect(anomalyEnv.intent).toBe("CRITICAL");
    expect(anomalyEnv.faceParameters.accentColor).toBe("#EF4444"); // Crimson Alert
    expect(anomalyEnv.attention?.target).toBe("floor03_asset_realization");
    expect(anomalyEnv.affect.concern).toBeGreaterThan(0.7);

    // 4. Healer Dispatched: Recovery State
    await controller.eventBus.publish("HEALER_DISPATCHED", {
      caseId: "case_render_fix_001",
      floorId: "floor03_asset_realization",
      healerName: "GPUBufferHealer",
    });

    const healingEnv = presenceEngine.generateCurrentEnvelope();
    expect(healingEnv.intent).toBe("RECOVERING");
    expect(healingEnv.faceParameters.accentColor).toBe("#0284C7"); // Restorative Cyan/Blue

    // 5. Validator Passed & Case Resolved: Success Transition
    await controller.eventBus.publish("CASE_RESOLVED", {
      caseId: "case_render_fix_001",
      floorId: "floor03_asset_realization",
      status: "RESOLVED",
    });

    const successEnv = presenceEngine.generateCurrentEnvelope();
    expect(successEnv.intent).toBe("SUCCESS");
    expect(successEnv.faceParameters.accentColor).toBe("#10B981"); // Restrained Emerald

    // 6. Truth Gate Invariant: Inability to show triumph if validator fails
    const fakeTriumphBlocked = presenceEngine.intentEngine.resolveEffectiveIntent({
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
      isValidatorPassed: false, // Validator failed
    });
    expect(fakeTriumphBlocked).not.toBe("SUCCESS");

    // 7. Process Restart & Reconstruction from WorldState
    await controller.stop();

    const restartedController = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStoragePath,
      patrolIntervalMs: 1000,
      supervisorIntervalMs: 1000,
      watchdogIntervalMs: 2000,
      autoStartSwarm: true,
    });

    await restartedController.boot();
    const restoredPresence = restartedController.overseer.getPresenceEngine().generateCurrentEnvelope();

    // Reconstructed cleanly without stale frame coordinates
    expect(restoredPresence.type).toBe("overseer.presence");
    expect(restoredPresence.intent).toBeDefined();
    expect(restoredPresence.faceParameters.accentColor).toBeDefined();

    await restartedController.shutdown();
  });
});
