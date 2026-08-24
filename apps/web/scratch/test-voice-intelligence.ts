import { ElevenLabsAdapter, EdgeAdapter } from "../lib/voice/providers/adapters";
import { NarrationRole } from "../lib/voice/narration-role";

console.log("=======================================================");
console.log("  TESTING GENDER AND ACCENT MAPPING ADAPTERS         ");
console.log("=======================================================");

function runTests() {
  console.log("Test 1: Resolving Edge female voice (should be en-US-JennyNeural)...");
  const edgeFemaleMatch = EdgeAdapter.match(NarrationRole.INTRO);
  console.log(`Matched: ${edgeFemaleMatch.voiceId}`);
  if (edgeFemaleMatch.voiceId !== "en-US-JennyNeural") {
    console.error("❌ Test 1 Failed: Expected en-US-JennyNeural");
    process.exit(1);
  }
  console.log("✅ Test 1 Passed.");

  console.log("\nTest 2: Resolving Edge male voice (should be en-US-SteffanNeural)...");
  const edgeMaleMatch = EdgeAdapter.match(NarrationRole.MAIN);
  console.log(`Matched: ${edgeMaleMatch.voiceId}`);
  if (edgeMaleMatch.voiceId !== "en-US-SteffanNeural") {
    console.error("❌ Test 2 Failed: Expected en-US-SteffanNeural");
    process.exit(1);
  }
  console.log("✅ Test 2 Passed.");

  console.log("\nTest 3: Resolving ElevenLabs female voice (should be EXAVITQu4vr4xnSDxMaL)...");
  const elFemaleMatch = ElevenLabsAdapter.match(NarrationRole.INTRO);
  console.log(`Matched: ${elFemaleMatch.voiceId}`);
  if (elFemaleMatch.voiceId !== "EXAVITQu4vr4xnSDxMaL") {
    console.error("❌ Test 3 Failed: Expected EXAVITQu4vr4xnSDxMaL (Bella)");
    process.exit(1);
  }
  console.log("✅ Test 3 Passed.");

  console.log("\nTest 4: Resolving ElevenLabs male voice (should be ErXwobaYiN019PkySvjV)...");
  const elMaleMatch = ElevenLabsAdapter.match(NarrationRole.MAIN);
  console.log(`Matched: ${elMaleMatch.voiceId}`);
  if (elMaleMatch.voiceId !== "ErXwobaYiN019PkySvjV") {
    console.error("❌ Test 4 Failed: Expected ErXwobaYiN019PkySvjV (Antoni)");
    process.exit(1);
  }
  console.log("✅ Test 4 Passed.");

  console.log("\n=======================================================");
  console.log("  🎉 SPLIT GENDER AND ACCENT MAPPING TESTS PASSED!    ");
  console.log("=======================================================");
}

runTests();
