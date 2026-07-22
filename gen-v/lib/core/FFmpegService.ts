import { spawn } from "child_process";
import { CapabilityManager } from "../capabilities/CapabilityManager";

export interface FFmpegResult {
  status: number | null;
  stdout: Buffer;
  stderr: string;
}

export class FFmpegError extends Error {
  classification: string;
  stderr: string;

  constructor(message: string, classification: string, stderr: string) {
    super(message);
    this.name = "FFmpegError";
    this.classification = classification;
    this.stderr = stderr;
  }
}

export class FFmpegServiceClass {
  
  /**
   * Run FFmpeg asynchronously.
   * Handles input buffer piping, output streaming, timeout constraints, and cancellation signals.
   */
  async runFFmpeg(
    args: string[],
    options: {
      inputBuffer?: Buffer;
      timeoutMs?: number;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<FFmpegResult> {
    const ffmpegCmd = CapabilityManager.getFFmpegPath();
    return this.runProcess(ffmpegCmd, args, options);
  }

  /**
   * Run ffprobe asynchronously.
   */
  async runFfprobe(
    args: string[],
    options: {
      inputBuffer?: Buffer;
      timeoutMs?: number;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<FFmpegResult> {
    const ffprobeCmd = CapabilityManager.getFfprobePath();
    return this.runProcess(ffprobeCmd, args, options);
  }

  /**
   * Universal runner for child processes with robust stderr parsing, timeout, and buffer piping
   */
  private async runProcess(
    cmd: string,
    args: string[],
    options: {
      inputBuffer?: Buffer;
      timeoutMs?: number;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<FFmpegResult> {
    const timeout = options.timeoutMs ?? 60000;
    
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args);
      
      const stdoutChunks: Buffer[] = [];
      let stderr = "";
      let isFinished = false;

      // Handle abort signals
      if (options.abortSignal) {
        const onAbort = () => {
          if (!isFinished) {
            isFinished = true;
            child.kill();
            reject(new Error("Process execution aborted by caller"));
          }
        };
        options.abortSignal.addEventListener("abort", onAbort);
      }

      // Handle timeouts
      const timer = setTimeout(() => {
        if (!isFinished) {
          isFinished = true;
          child.kill();
          reject(
            new FFmpegError(
              `Process execution timed out after ${timeout}ms`,
              "TIMEOUT",
              stderr
            )
          );
        }
      }, timeout);

      child.stdout.on("data", (chunk) => {
        stdoutChunks.push(chunk);
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(timer);

        const stdout = Buffer.concat(stdoutChunks);

        if (code === 0) {
          resolve({ status: code, stdout, stderr });
        } else {
          const classification = this.classifyStderr(stderr);
          reject(
            new FFmpegError(
              `FFmpeg/ffprobe failed with exit code ${code}`,
              classification,
              stderr
            )
          );
        }
      });

      child.on("error", (err) => {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(timer);
        reject(
          new FFmpegError(
            `Failed to start child process: ${err.message}`,
            "SPAWN_ERROR",
            stderr
          )
        );
      });

      // Write to stdin if input buffer is supplied
      if (options.inputBuffer && options.inputBuffer.length > 0) {
        try {
          child.stdin.write(options.inputBuffer);
          child.stdin.end();
        } catch (err: any) {
          // Keep logging but don't reject immediately, wait for process close
          console.warn(`[FFmpegService] Error writing to stdin: ${err.message}`);
        }
      }
    });
  }

  /**
   * Analyzes stderr streams and maps them to highly actionable, human-friendly classifications
   */
  classifyStderr(stderr: string): string {
    const lower = stderr.toLowerCase();

    if (lower.includes("invalid data found when processing input")) {
      return "CORRUPTED_INPUT_HEADER";
    }
    if (lower.includes("no such file or directory") || lower.includes("could not open file") || lower.includes("find_stream_info: empty")) {
      return "MISSING_FILE";
    }
    if (lower.includes("permission denied")) {
      return "PERMISSION_DENIED";
    }
    if (lower.includes("unsupported codec") || lower.includes("unknown encoder") || lower.includes("crashed unexpectedly") || lower.includes("invalid encoder")) {
      return "UNSUPPORTED_CODEC";
    }
    if (lower.includes("out of memory") || lower.includes("cannot allocate memory")) {
      return "OUT_OF_MEMORY";
    }
    if (lower.includes("timed out") || lower.includes("timeout")) {
      return "TIMEOUT";
    }
    if (lower.includes("moov atom not found") || lower.includes("empty stream")) {
      return "CORRUPTED_CONTAINER";
    }

    return "UNKNOWN_ERROR";
  }
}

export const FFmpegService = new FFmpegServiceClass();
export default FFmpegService;
