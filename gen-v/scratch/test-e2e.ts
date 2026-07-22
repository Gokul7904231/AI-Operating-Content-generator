import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { TempManager } from "../lib/core/TempManager";
import { MediaInspector } from "../lib/core/MediaInspector";
import { CapabilityManager } from "../lib/capabilities/CapabilityManager";

import { CheckpointDB } from "../lib/core/CheckpointDB";

const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("\n=======================================================");
  console.log("  COMMENCING SHORTSFACTORY OS E2E ACCEPTANCE TEST  ");
  console.log("=======================================================\n");

  // 1. Wait until local dev server is healthy
  console.log("Step 1: Checking dev server health on http://localhost:3000 ...");
  let healthy = false;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) {
        healthy = true;
        break;
      }
    } catch {}
    console.log("... server not responding yet, waiting 2s ...");
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!healthy) {
    console.error("❌ E2E Failed: Local dev server at http://localhost:3000 is not reachable.");
    process.exit(1);
  }
  console.log("✅ Dev server is responsive and healthy.");

  // 2. Fetch mock quiz draft
  console.log("\nStep 2: Requesting mock geo-quiz draft (Japan JP)...");
  const draftRes = await fetch(`${BASE_URL}/api/quiz/mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      countryCode: "JP",
      tone: "Challenging & Provocative",
      format: "6_rapid",
      version: 1,
    }),
  });

  if (!draftRes.ok) {
    console.error(`❌ E2E Failed: /api/quiz/mock returned HTTP ${draftRes.status}`);
    process.exit(1);
  }

  const draft = await draftRes.json();
  console.log(`✅ Draft generated. Hook: "${draft.hook}" | Questions: ${draft.questions?.length}`);

  // 3. Trigger video generation
  console.log("\nStep 3: Triggering video generation pipeline...");
  const payload = {
    topic: "Japan Geo Quiz",
    style: "quiz",
    contentType: "QUIZ_SHORTS",
    hook: draft.hook,
    questions: draft.questions,
    title: `${draft.country} Quiz`,
    description: draft.gradingScale,
    hashtags: ["quiz", "geoquiz", "jp", "shorts"],
    renderProfile: "FAST_QUIZ",
    durationSeconds: 45,
  };

  const renderRes = await fetch(`${BASE_URL}/api/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!renderRes.ok) {
    console.error(`❌ E2E Failed: /api/generate-video returned HTTP ${renderRes.status}`);
    process.exit(1);
  }

  const renderJob = await renderRes.json();
  const jobId = renderJob.jobId;
  console.log(`✅ Generation job successfully queued. Job ID: ${jobId}`);

  // 4. Poll job status
  console.log("\nStep 4: Polling status until compilation completes...");
  let status = "queued";
  let elapsed = 0;
  const maxWait = 180; // 3 minutes timeout

  while (elapsed < maxWait) {
    let statusData: any = null;
    try {
      const statusRes = await fetch(`${BASE_URL}/api/job-status/${jobId}`);
      if (statusRes.ok) {
        statusData = await statusRes.json();
        status = statusData.status;
      }
    } catch (err: any) {
      console.log(`[T+${elapsed}s] HTTP poll failed: ${err.message}. Checking SQLite checkpoint...`);
    }

    if (!statusData) {
      try {
        const checkpoint = CheckpointDB.getCheckpoint(jobId);
        if (checkpoint) {
          status = checkpoint.status;
          console.log(`[T+${elapsed}s] Direct SQLite Checkpoint Status: ${status}`);
        } else {
          console.log(`[T+${elapsed}s] No SQLite checkpoint found yet.`);
        }
      } catch (sqliteErr: any) {
        console.warn(`⚠️ SQLite check failed:`, sqliteErr.message);
      }
    } else {
      console.log(`[T+${elapsed}s] Job Status: ${status}`);
    }

    if (status === "completed" || status === "failed") {
      break;
    }

    await new Promise((r) => setTimeout(r, 4000));
    elapsed += 4;
  }

  if (status !== "completed") {
    console.error(`❌ E2E Failed: Job did not complete successfully. Final status: ${status}`);
    process.exit(1);
  }
  console.log("✅ Video generation completed successfully!");

  // 5. Locate output files on disk
  console.log("\nStep 5: Locating and analyzing output artifacts on local storage...");
  const tempDir = TempManager.getTempDir(jobId);
  const videoPath = path.join(tempDir, "final_video.mp4");
  console.log(`Expected video path: ${videoPath}`);

  if (!fs.existsSync(videoPath)) {
    console.error("❌ E2E Failed: Final video file does not exist on disk.");
    process.exit(1);
  }

  const stats = fs.statSync(videoPath);
  console.log(`✅ File exists. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // 5.1 Forensic checks on generated scenes
  const files = fs.readdirSync(tempDir);
  const imageFiles = files.filter(f => /^scene_\d+\.jpg$/.test(f));
  const voiceFiles = files.filter(f => f.startsWith("scene_") && f.endsWith("_voice.wav"));

  console.log(`\nFound ${imageFiles.length} JPEGs and ${voiceFiles.length} WAV narration files.`);

  if (imageFiles.length === 0 || voiceFiles.length === 0) {
    console.error("❌ E2E Failed: Missing intermediate JPG or WAV files.");
    process.exit(1);
  }

  // 5.2 Validate Image channels stats (ensure not solid color, not pitch black)
  const sharp = require("sharp");
  for (const imgName of imageFiles) {
    const imgPath = path.join(tempDir, imgName);
    const imgStats = await sharp(imgPath).stats();
    const isSolid = imgStats.channels.every((ch: any) => ch.min === ch.max);
    const meanRed = imgStats.channels[0].mean;

    console.log(`Analyzing ${imgName} -> Mean brightness (R): ${meanRed.toFixed(1)} | Solid: ${isSolid}`);

    if (isSolid) {
      console.error(`❌ E2E Failed: ${imgName} is a solid color placeholder! Overlay rendering failed.`);
      process.exit(1);
    }
    if (meanRed < 5.0) {
      console.error(`❌ E2E Failed: ${imgName} is extremely dark (mean R: ${meanRed.toFixed(1)}).`);
      process.exit(1);
    }
  }
  console.log("✅ All scene images verified as non-solid with healthy brightness.");

  // 5.3 Validate Audio RMS level and strict timeline scheduling contracts
  const manifestPath = path.join(tempDir, "scenes_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("❌ E2E Failed: scenes_manifest.json not found in job assets directory.");
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  // Contract Assertion 1: Verify exact question count for the active profile (Shorts 60 = 6 questions)
  const questionReadScenes = manifest.filter((s: any) => s.isQuestionRead);
  const totalQuestions = questionReadScenes.length;
  console.log(`\nVerifying Question Count Contract -> Found ${totalQuestions} question blocks.`);
  if (totalQuestions !== 6) {
    console.error(`❌ E2E Failed: Question count contract violated. Expected exactly 6 questions, found ${totalQuestions}.`);
    process.exit(1);
  }
  console.log("✅ Question count contract satisfied (Exactly 6 questions).");

  // Contract Assertion 2: Verify Hook and Outro presence
  if (!manifest[0].isHook) {
    console.error("❌ E2E Failed: First scene is not Hook.");
    process.exit(1);
  }
  if (!manifest[manifest.length - 1].isOutro) {
    console.error("❌ E2E Failed: Last scene is not Outro.");
    process.exit(1);
  }
  console.log("✅ Hook and Outro card presence verified.");

  // Loop and perform forensic WAV and timing checks
  for (const wavName of voiceFiles) {
    const wavPath = path.join(tempDir, wavName);
    const buffer = fs.readFileSync(wavPath);
    
    // Parse data chunk
    let offset = 12;
    let dataOffset = -1;
    let dataSize = 0;
    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.toString("utf8", offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);
      if (chunkId === "data") {
        dataOffset = offset + 8;
        dataSize = chunkSize;
        break;
      }
      offset += 8 + chunkSize;
    }

    if (dataOffset === -1) {
      console.error(`❌ E2E Failed: ${wavName} is an invalid WAV file (no data chunk).`);
      process.exit(1);
    }

    const samplesCount = Math.floor(Math.min(dataSize, buffer.length - dataOffset) / 2);
    let sumSquared = 0;
    for (let i = 0; i < samplesCount; i++) {
      const val = buffer.readInt16LE(dataOffset + i * 2) / 32768;
      sumSquared += val * val;
    }
    const rms = Math.sqrt(sumSquared / (samplesCount || 1));
    const rawAudioDuration = samplesCount / 44100;

    const match = wavName.match(/scene_(\d+)_voice\.wav/);
    if (!match) {
      console.error(`❌ E2E Failed: wavName ${wavName} does not match scene filename pattern.`);
      process.exit(1);
    }
    const idx = parseInt(match[1], 10);
    const sceneInfo = manifest[idx];
    const isCountdown = !!sceneInfo?.isQuestionCountdown;

    console.log(`Forensic Check [scene ${idx}] -> Type: ${isCountdown ? "COUNTDOWN" : "NARRATION"} | Solved Scene Duration: ${sceneInfo.duration.toFixed(2)}s | Raw Audio Duration: ${rawAudioDuration.toFixed(2)}s | RMS Level: ${rms.toFixed(5)}`);

    if (isCountdown) {
      // Countdown scenes must be completely silent
      if (rms > 0.01) {
        console.error(`❌ E2E Failed: Countdown scene audio ${wavName} is not silent (RMS Level: ${rms.toFixed(5)}).`);
        process.exit(1);
      }
      // Countdown scenes must have exactly 1.0s duration
      if (Math.abs(sceneInfo.duration - 1.0) > 0.01) {
        console.error(`❌ E2E Failed: Countdown scene duration is not exactly 1.0s (Duration: ${sceneInfo.duration}).`);
        process.exit(1);
      }
    } else {
      // Narration scenes must contain audible speech
      if (rms < 0.05) {
        console.error(`❌ E2E Failed: Narration scene audio ${wavName} is silent (RMS Level: ${rms.toFixed(5)}).`);
        process.exit(1);
      }
      // Contract Assertion 3: Question transitions must happen ONLY after narration completes (scene duration >= raw audio duration)
      if (sceneInfo.duration < rawAudioDuration - 0.05) {
        console.error(`❌ E2E Failed: Transition happened before narration completed! Scene solved duration: ${sceneInfo.duration.toFixed(2)}s | Raw audio duration: ${rawAudioDuration.toFixed(2)}s`);
        process.exit(1);
      }
    }
  }
  console.log("✅ All scene narration audio tracks contain healthy, non-silent speech patterns and satisfy strict transition scheduling contracts.");

  // 5.4 Validate Product Critic Quality Report
  console.log("\nStep 5.4: Locating and verifying Product Critic Quality Report...");
  const reportPath = path.join(process.cwd(), "data", "jobs", `${jobId}_quality_report.json`);
  if (!fs.existsSync(reportPath)) {
    console.error("❌ E2E Failed: Quality report JSON file does not exist on disk.");
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  console.log(`✅ Quality Report loaded. Overall Engagement Score: ${report.metrics.overallEngagement.score}/10.0`);
  console.log("Quality Metrics breakdown:");
  for (const [key, val] of Object.entries(report.metrics)) {
    const v = val as any;
    console.log(` - ${key}: Score ${v.score}/10.0 (${v.type}) | ${v.details}`);
    if (v.score < 8.0) {
      console.error(`❌ E2E Failed: Category "${key}" failed to meet the target score of 8.0 (Score: ${v.score}).`);
      process.exit(1);
    }
  }
  console.log("✅ All Product Critic quality metrics passed the 8.0/10.0 bar!");

  // 6. Probing container integrity and formats
  console.log("\nStep 6: Running ffprobe stream assertions...");
  const videoMeta = await MediaInspector.inspectVideo(videoPath);

  if (!videoMeta.isValid) {
    console.error("❌ E2E Failed: ffprobe claims video container is invalid or empty.");
    process.exit(1);
  }

  console.log("Video Stream Details:");
  console.log(` - Codec:     ${videoMeta.codec}`);
  console.log(` - Format:    ${videoMeta.format}`);
  console.log(` - Size:      ${videoMeta.width}x${videoMeta.height}`);
  console.log(` - FPS:       ${videoMeta.fps}`);
  console.log(` - Duration:  ${videoMeta.duration.toFixed(2)}s`);

  // Assertions
  const targetDuration = 60.0;
  const devTolerance = 0.05;
  const actualDuration = videoMeta.duration;
  console.log(`Verifying target duration: Target=${targetDuration}s | Actual=${actualDuration.toFixed(3)}s | Tolerance=${devTolerance}s`);
  if (Math.abs(actualDuration - targetDuration) > devTolerance) {
    console.error(`❌ E2E Failed: Video duration did not match target ${targetDuration}s (Actual: ${actualDuration.toFixed(3)}s).`);
    process.exit(1);
  }

  console.log("✅ Stream specifications verified successfully.");

  // 7. Verify playability by extracting first and last frames
  console.log("\nStep 7: Testing frame extraction to guarantee decodability/playability...");
  const ffmpegCmd = CapabilityManager.getFFmpegPath();
  const scratchDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const firstFramePath = path.join(scratchDir, `e2e_first_${jobId}.jpg`);
  const lastFramePath = path.join(scratchDir, `e2e_last_${jobId}.jpg`);

  console.log("Extracting first frame...");
  const firstFrameResult = spawnSync(ffmpegCmd, [
    "-v", "error",
    "-i", videoPath,
    "-vframes", "1",
    "-y",
    firstFramePath
  ]);

  if (firstFrameResult.status !== 0) {
    console.error(`❌ E2E Failed: First frame extraction failed: ${firstFrameResult.stderr?.toString()}`);
    process.exit(1);
  }

  console.log("Extracting last frame...");
  const lastFrameResult = spawnSync(ffmpegCmd, [
    "-v", "error",
    "-sseof", "-1",
    "-i", videoPath,
    "-vframes", "1",
    "-y",
    lastFramePath
  ]);

  if (lastFrameResult.status !== 0) {
    console.error(`❌ E2E Failed: Last frame extraction failed: ${lastFrameResult.stderr?.toString()}`);
    process.exit(1);
  }

  if (!fs.existsSync(firstFramePath) || fs.statSync(firstFramePath).size === 0) {
    console.error("❌ E2E Failed: First frame file is missing or empty.");
    process.exit(1);
  }

  if (!fs.existsSync(lastFramePath) || fs.statSync(lastFramePath).size === 0) {
    console.error("❌ E2E Failed: Last frame file is missing or empty.");
    process.exit(1);
  }

  console.log(`✅ Playability confirmed! First frame: ${path.basename(firstFramePath)} | Last frame: ${path.basename(lastFramePath)}`);

  // Cleanup frame files
  try {
    fs.unlinkSync(firstFramePath);
    fs.unlinkSync(lastFramePath);
  } catch {}

  console.log("\n=======================================================");
  console.log("  🎉 E2E ACCEPTANCE TEST COMPLETED WITH 100% PASS 🎉  ");
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("❌ Critical E2E Test execution error:", err);
  process.exit(1);
});
