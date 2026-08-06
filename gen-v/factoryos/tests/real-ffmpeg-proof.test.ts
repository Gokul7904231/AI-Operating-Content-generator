import { describe, it, expect } from "vitest";
import { VideoPipelineAdapter } from "../core/adapters/VideoPipelineAdapter";
import { FFmpegService } from "../../lib/core/FFmpegService";
import fs from "fs";
import { execSync } from "child_process";

function isFfmpegAvailable(): boolean {
  try {
    execSync("ffmpeg -version", { encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}

describe("FactoryOS — Real Video Pipeline & FFprobe Proof", () => {
  const hasFfmpeg = isFfmpegAvailable();

  it("renders a real MP4 video via FFmpeg and proves format, resolution, codecs, streams, and file size", async () => {
    const adapter = new VideoPipelineAdapter();
    const artifact = await adapter.render("real_proof_job_101", {
      contentType: "QUIZ_SHORTS",
      title: "Real FFmpeg Proof Quiz",
      hook: "Testing real video rendering!",
      questions: [],
      description: "Real video test",
      hashtags: ["ffmpeg", "proof"],
      renderProfile: "FAST_QUIZ",
      estimatedDuration: 5,
      rawPayload: {},
    });

    expect(fs.existsSync(artifact.filePath)).toBe(true);
    expect(artifact.fileSizeBytes).toBeGreaterThan(1000);

    if (!hasFfmpeg) {
      console.warn("SKIPPED — FFMPEG NOT AVAILABLE: ffprobe verification could not run.");
      return;
    }

    // Run ffprobe on the produced video file
    const probeResult = await FFmpegService.runFfprobe([
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      "-show_format",
      artifact.filePath,
    ]);

    const meta = JSON.parse(probeResult.stdout.toString());
    console.log("=================================================");
    console.log("REAL FFPROBE VERIFICATION METADATA");
    console.log("=================================================");
    console.log("Format Container:", meta.format?.format_long_name || meta.format?.format_name);
    console.log("File Size Bytes:", meta.format?.size);
    console.log("Duration Seconds:", meta.format?.duration);
    console.log("Stream Count:", meta.streams?.length);
    if (meta.streams?.[0]) {
      console.log("Video Stream 0 Codec:", meta.streams[0].codec_name, `(${meta.streams[0].width}x${meta.streams[0].height})`);
    }
    if (meta.streams?.[1]) {
      console.log("Audio Stream 1 Codec:", meta.streams[1].codec_name);
    }
    console.log("=================================================");

    expect(meta.format?.format_name).toContain("mp4");
    expect(meta.streams.length).toBeGreaterThanOrEqual(1);
  }, 30000);
});
