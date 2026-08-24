import { VoiceRouter } from "../lib/voice/voice-router";
import { VoiceCache } from "../lib/voice/voice-cache";
import { AudioPostProcessor } from "../lib/voice/audio-processor";
import { VoiceBenchmarkDB } from "../lib/voice/voice-benchmark";
import { VoiceDoctor } from "../lib/voice/voice-doctor";

async function main() {
  console.log("=== COMMENCING VOICE INTEL LAYER V2 INTEGRATION TEST ===");

  // 1. Run Doctor Diagnostics
  console.log("\n1. Running Voice Doctor Diagnostics...");
  const report = await VoiceDoctor.runDiagnostics();
  console.log("Diagnostics Report Summary:", JSON.stringify(report, null, 2));

  // 2. Perform Routing
  console.log("\n2. Routing VOICE_SHORTS capability...");
  const session = await VoiceRouter.createSession("test_job_1");
  console.log(`Routed to: Provider="${session.providerId}", VoiceId="${session.mainVoiceId}"`);

  // 3. Test Cache Write
  console.log("\n3. Testing Cache & Audio Post-Processing...");
  const testText = "Welcome to ShortFactory OS voice synthesis layer.";
  const sampleRate = 44100;
  
  const cacheHash = VoiceCache.getHash({
    text: testText,
    profileId: "energetic_male",
    providerId: session.providerId,
    modelId: session.modelId || "default",
    language: "en",
    sampleRate,
    emotion: "neutral",
    rendererVersion: "2.0",
    voiceVersion: "1.0"
  });

  console.log(`Generated cache hash: ${cacheHash}`);
  
  // Clean up old cached file if exists to verify write
  const cachePath = VoiceCache.getCachePath(cacheHash);
  console.log(`Cache path target: ${cachePath}`);

  // Test Direct Synthesis & Normalization
  console.log("\n4. Triggering test synthesis...");
  try {
    const rawAudio = await session.provider.synthesize(testText, {
      voiceId: session.mainVoiceId,
      modelId: session.modelId,
      language: "en",
      format: "wav",
      sampleRate
    });

    console.log(`Raw audio generated size: ${rawAudio.length} bytes.`);

    console.log("Applying AudioPostProcessor normalization & fade-in...");
    const processedAudio = AudioPostProcessor.processWav(rawAudio, {
      silenceThreshold: 0.015,
      fadeMs: 20
    });

    console.log(`Processed audio size: ${processedAudio.length} bytes.`);
    
    // Save to Cache
    VoiceCache.set(cacheHash, processedAudio);

    // Verify retrieval
    const retrieved = VoiceCache.get(cacheHash);
    if (retrieved && retrieved.length === processedAudio.length) {
      console.log("✓ Cache retrieval verified successfully.");
    } else {
      console.error("✗ Cache retrieval failed or size mismatch!");
    }
  } catch (err: any) {
    console.error("✗ Synthesis failed:", err.message);
  }

  // 5. Query Benchmarks
  console.log("\n5. Querying database benchmark records...");
  const edgeStats = VoiceBenchmarkDB.getAverages("edge");
  console.log("Edge TTS averages:", JSON.stringify(edgeStats, null, 2));

  console.log("\n=== INTEGRATION TEST COMPLETE ===");
}

main().catch(err => {
  console.error("Integration test failed:", err);
});
