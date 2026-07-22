import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { SceneRenderPool, SceneInput } from "../lib/renderer/SceneRenderPool";

// Setup scratch directory
const scratchDir = path.resolve(process.cwd(), "scratch");
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

const testImage = path.join(scratchDir, "test_image.jpg");
const testAudio = path.join(scratchDir, "test_audio.mp3");
const outputVideo = path.join(scratchDir, "test_output.mp4");

import { execSync } from "child_process";

// Simple path resolver for test script
function resolveFFmpegPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  try {
    const checkCmd = process.platform === "win32" ? "where ffmpeg" : "which ffmpeg";
    const result = execSync(checkCmd, { encoding: "utf8" }).trim();
    if (result) return result.split(/\r?\n/)[0].trim();
  } catch {}
  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (home && process.platform === "win32") {
    const wingetLink = path.join(home, "AppData", "Local", "Microsoft", "WinGet", "Links", "ffmpeg.exe");
    if (fs.existsSync(wingetLink)) return wingetLink;
  }
  return "ffmpeg";
}

const ffmpegCmd = resolveFFmpegPath();

async function runTest() {
  console.log("=== STARTING FFMEG RENDER PIPELINE TEST ===");
  console.log("Using FFmpeg command:", ffmpegCmd);

  // 1. Generate real image via FFmpeg
  console.log("Generating real test image...");
  const imgResult = spawnSync(ffmpegCmd, [
    "-f", "lavfi",
    "-i", "color=c=0x1E1E2E:s=1080x1920:d=1",
    "-vframes", "1",
    "-y",
    testImage
  ]);
  if (imgResult.status !== 0) {
    console.error("Failed to generate test image:", imgResult.stderr?.toString() || imgResult.error?.message);
    process.exit(1);
  }

  // 2. Generate real audio via FFmpeg
  console.log("Generating real test audio...");
  const audioResult = spawnSync(ffmpegCmd, [
    "-f", "lavfi",
    "-i", "anullsrc=r=44100:cl=stereo",
    "-t", "3",
    "-y",
    testAudio
  ]);
  if (audioResult.status !== 0) {
    console.error("Failed to generate test audio:", audioResult.stderr?.toString());
    process.exit(1);
  }

  console.log("Test assets generated successfully.");

  // Mock scene inputs
  const scenes: SceneInput[] = [
    {
      index: 0,
      narrative: "First test scene of the render pipeline",
      imagePrompt: "test prompt 1",
      imagePath: testImage,
      audioPath: testAudio,
      duration: 3,
      fps: 30,
      resolution: "1080x1920"
    },
    {
      index: 1,
      narrative: "Second test scene of the render pipeline",
      imagePrompt: "test prompt 2",
      imagePath: testImage,
      audioPath: testAudio,
      duration: 3,
      fps: 30,
      resolution: "1080x1920"
    }
  ];

  try {
    console.log("\n--- Executing SceneRenderPool.renderScene ---");
    const outputDir = path.join(scratchDir, "render_output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const scene0 = await SceneRenderPool.renderScene(
      scenes[0],
      outputDir,
      "test-engine-v1",
      "test-workflow-v1",
      "test-prompt-v1"
    );
    console.log("Scene 0 Render Result:", scene0);

    const scene1 = await SceneRenderPool.renderScene(
      scenes[1],
      outputDir,
      "test-engine-v1",
      "test-workflow-v1",
      "test-prompt-v1"
    );
    console.log("Scene 1 Render Result:", scene1);

    console.log("\n--- Executing SceneRenderPool.concat ---");
    await SceneRenderPool.concat([scene0, scene1], outputVideo);
    console.log("Concat complete!");

    // Verify output file
    if (fs.existsSync(outputVideo)) {
      const stats = fs.statSync(outputVideo);
      console.log(`\nSUCCESS! Output video generated at: ${outputVideo}`);
      console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
    } else {
      console.error("\nFAILURE: Output video file not found!");
    }
  } catch (error: any) {
    console.error("\nTEST FAILED WITH ERROR:", error.stack || error.message);
  } finally {
    // Cleanup temporary files
    try {
      fs.unlinkSync(testImage);
      fs.unlinkSync(testAudio);
    } catch {}
  }
}

runTest();
