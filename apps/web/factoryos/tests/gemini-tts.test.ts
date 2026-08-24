import { describe, it, expect } from "vitest";
import { GeminiTTSProvider } from "../core/voice/GeminiTTSProvider";

describe("FactoryOS — Gemini 3.1 Flash TTS Live Voice Suite", () => {
  it("01: Configures Gemini 3.1 Flash TTS as the preferred model", () => {
    expect(GeminiTTSProvider.PREFERRED_MODEL).toBe("gemini-3.1-flash-tts-preview");
  });

  it("02: Provides official Gemini steerable voice personalities", () => {
    const voices = GeminiTTSProvider.getAvailableVoices();
    expect(voices.length).toBeGreaterThanOrEqual(5);
    expect(voices.map(v => v.id)).toContain("Puck");
    expect(voices.map(v => v.id)).toContain("Charon");
    expect(voices.map(v => v.id)).toContain("Aoede");
  });

  it("03: Truthfully reports VOICE_GENERATION_UNAVAILABLE when API key is unconfigured", async () => {
    const provider = new GeminiTTSProvider("", "https://generativelanguage.googleapis.com");
    await expect(
      provider.synthesizeSpeech({ transcript: "Testing live audio generation." })
    ).rejects.toThrow("VOICE_GENERATION_UNAVAILABLE");
  });
});
