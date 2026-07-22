/**
 * SceneRenderPool — Multicore Scene Rendering Engine
 *
 * Renders individual scenes concurrently using FFmpeg.
 * Implements strict SHA-256 hashing for complete cache invalidation.
 * Produces a concat manifest for fast final assembly.
 *
 * Architecture:
 *   render step → SceneRenderPool.renderAll(scenes) 
 *   → [Scene1, Scene2, Scene3, Scene4] via Promise.all(workers) 
 *   → SceneCache check → FFmpeg (GPU encoder) 
 *   → concat demuxer → final_video.mp4
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { CapabilityManager } from "../capabilities/CapabilityManager";
import { WorkerPoolManager } from "../core/WorkerPoolManager";
import { MediaInspector } from "../core/MediaInspector";
import { FFmpegService } from "../core/FFmpegService";

export interface SceneInput {
  index: number;
  narrative: string;
  imagePrompt: string;
  imagePath: string;
  audioPath: string;
  duration: number;
  transition?: string;
  subtitleStyle?: string;
  fps?: number;
  resolution?: string;
}

export interface SceneRenderResult {
  index: number;
  scenePath: string;
  cacheHit: boolean;
  durationMs: number;
  hash: string;
}

const RENDERER_VERSION = "3.0";

class SceneRenderPoolClass {
  private cacheDir: string;

  constructor() {
    this.cacheDir = path.resolve(process.cwd(), "data", "scene-cache");
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate a strict SHA-256 hash from the complete scene parameters.
   * Every factor that could affect the visual output is included.
   */
  private hashScene(
    scene: SceneInput,
    engineVersion: string,
    workflowVersion: string,
    promptVersion: string
  ): string {
    let audioStatStr = "";
    if (scene.audioPath && fs.existsSync(scene.audioPath)) {
      try {
        const stat = fs.statSync(scene.audioPath);
        audioStatStr = `${stat.size}_${stat.mtimeMs}`;
      } catch {}
    }

    const hashInput = [
      scene.narrative,
      scene.imagePrompt,
      scene.audioPath,
      audioStatStr,
      scene.transition ?? "none",
      scene.subtitleStyle ?? "default",
      String(scene.fps ?? 30),
      scene.resolution ?? "1080x1920",
      RENDERER_VERSION,
      engineVersion,
      workflowVersion,
      promptVersion,
    ].join("|");
    return crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 32);
  }

  /**
   * Render a single scene. Checks cache first; falls back to FFmpeg.
   */
  async renderScene(
    scene: SceneInput,
    outputDir: string,
    engineVersion: string,
    workflowVersion: string,
    promptVersion: string
  ): Promise<SceneRenderResult> {
    const t0 = Date.now();
    const hash = this.hashScene(scene, engineVersion, workflowVersion, promptVersion);
    const cachePath = path.join(this.cacheDir, `scene_${hash}.mp4`);
    const outputPath = path.join(outputDir, `scene_${scene.index}.mp4`);

    // Cache hit: link from cache and return immediately
    if (fs.existsSync(cachePath)) {
      fs.copyFileSync(cachePath, outputPath);
      console.log(`[SceneRenderPool] Scene ${scene.index} → CACHE HIT (hash: ${hash.slice(0, 8)})`);
      return { index: scene.index, scenePath: outputPath, cacheHit: true, durationMs: Date.now() - t0, hash };
    }

    // Cache miss: render via FFmpeg
    const encoder = CapabilityManager.bestEncoder();
    const fps = scene.fps ?? 30;
    const resolution = scene.resolution ?? "1080x1920";
    const [width, height] = resolution.split("x").map(Number);

    console.log(`[SceneRenderPool] Scene ${scene.index} → RENDER (encoder: ${encoder})`);

    // Build FFmpeg command for a single scene
    let preset = "veryfast";
    if (encoder === "h264_nvenc") preset = "p1";
    else if (encoder === "h264_amf") preset = "speed";

    const ffmpegArgs = [
      "-loglevel", "verbose",
      "-loop", "1",
      "-i", scene.imagePath,
      "-i", scene.audioPath,
      "-c:v", encoder,
      "-preset", preset,
    ];

    if (encoder === "libx264") {
      ffmpegArgs.push("-tune", "zerolatency");
    }

    const totalFrames = Math.ceil((scene.duration || 5) * fps);
    const videoFilter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${fps}`;

    ffmpegArgs.push(
      "-c:a", "aac",
      "-b:a", "128k",
      "-vf", videoFilter,
      "-shortest",
      "-movflags", "+faststart",
      "-y",
      outputPath,
    );

    console.log(`[FFmpeg EXECUTING]: ffmpeg ${ffmpegArgs.join(" ")}`);
    try {
      await FFmpegService.runFFmpeg(ffmpegArgs, { timeoutMs: 120000 });
      // Store in cache for future runs
      fs.copyFileSync(outputPath, cachePath);
    } catch (err: any) {
      throw new Error(`FFmpeg failed for scene ${scene.index}: ${err.message}`);
    }

    return {
      index: scene.index,
      scenePath: outputPath,
      cacheHit: false,
      durationMs: Date.now() - t0,
      hash,
    };
  }

  /**
   * Run preflight checks on all scenes to make sure they are valid.
   */
  async preflightCheck(scenes: SceneInput[]): Promise<void> {
    console.log(`[SceneRenderPool] Starting preflight verification for ${scenes.length} scenes...`);
    for (const scene of scenes) {
      // 1. Verify Image exists and is valid
      console.log(`[SceneRenderPool] Probing scene ${scene.index} image: ${scene.imagePath}`);
      const imageMeta = await MediaInspector.inspectImage(scene.imagePath);
      if (!imageMeta.isValid) {
        throw new Error(
          `[SceneRenderPool Preflight] Image validation failed for scene ${scene.index}: Corrupted, empty, or unreadable image (${scene.imagePath}).`
        );
      }

      // 2. Verify Audio exists and is valid
      console.log(`[SceneRenderPool] Probing scene ${scene.index} audio: ${scene.audioPath}`);
      const audioMeta = await MediaInspector.inspectAudio(scene.audioPath);
      if (!audioMeta.isValid) {
        throw new Error(
          `[SceneRenderPool Preflight] Audio validation failed for scene ${scene.index}: Corrupted, empty, or unreadable audio (${scene.audioPath}).`
        );
      }
    }
    console.log(`[SceneRenderPool] Preflight check passed successfully for all ${scenes.length} scenes.`);
  }

  /**
   * Render all scenes concurrently up to the optimal worker count.
   * Returns ordered scene results for concat.
   */
  async renderAll(
    scenes: SceneInput[],
    outputDir: string,
    engineVersion: string,
    workflowVersion: string,
    promptVersion: string
  ): Promise<SceneRenderResult[]> {
    // Run preflight check before rendering
    await this.preflightCheck(scenes);

    console.log(`[SceneRenderPool] Queueing ${scenes.length} scene rendering tasks through WorkerPoolManager...`);

    const tasks = scenes.map((scene) => {
      const id = `render_${outputDir}_scene_${scene.index}`;
      return WorkerPoolManager.run<SceneRenderResult>("render", id, async (signal) => {
        return this.renderScene(scene, outputDir, engineVersion, workflowVersion, promptVersion);
      });
    });

    const results = await Promise.all(tasks);
    return results.sort((a, b) => a.index - b.index);
  }

  /**
   * Build a concat demuxer manifest and produce the final video.
   * Much faster than re-encoding via filter_complex concat.
   */
  async concat(
    sceneResults: SceneRenderResult[],
    outputPath: string
  ): Promise<void> {
    const concatManifestPath = outputPath.replace(".mp4", "_concat.txt");

    // Write FFmpeg concat demuxer manifest
    const manifest = sceneResults.map((r) => `file '${r.scenePath.replace(/\\/g, "/")}'`).join("\n");
    fs.writeFileSync(concatManifestPath, manifest, "utf8");

    console.log(`[SceneRenderPool] Concatenating ${sceneResults.length} scenes → ${path.basename(outputPath)}`);

    const ffmpegArgs = [
      "-loglevel", "verbose",
      "-f", "concat",
      "-safe", "0",
      "-i", concatManifestPath,
      "-c", "copy",        // Zero-cost stream copy — no re-encoding
      "-movflags", "+faststart",
      "-y",
      outputPath,
    ];

    console.log(`[FFmpeg EXECUTING]: ffmpeg ${ffmpegArgs.join(" ")}`);

    try {
      await FFmpegService.runFFmpeg(ffmpegArgs, { timeoutMs: 60000 });
    } catch (err: any) {
      throw new Error(`Concat failed: ${err.message}`);
    }

    // Cleanup manifest
    try { fs.unlinkSync(concatManifestPath); } catch {}
    console.log(`[SceneRenderPool] Final video written: ${outputPath}`);
  }
}

export const SceneRenderPool = new SceneRenderPoolClass();
