import { NarrationRole } from "./narration-role";
import { supertonicProvider } from "./providers/supertonic";
import { edgeProvider } from "./providers/edge";
import { elevenlabsProvider } from "./providers/elevenlabs";
import { VoiceProvider } from "./voice-provider";
import { NarrationSession } from "./narration-session";
import fs from "fs";
import path from "path";

// Curated pools of English voices
const EDGE_FEMALE_POOL = ["en-US-JennyNeural", "en-US-AvaNeural", "en-US-EmmaNeural", "en-US-MichelleNeural"];
const EDGE_MALE_POOL = ["en-US-SteffanNeural", "en-US-GuyNeural", "en-US-AndrewNeural", "en-US-BrianNeural"];

const ELEVENLABS_FEMALE_POOL = ["EXAVITQu4vr4xnSDxMaL", "21m00Tcm4TlvDq8ikWAM", "AZnzlk1XfhEZadHRtiBm"];
const ELEVENLABS_MALE_POOL = ["ErXwobaYiN019PkySvjV", "VR6A4mx77DcvNgNZugvj", "N2lVS1w19Cg96YJ8a653"];

const SUPERTONIC_FEMALE_POOL = ["warm_female", "expressive_female"];
const SUPERTONIC_MALE_POOL = ["calm_male", "deep_male"];

export class VoiceRouterClass {
  private providers = new Map<string, VoiceProvider>();
  private lastPairFile = path.resolve(process.cwd(), "data", "last-voice-pair.json");

  constructor() {
    this.providers.set("supertonic", supertonicProvider);
    this.providers.set("edge", edgeProvider);
    this.providers.set("elevenlabs", elevenlabsProvider);
  }

  getProvider(id: string): VoiceProvider | null {
    return this.providers.get(id) || null;
  }

  /**
   * Creates and freezes an immutable NarrationSession for the video job.
   * Locks the provider, performs test synthesis, and selects a random non-consecutive voice pair.
   */
  async createSession(videoId: string, requestedProviderId?: string): Promise<Readonly<NarrationSession>> {
    const providerId = requestedProviderId || process.env.DEFAULT_VOICE_PROVIDER || "edge";
    const provider = this.getProvider(providerId);
    if (!provider) {
      console.error(
        `[VoiceRouter] Unknown voice provider requested:`,
        JSON.stringify({
          jobId: videoId,
          providerId,
          operation: "get_provider",
          error: "Unknown voice provider"
        })
      );
      throw new Error(`[VoiceRouter] Unknown voice provider: ${providerId}`);
    }

    // Health check
    console.log(`[VoiceRouter] Performing health check on provider "${providerId}"...`);
    const check = await provider.health();
    if (!check.online) {
      console.error(
        `[VoiceRouter] Provider health check failed:`,
        JSON.stringify({
          jobId: videoId,
          providerId,
          operation: "health_check",
          error: check.error || "Provider offline"
        })
      );
      throw new Error(`[VoiceRouter] Locked provider "${providerId}" is OFFLINE. Health error: ${check.error}`);
    }

    // Load last voice pair
    let lastPair: { intro: string; main: string } | undefined = undefined;
    if (fs.existsSync(this.lastPairFile)) {
      try {
        lastPair = JSON.parse(fs.readFileSync(this.lastPairFile, "utf8"));
      } catch {}
    }

    // Select random pair excluding last pair
    let introVoiceId = "";
    let mainVoiceId = "";
    let modelId: string | undefined = undefined;

    let introPool: string[] = [];
    let mainPool: string[] = [];

    if (providerId === "elevenlabs") {
      introPool = ELEVENLABS_FEMALE_POOL;
      mainPool = ELEVENLABS_MALE_POOL;
      modelId = "eleven_multilingual_v2";
    } else if (providerId === "supertonic") {
      introPool = SUPERTONIC_FEMALE_POOL;
      mainPool = SUPERTONIC_MALE_POOL;
      modelId = "supertonic-tts-v3";
    } else {
      introPool = EDGE_FEMALE_POOL;
      mainPool = EDGE_MALE_POOL;
    }

    const candidates: Array<{ intro: string; main: string }> = [];
    for (const intro of introPool) {
      for (const main of mainPool) {
        if (lastPair && intro === lastPair.intro && main === lastPair.main) {
          continue;
        }
        candidates.push({ intro, main });
      }
    }

    if (candidates.length === 0) {
      candidates.push({ intro: introPool[0], main: mainPool[0] });
    }

    const selectedPair = candidates[Math.floor(Math.random() * candidates.length)];
    introVoiceId = selectedPair.intro;
    mainVoiceId = selectedPair.main;

    // Save selection for future anti-consecutiveness checks
    try {
      const dataDir = path.dirname(this.lastPairFile);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(this.lastPairFile, JSON.stringify(selectedPair), "utf8");
    } catch {}

    // Tiny test synthesis check
    try {
      console.log(`[VoiceRouter] Running test synthesis on "${providerId}" using voice "${introVoiceId}"...`);
      const testBuffer = await provider.synthesize("test", {
        voiceId: introVoiceId,
        language: "en-US"
      });
      if (!testBuffer || testBuffer.length === 0) {
        throw new Error("Empty audio buffer returned.");
      }
      console.log(`[VoiceRouter] Test synthesis passed successfully.`);
    } catch (err: any) {
      console.error(
        `[VoiceRouter] Provider test synthesis failed:`,
        JSON.stringify({
          jobId: videoId,
          providerId,
          operation: "test_synthesis",
          error: err?.message || String(err)
        })
      );
      throw new Error(`[VoiceRouter] Test synthesis failed for provider "${providerId}": ${err.message}`);
    }

    const session: NarrationSession = {
      sessionId: `session_${providerId}_${Date.now()}`,
      videoId,
      providerId,
      provider,
      introVoiceId,
      mainVoiceId,
      language: "en-US",
      sampleRate: 44100,
      modelId,
      createdAt: Date.now()
    };

    // Deep freeze
    Object.freeze(session.provider);
    Object.freeze(session);

    console.log(`[VoiceRouter] Created locked immutable session for video "${videoId}": provider=${providerId}, intro=${introVoiceId}, main=${mainVoiceId}`);
    return session;
  }
}

export const VoiceRouter = new VoiceRouterClass();
