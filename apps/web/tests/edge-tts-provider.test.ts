import { describe, it, expect } from "vitest";
import { EdgeProvider } from "../lib/voice/providers/edge";

describe("EdgeProvider Worker-Delegated TTS", () => {
  it("A. edge provider health is immediately online with zero network latency", async () => {
    const provider = new EdgeProvider();
    const health = await provider.health();
    expect(health.online).toBe(true);
    expect(health.latencyMs).toBeLessThanOrEqual(10);
    expect(health.error).toBeUndefined();
  });

  it("B. edge synthesis produces valid WAV audio buffer for pipeline orchestration", async () => {
    const provider = new EdgeProvider();
    const buffer = await provider.synthesize("Welcome to ShortForge trivia quiz game", {
      voiceId: "en-US-GuyNeural"
    });

    expect(buffer).toBeDefined();
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(44);
    // Check RIFF and WAVE magic headers
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(buffer.subarray(8, 12).toString("ascii")).toBe("WAVE");
  });

  it("C. invalid voiceId is rejected before synthesis attempt", async () => {
    const provider = new EdgeProvider();
    await expect(
      provider.synthesize("Invalid voice test", { voiceId: "fr-FR-HenriNeural" })
    ).rejects.toThrow('Rejected voiceId "fr-FR-HenriNeural". Voice must start with "en-US-".');
  });

  it("D. empty text throws a clear error", async () => {
    const provider = new EdgeProvider();
    await expect(
      provider.synthesize("   ", { voiceId: "en-US-JennyNeural" })
    ).rejects.toThrow("Cannot synthesize empty narration text.");
  });
});
