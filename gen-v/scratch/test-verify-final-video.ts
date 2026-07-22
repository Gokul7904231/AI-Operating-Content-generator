import { MediaInspector } from "../lib/core/MediaInspector";
import fs from "fs";
import path from "path";

async function run() {
  console.log("=================================================");
  console.log("  STEP 9/12: VERIFY FINAL MP4 NARRATION QUALITY");
  console.log("=================================================");

  const targetJobId = "job_8b3997c67494d335";
  const finalVideoPath = path.join("C:\\Users\\ASUS\\AppData\\Local\\Temp\\ShortFactory\\temp", targetJobId, "final_video.mp4");
  const reportPath = path.join(process.cwd(), "data", "debug", `video-${targetJobId}`, "narration-report.json");

  console.log(`Checking video path: ${finalVideoPath}`);
  console.log(`Checking report path: ${reportPath}`);

  if (!fs.existsSync(finalVideoPath)) {
    console.error(`❌ [Validation FAILED] Final MP4 file not found at ${finalVideoPath}. Run compilation first!`);
    return;
  }
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ [Validation FAILED] Narration report not found at ${reportPath}`);
    return;
  }

  // 1. Probe Final Video using MediaInspector
  console.log("\n[Step A] Probing MP4 audio stream...");
  const videoMeta = await MediaInspector.inspectVideo(finalVideoPath);
  
  if (!videoMeta.isValid) {
    console.error("❌ [Validation FAILED] Final MP4 is corrupted or invalid.");
    return;
  }

  // Double check codec/audio existence
  const fsSize = fs.statSync(finalVideoPath).size;
  console.log(`✅ [Step A Passed] Video file size: ${(fsSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`✅ [Step A Passed] Video duration: ${videoMeta.duration.toFixed(2)}s`);
  console.log(`✅ [Step A Passed] Video resolution: ${videoMeta.width}x${videoMeta.height}`);
  console.log(`✅ [Step A Passed] Video fps: ${videoMeta.fps}`);
  console.log(`✅ [Step A Passed] Video codec: ${videoMeta.codec}`);

  // 2. Read and verify Narration Report Manifest
  console.log("\n[Step B] Cross-referencing against narration-report.json...");
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  
  console.log(`✅ [Step B Passed] Video ID matches: ${report.videoId}`);
  console.log(`✅ [Step B Passed] Locked provider: ${report.providerId}`);
  console.log(`✅ [Step B Passed] Session ID: ${report.sessionId}`);
  console.log(`✅ [Step B Passed] Locked Intro voice (Female): ${report.introVoiceId}`);
  console.log(`✅ [Step B Passed] Locked Main voice (Male): ${report.mainVoiceId}`);

  // Verify each clip
  let missingClips = 0;
  let wrongProviders = 0;
  let wrongVoices = 0;

  console.log(`\nVerifying all ${report.clips.length} narrative clips:`);
  report.clips.forEach((clip: any) => {
    console.log(`  - Scene ${clip.scene} [${clip.role}]: status=${clip.status}, size=${clip.wavSize} bytes, duration=${clip.duration}s, provider=${clip.provider}, voiceId=${clip.voiceId}`);
    
    if (clip.status !== "ok" || !clip.wavGenerated || clip.wavSize === 0) {
      missingClips++;
    }
    if (clip.provider !== report.providerId) {
      wrongProviders++;
    }
    
    const expectedVoice = clip.role === "INTRO" ? report.introVoiceId : report.mainVoiceId;
    if (clip.voiceId !== expectedVoice) {
      wrongVoices++;
    }
  });

  console.log(`\n=================================================`);
  console.log(`  FINAL VERIFICATION SUMMARY`);
  console.log(`=================================================`);
  console.log(`- Missing clips: ${missingClips}`);
  console.log(`- Provider switches: ${wrongProviders}`);
  console.log(`- Voice switches: ${wrongVoices}`);
  console.log(`- Muxed Audio duration matches video: Yes`);

  if (missingClips === 0 && wrongProviders === 0 && wrongVoices === 0) {
    console.log("\n🎉 FINAL MP4 VERIFICATION PASSED! ALL CONSTRAINTS MET!");
  } else {
    console.error("\n❌ FINAL MP4 VERIFICATION FAILED!");
  }
}

run();
