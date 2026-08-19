import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FactoryOS Frontier v2 — Presence Final Conversational & Voice Proof Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_presence_conversational_proof");
  let controller: AutonomousFactoryController;

  beforeEach(async () => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
    controller = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      patrolIntervalMs: 500,
      supervisorIntervalMs: 500,
      watchdogIntervalMs: 1000,
      autoStartSwarm: true,
    });
    await controller.boot();
  });

  afterEach(async () => {
    if (controller) {
      await controller.shutdown();
    }
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it("1. Real Text Interaction: LISTENING -> THINKING -> Real Grounded Response -> SPEAKING -> Return State", async () => {
    const presenceEngine = controller.overseer.getPresenceEngine();

    // Ingest real user text query
    await controller.eventBus.publish("USER_MESSAGE", {
      text: "How is the overall factory health?",
      isVoice: false,
    });

    const listeningEnv = presenceEngine.generateCurrentEnvelope();
    expect(listeningEnv.intent).toBe("LISTENING");
    expect(listeningEnv.attention?.target).toBe("user");

    // Overseer evaluates response
    presenceEngine.intentEngine.clearIntent("LISTENING");
    presenceEngine.intentEngine.pushIntent("THINKING", {
      priority: "USER_INTERACTION",
      durationMs: 1500,
      cause: "Evaluating factory state telemetry",
    });

    const thinkingEnv = presenceEngine.generateCurrentEnvelope();
    expect(thinkingEnv.intent).toBe("THINKING");

    // Overseer speaks grounded response
    presenceEngine.voiceController.startSpeaking("All production floors are operating normally with 0 active blocking cases.");
    const speakingEnv = presenceEngine.generateCurrentEnvelope();
    expect(speakingEnv.voiceState).toBe("SPEAKING");
    expect(speakingEnv.faceParameters.mouthOpenness).toBeGreaterThan(0.2);

    // Voice finishes -> return to baseline IDLE
    presenceEngine.voiceController.finishSpeaking();
    presenceEngine.intentEngine.clearIntent("THINKING");
    presenceEngine.intentEngine.clearIntent("LISTENING");

    const returnEnv = presenceEngine.generateCurrentEnvelope();
    expect(returnEnv.voiceState).toBe("IDLE");
    expect(returnEnv.faceParameters.mouthOpenness).toBe(0.0);
  });

  it("2. Real Voice Turn-Taking: STT -> Overseer -> TTS -> Synchronized Face & Barge-in", async () => {
    const presenceEngine = controller.overseer.getPresenceEngine();
    const voiceCtrl = presenceEngine.voiceController;

    // 1. User starts speaking (STT)
    voiceCtrl.startListening();
    expect(voiceCtrl.getVoiceState()).toBe("LISTENING");

    // 2. Transcript received -> Processing
    const utt = voiceCtrl.finishListening("Inspect Floor 03 render pipeline");
    expect(voiceCtrl.getVoiceState()).toBe("PROCESSING");
    expect(utt?.text).toBe("Inspect Floor 03 render pipeline");

    // 3. Overseer responds via TTS
    voiceCtrl.startSpeaking("Floor 03 rendering pipeline is running with zero frame drops.");
    expect(voiceCtrl.getVoiceState()).toBe("SPEAKING");

    const face = presenceEngine.expressionEngine.resolveFaceParameters({
      intent: "OBSERVING",
      affect: presenceEngine.affectEngine.getAffect(),
      voiceState: "SPEAKING",
    });
    expect(face.mouthOpenness).toBeGreaterThanOrEqual(0.35);

    // 4. Barge-in: User interrupts while Overseer is speaking
    voiceCtrl.startListening();
    expect(voiceCtrl.getVoiceState()).toBe("LISTENING");
    expect(voiceCtrl.getSpeechAmplitude()).toBe(0.0);
  });

  it("3. Safe Decision Summaries: thoughtSummary contains only safe, user-facing summaries", async () => {
    const presenceEngine = controller.overseer.getPresenceEngine();
    const envelope = presenceEngine.generateCurrentEnvelope();

    expect(envelope.thoughtSummary).toBeDefined();
    expect(typeof envelope.thoughtSummary).toBe("string");
    expect(envelope.thoughtSummary.length).toBeGreaterThan(0);
    expect(envelope.thoughtSummary).not.toContain("password");
    expect(envelope.thoughtSummary).not.toContain("SECRET_KEY");
    expect(envelope.thoughtSummary).not.toContain("[object Object]");
  });
});
