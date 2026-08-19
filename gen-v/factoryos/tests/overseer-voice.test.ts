import { describe, it, expect } from "vitest";
import { OverseerVoiceController } from "../core/overseer/presence";

describe("FactoryOS Frontier v2 — Overseer Voice & Multimodal Suite", () => {
  it("1. Turn Taking Lifecycle: Transitions from IDLE -> LISTENING -> PROCESSING -> SPEAKING -> IDLE", () => {
    const controller = new OverseerVoiceController();
    expect(controller.getVoiceState()).toBe("IDLE");

    controller.startListening();
    expect(controller.getVoiceState()).toBe("LISTENING");

    const utterance = controller.finishListening("Inspect Floor 03");
    expect(controller.getVoiceState()).toBe("PROCESSING");
    expect(utterance?.text).toBe("Inspect Floor 03");

    controller.startSpeaking("Floor 03 is operating normally.");
    expect(controller.getVoiceState()).toBe("SPEAKING");
    expect(controller.getSpeechAmplitude()).toBeGreaterThan(0);

    controller.finishSpeaking();
    expect(controller.getVoiceState()).toBe("IDLE");
    expect(controller.getSpeechAmplitude()).toBe(0);
  });

  it("2. Barge-in Cancellation: User speech interrupts active Overseer speech immediately", () => {
    const controller = new OverseerVoiceController();
    controller.startSpeaking("Long explanation in progress...");
    expect(controller.getVoiceState()).toBe("SPEAKING");

    // Barge-in: user begins speaking
    controller.startListening();
    expect(controller.getVoiceState()).toBe("LISTENING");
  });

  it("3. Mute Handling: Cancels active speech and locks voiceState to MUTED", () => {
    const controller = new OverseerVoiceController();
    controller.startSpeaking("Speaking audio...");

    controller.setMuted(true);
    expect(controller.getVoiceState()).toBe("MUTED");
  });
});
