import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @travisvn/edge-tts module
const mockListVoices = vi.fn();
const mockCommunicateStream = vi.fn();

vi.mock("@travisvn/edge-tts", () => {
  return {
    listVoices: () => mockListVoices(),
    Communicate: class {
      constructor(public text: string, public options: any) {}
      stream() {
        return mockCommunicateStream();
      }
    }
  };
});

// Mock child_process module to verify it is NEVER invoked
const mockExec = vi.fn();
const mockExecSync = vi.fn();

vi.mock("child_process", () => {
  return {
    exec: mockExec,
    execSync: mockExecSync
  };
});

import { EdgeProvider } from "../lib/voice/providers/edge";

describe("EdgeProvider Native Node.js TTS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A. edge provider health succeeds when native package returns voices", async () => {
    const provider = new EdgeProvider();
    mockListVoices.mockResolvedValueOnce([
      { Name: "en-US-GuyNeural", ShortName: "en-US-GuyNeural", Gender: "Male" }
    ]);

    const health = await provider.health();
    expect(health.online).toBe(true);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    expect(health.error).toBeUndefined();
  });

  it("B. edge provider health fails cleanly without throwing", async () => {
    const provider = new EdgeProvider();
    mockListVoices.mockRejectedValueOnce(new Error("Network connection refused"));

    const health = await provider.health();
    expect(health.online).toBe(false);
    expect(health.error).toContain("Network connection refused");
  });

  it("C. edge synthesis succeeds and returns valid audio buffer", async () => {
    const provider = new EdgeProvider();
    const fakeAudioChunk = Buffer.from([0xff, 0xfb, 0x90, 0x64]);

    mockCommunicateStream.mockImplementationOnce(async function* () {
      yield { type: "audio", data: fakeAudioChunk };
    });

    const buffer = await provider.synthesize("Welcome to ShortForge", {
      voiceId: "en-US-GuyNeural",
      speed: 1.1
    });

    expect(buffer).toBeDefined();
    expect(buffer.length).toBe(fakeAudioChunk.length);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  it("D. edge provider does NOT invoke child_process for health or synthesis", async () => {
    const provider = new EdgeProvider();
    mockListVoices.mockResolvedValueOnce([{ Name: "en-US-JennyNeural" }]);

    await provider.health();
    expect(mockExecSync).not.toHaveBeenCalled();
    expect(mockExec).not.toHaveBeenCalled();

    mockCommunicateStream.mockImplementationOnce(async function* () {
      yield { type: "audio", data: Buffer.from("audio-bytes") };
    });

    await provider.synthesize("Test narration", {
      voiceId: "en-US-JennyNeural"
    });

    expect(mockExecSync).not.toHaveBeenCalled();
    expect(mockExec).not.toHaveBeenCalled();
  });

  it("E. provider failure does not crash process and returns controlled error", async () => {
    const provider = new EdgeProvider();
    mockCommunicateStream.mockImplementationOnce(async function* () {
      throw new Error("WebSocket 403 Forbidden");
    });

    await expect(
      provider.synthesize("This will fail", { voiceId: "en-US-GuyNeural" })
    ).rejects.toThrow("[EdgeProvider] Synthesis failed: WebSocket 403 Forbidden");
  });

  it("F. invalid voiceId is rejected before synthesis attempt", async () => {
    const provider = new EdgeProvider();
    await expect(
      provider.synthesize("Invalid voice test", { voiceId: "fr-FR-HenriNeural" })
    ).rejects.toThrow('Rejected voiceId "fr-FR-HenriNeural". Voice must start with "en-US-".');
  });
});
