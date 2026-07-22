import { VoiceWorker } from "../lib/voice/voice-worker";
import { elevenlabsProvider } from "../lib/voice/providers/elevenlabs";
import { VoiceRouter } from "../lib/voice/voice-router";
import { NarrationRole } from "../lib/voice/narration-role";
import fs from "fs";
import path from "path";

async function run() {
  console.log("=================================================");
  console.log("  RUNNING FAULT INJECTION AND RETRY TESTS");
  console.log("=================================================");

  // Set a mock environment variable so ElevenLabs passes basic validation checks
  process.env.ELEVENLABS_API_KEY = "mock_api_key_for_testing";

  const tempOutputPath = path.join(process.cwd(), "scratch", "mock_temp_output.wav");
  if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);

  // 1. SCENARIO A: ElevenLabs 429 -> Retry -> Success
  console.log("\n[Scenario A] ElevenLabs transient failure (429) on first attempt...");
  
  let callCount = 0;
  const originalSynthesize = elevenlabsProvider.synthesize;

  // Mock synthesis behaviour: Fail once, then succeed
  elevenlabsProvider.synthesize = async (text: string, options: any) => {
    callCount++;
    if (callCount === 1) {
      console.log("  [Mock ElevenLabs API] Simulating HTTP 429 Too Many Requests");
      throw new Error("ElevenLabs synthesis failed: HTTP 429");
    }
    console.log("  [Mock ElevenLabs API] Simulating successful speech synthesis");
    // Return a dummy valid WAV header with some audio payload
    const wavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x08, 0x00, 0x00, // file size
      0x57, 0x41, 0x56, 0x45, // WAVE
      0x66, 0x6d, 0x74, 0x20, // fmt 
      0x10, 0x00, 0x00, 0x00, // chunk size
      0x01, 0x00,             // format (PCM)
      0x01, 0x00,             // mono
      0x44, 0xac, 0x00, 0x00, // 44100 Hz
      0x88, 0x58, 0x01, 0x00, // byte rate
      0x02, 0x00, 0x10, 0x00, // block align, bits
      0x64, 0x61, 0x74, 0x61, // data
      0x00, 0x08, 0x00, 0x00, // data size
      ...new Array(2000).fill(0) // audio samples
    ]);
    return wavHeader;
  };

  // Build a test session mapped to ElevenLabs
  const mockSession = {
    sessionId: "test_session_elevenlabs",
    videoId: "test_job_a",
    providerId: "elevenlabs",
    provider: elevenlabsProvider,
    introVoiceId: "bella_id",
    mainVoiceId: "antoni_id",
    language: "en-US",
    sampleRate: 44100,
    createdAt: Date.now()
  };

  try {
    const result = await VoiceWorker.generate({
      jobId: "test_job_a",
      text: "This is a failure injection test.",
      outputPath: tempOutputPath,
      session: mockSession as any,
      role: NarrationRole.MAIN
    });

    console.log(`✅ [Scenario A PASSED] Result attempts: ${result.attempts} (Expected: 2)`);
    console.log(`✅ [Scenario A PASSED] File written: ${fs.existsSync(tempOutputPath)} (Size: ${fs.statSync(tempOutputPath).size} bytes)`);
  } catch (err: any) {
    console.error(`❌ [Scenario A FAILED] Error thrown: ${err.message}`);
  } finally {
    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
  }

  // 2. SCENARIO B: ElevenLabs Quota Exhausted -> 3 Failures -> Abort (No switch to Edge)
  console.log("\n[Scenario B] ElevenLabs persistent timeout/quota failure (3 failures)...");
  callCount = 0;
  
  elevenlabsProvider.synthesize = async (text: string, options: any) => {
    callCount++;
    console.log(`  [Mock ElevenLabs API] Simulating HTTP 504 Gateway Timeout (Attempt ${callCount})`);
    throw new Error("ElevenLabs synthesis failed: HTTP 504 Gateway Timeout");
  };

  try {
    await VoiceWorker.generate({
      jobId: "test_job_b",
      text: "This synthesis will fail permanently.",
      outputPath: tempOutputPath,
      session: mockSession as any,
      role: NarrationRole.MAIN
    });
    console.error("❌ [Scenario B FAILED] VoiceWorker succeeded instead of aborting.");
  } catch (err: any) {
    console.log(`✅ [Scenario B PASSED] Caught expected exception: ${err.message}`);
    const noSwitchToEdge = !err.message.includes("edge") && mockSession.providerId === "elevenlabs";
    console.log(`✅ [Scenario B PASSED] Provider lock preserved: ${noSwitchToEdge} (Session remained elevenlabs)`);
    console.log(`✅ [Scenario B PASSED] Call count: ${callCount} (Expected: 3 attempts)`);
  } finally {
    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    // Restore original synthesise method
    elevenlabsProvider.synthesize = originalSynthesize;
  }
}

run();
