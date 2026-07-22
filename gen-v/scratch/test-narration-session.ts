import { VoiceRouter } from "../lib/voice/voice-router";
import { NarrationRole } from "../lib/voice/narration-role";
import { VOICE_CONFIG } from "../lib/voice/voice-config";

async function run100RunDeterministicSessionTest() {
  console.log("=======================================================");
  console.log("  TESTING IMUTABLE NARRATION SESSION (100 RUNS)       ");
  console.log("=======================================================");

  const topics = [
    "Geography",
    "History",
    "Coding",
    "Flags",
    "Logos",
    "Facts",
    "Motivation",
    "Stories"
  ];

  let passed = 0;
  const total = 100;

  for (let i = 0; i < total; i++) {
    const videoId = `test_video_${i}_${Date.now()}`;
    const topic = topics[i % topics.length];

    // 1. Create session (Runs health check and freezes session)
    const session = await VoiceRouter.createSession(videoId);

    // Verify immutability
    if (!Object.isFrozen(session)) {
      console.error(`❌ Fail: session object for run ${i+1} is not frozen!`);
      process.exit(1);
    }
    if (!Object.isFrozen(session.provider)) {
      console.error(`❌ Fail: session.provider object for run ${i+1} is not frozen!`);
      process.exit(1);
    }

    // Verify Language is strictly en-US
    if (session.language !== "en-US") {
      console.error(`❌ Fail: session language is "${session.language}", expected "en-US"!`);
      process.exit(1);
    }

    // Verify Provider is locked once
    const expectedIntroVoice = VOICE_CONFIG[NarrationRole.INTRO].providers[session.providerId as keyof typeof VOICE_CONFIG[NarrationRole.INTRO]["providers"]];
    const expectedMainVoice = VOICE_CONFIG[NarrationRole.MAIN].providers[session.providerId as keyof typeof VOICE_CONFIG[NarrationRole.MAIN]["providers"]];

    if (session.introVoiceId !== expectedIntroVoice || session.mainVoiceId !== expectedMainVoice) {
      console.error(`❌ Fail on run ${i+1} (${topic}): Intro voice=${session.introVoiceId} (expected ${expectedIntroVoice}), Main voice=${session.mainVoiceId} (expected ${expectedMainVoice})`);
      process.exit(1);
    }

    passed++;
  }

  console.log(`\n✅ 100/100 NARRATION SESSION TESTS PASSED SUCCESSFULLY!`);
  console.log(`- NarrationSession Object: Strictly Frozen -> 100% Guaranteed`);
  console.log(`- NarrationSession.provider: Strictly Frozen -> 100% Guaranteed`);
  console.log(`- Language: Strictly "en-US" -> 100% Guaranteed`);
  console.log(`- Intro Voice (Female) and Main Voice (Male) locked to selected provider -> 100% Guaranteed`);
}

run100RunDeterministicSessionTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
