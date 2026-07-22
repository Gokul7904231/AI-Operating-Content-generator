/**
 * CapabilityManager — Hardware Abstraction Layer
 *
 * Probes the runtime environment for available CPU, GPU, encoders,
 * and AI compute capabilities. Provides a single source of truth
 * for every subsystem (Renderer, AI Router, TTS) to ask about hardware.
 *
 * Usage:
 *   await CapabilityManager.init();
 *   CapabilityManager.supports("h264_nvenc") // → true
 *   CapabilityManager.bestEncoder()          // → "h264_nvenc" | "h264_qsv" | "h264_amf" | "libx264"
 */

import { execSync, spawnSync } from "child_process";
import os from "os";

export interface CapabilityReport {
  // Hardware
  cpuCores: number;
  cpuModel: string;
  totalMemoryGB: number;
  // GPU
  gpuVendor: "nvidia" | "amd" | "intel" | "none";
  gpuName: string;
  // Encoders
  encoders: string[];
  bestVideoEncoder: string;
  // AI
  cudaAvailable: boolean;
  // FFmpeg
  ffmpegVersion: string;
}

const ENCODER_FALLBACK_CHAIN = [
  "h264_nvenc",   // NVIDIA NVENC
  "h264_qsv",     // Intel Quick Sync
  "h264_amf",     // AMD AMF
  "libx264",      // Software fallback
];

import path from "path";
import fs from "fs";

let _resolvedFfmpegPath: string | null = null;
let _resolvedFfprobePath: string | null = null;

function resolveFFmpegPath(): string {
  if (_resolvedFfmpegPath) return _resolvedFfmpegPath;

  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    _resolvedFfmpegPath = process.env.FFMPEG_PATH;
    return _resolvedFfmpegPath;
  }

  // 1. Try default system PATH first
  try {
    const checkCmd = process.platform === "win32" ? "where ffmpeg" : "which ffmpeg";
    const result = execSync(checkCmd, { encoding: "utf8" }).trim();
    if (result) {
      const firstPath = result.split(/\r?\n/)[0].trim();
      _resolvedFfmpegPath = firstPath;
      return _resolvedFfmpegPath;
    }
  } catch {}

  // 2. Try looking in Winget Links directory (User AppData)
  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (home && process.platform === "win32") {
    const wingetLink = path.join(home, "AppData", "Local", "Microsoft", "WinGet", "Links", "ffmpeg.exe");
    if (fs.existsSync(wingetLink)) {
      _resolvedFfmpegPath = wingetLink;
      return wingetLink;
    }

    // Search winget Packages folders
    const wingetPackagesDir = path.join(home, "AppData", "Local", "Microsoft", "WinGet", "Packages");
    if (fs.existsSync(wingetPackagesDir)) {
      try {
        const pkgs = fs.readdirSync(wingetPackagesDir);
        for (const pkg of pkgs) {
          if (pkg.toLowerCase().includes("gyan.ffmpeg")) {
            const binDir = path.join(wingetPackagesDir, pkg, "ffmpeg-8.1.2-full_build", "bin", "ffmpeg.exe");
            if (fs.existsSync(binDir)) {
              _resolvedFfmpegPath = binDir;
              return binDir;
            }
          }
        }
      } catch (err: any) {}
    }
  }

  _resolvedFfmpegPath = "ffmpeg";
  return "ffmpeg";
}

function resolveFfprobePath(): string {
  if (_resolvedFfprobePath) return _resolvedFfprobePath;

  if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
    _resolvedFfprobePath = process.env.FFPROBE_PATH;
    return _resolvedFfprobePath;
  }

  // 1. Try default system PATH first
  try {
    const checkCmd = process.platform === "win32" ? "where ffprobe" : "which ffprobe";
    const result = execSync(checkCmd, { encoding: "utf8" }).trim();
    if (result) {
      const firstPath = result.split(/\r?\n/)[0].trim();
      _resolvedFfprobePath = firstPath;
      return _resolvedFfprobePath;
    }
  } catch {}

  // 2. Try looking in Winget Links directory (User AppData)
  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (home && process.platform === "win32") {
    const wingetLink = path.join(home, "AppData", "Local", "Microsoft", "WinGet", "Links", "ffprobe.exe");
    if (fs.existsSync(wingetLink)) {
      _resolvedFfprobePath = wingetLink;
      return wingetLink;
    }

    // Search winget Packages folders
    const wingetPackagesDir = path.join(home, "AppData", "Local", "Microsoft", "WinGet", "Packages");
    if (fs.existsSync(wingetPackagesDir)) {
      try {
        const pkgs = fs.readdirSync(wingetPackagesDir);
        for (const pkg of pkgs) {
          if (pkg.toLowerCase().includes("gyan.ffmpeg")) {
            const binDir = path.join(wingetPackagesDir, pkg, "ffmpeg-8.1.2-full_build", "bin", "ffprobe.exe");
            if (fs.existsSync(binDir)) {
              _resolvedFfprobePath = binDir;
              return binDir;
            }
          }
        }
      } catch (err: any) {}
    }
  }

  _resolvedFfprobePath = "ffprobe";
  return "ffprobe";
}

class CapabilityManagerClass {
  getFFmpegPath(): string {
    return resolveFFmpegPath();
  }

  getFfprobePath(): string {
    return resolveFfprobePath();
  }

  private report: CapabilityReport | null = null;
  private initialized = false;

  /** Initialize and probe all hardware. Call once on startup. */
  async init(): Promise<void> {
    if (this.initialized) return;
    console.log("[CapabilityManager] Probing hardware capabilities...");

    const cpuCores = os.cpus().length;
    const cpuModel = os.cpus()[0]?.model ?? "Unknown";
    const totalMemoryGB = Math.round(os.totalmem() / 1024 / 1024 / 1024);

    let gpuVendor: CapabilityReport["gpuVendor"] = "none";
    let gpuName = "None";
    try {
      const nvidiaOut = spawnSync("nvidia-smi", ["--query-gpu=name", "--format=csv,noheader"], { encoding: "utf8", timeout: 3000 });
      if (nvidiaOut.status === 0 && nvidiaOut.stdout.trim()) {
        gpuVendor = "nvidia";
        gpuName = nvidiaOut.stdout.trim().split("\n")[0];
      }
    } catch {}

    if (gpuVendor === "none") {
      try {
        // Intel GPU check via wmic on Windows / lspci on Linux
        const isWindows = process.platform === "win32";
        const cmd = isWindows
          ? `wmic path win32_videocontroller get Caption`
          : `lspci | grep -i "vga\\|3d\\|display"`;
        const out = spawnSync(isWindows ? "cmd" : "sh", [isWindows ? "/c" : "-c", cmd], { encoding: "utf8", timeout: 3000 });
        const raw = out.stdout?.toLowerCase() ?? "";
        if (raw.includes("intel")) { gpuVendor = "intel"; gpuName = "Intel Graphics"; }
        else if (raw.includes("amd") || raw.includes("radeon")) { gpuVendor = "amd"; gpuName = "AMD Radeon"; }
      } catch {}
    }

    // Probe FFmpeg encoders
    let ffmpegVersion = "unknown";
    let encoders: string[] = [];
    try {
      const ffmpegCmd = resolveFFmpegPath();
      const versionOut = spawnSync(ffmpegCmd, ["-version"], { encoding: "utf8", timeout: 5000 });
      ffmpegVersion = versionOut.stdout?.split("\n")[0] ?? "unknown";

      const encoderOut = spawnSync(ffmpegCmd, ["-encoders"], { encoding: "utf8", timeout: 5000 });
      const lines = encoderOut.stdout?.split("\n") ?? [];
      encoders = lines
        .filter((l) => l.includes("V"))
        .map((l) => l.trim().split(/\s+/)[1])
        .filter(Boolean);
    } catch {
      console.warn("[CapabilityManager] FFmpeg not found. Encoder detection skipped.");
    }

    // Select best encoder from fallback chain
    const bestVideoEncoder = ENCODER_FALLBACK_CHAIN.find((enc) => encoders.includes(enc)) ?? "libx264";

    // CUDA check
    let cudaAvailable = false;
    try {
      const cudaOut = spawnSync("nvcc", ["--version"], { encoding: "utf8", timeout: 3000 });
      cudaAvailable = cudaOut.status === 0;
    } catch {}

    this.report = {
      cpuCores,
      cpuModel,
      totalMemoryGB,
      gpuVendor,
      gpuName,
      encoders,
      bestVideoEncoder,
      cudaAvailable,
      ffmpegVersion,
    };
    this.initialized = true;

    console.log(`[CapabilityManager] Probe complete:
  CPU: ${cpuModel} (${cpuCores} cores)
  RAM: ${totalMemoryGB}GB
  GPU: ${gpuName} (${gpuVendor})
  Encoder: ${bestVideoEncoder}
  CUDA: ${cudaAvailable}
  FFmpeg: ${ffmpegVersion}`);

    // Asynchronously warm up local voice models and run diagnostics
    Promise.resolve().then(async () => {
      try {
        const { supertonicProvider } = await import("../voice/providers/supertonic");
        const { VoiceDoctor } = await import("../voice/voice-doctor");
        await supertonicProvider.preloadModel();
        await VoiceDoctor.runDiagnostics();
      } catch (err: any) {
        console.warn("[CapabilityManager] Voice diagnostics warmup failed:", err.message);
      }
    });
  }

  /** Check if the capability or encoder is available */
  supports(capability: string): boolean {
    if (!this.report) return false;
    if (capability === "cuda") return this.report.cudaAvailable;
    if (capability === "nvidia") return this.report.gpuVendor === "nvidia";
    if (capability === "amd") return this.report.gpuVendor === "amd";
    if (capability === "intel") return this.report.gpuVendor === "intel";
    return this.report.encoders.includes(capability);
  }

  /** Get the best video encoder for the current hardware */
  bestEncoder(): string {
    if (process.env.ENABLE_GPU_RENDERING === "false") {
      return "libx264";
    }
    return this.report?.bestVideoEncoder ?? "libx264";
  }

  /** Get the full capability report */
  getReport(): CapabilityReport | null {
    return this.report;
  }

  /** How many scene workers to spawn based on CPU cores */
  optimalWorkerCount(): number {
    const cores = this.report?.cpuCores ?? 2;
    return Math.max(1, cores - 1); // Leave 1 core for the main process
  }
}

export const CapabilityManager = new CapabilityManagerClass();
