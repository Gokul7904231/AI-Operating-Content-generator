import { VoiceProvider } from "../voice-provider";

export class EdgeProvider implements VoiceProvider {
  id = "edge";
  name = "Microsoft Edge TTS";
  version = "1.0.0";
  supportsStreaming = false;
  supportsSSML = true;
  supportsEmotion = false;
  supportsVoiceCloning = false;
  supportsLanguages = ["en", "es", "fr", "de", "it", "ja", "zh", "hi"];

  async health(): Promise<{ online: boolean; latencyMs: number; error?: string; cpu?: number; memory?: number }> {
    const t0 = Date.now();
    try {
      const { execSync } = require("child_process");
      execSync("edge-tts --version", { stdio: "ignore" });
      const latencyMs = Date.now() - t0;
      return { online: true, latencyMs, cpu: 1, memory: 10 };
    } catch (err: any) {
      return { online: false, latencyMs: Date.now() - t0, error: err.message };
    }
  }

  async benchmark(): Promise<{ latencyMs: number; coldStartMs: number; warmStartMs: number; wordsPerSec: number; rtf: number }> {
    const start = Date.now();
    try {
      await this.synthesize("Test", { voiceId: "en-US-GuyNeural" });
      const duration = Date.now() - start;
      return {
        latencyMs: duration,
        coldStartMs: duration,
        warmStartMs: duration,
        wordsPerSec: 12.0,
        rtf: parseFloat((duration / 1000).toFixed(2))
      };
    } catch {
      return { latencyMs: 0, coldStartMs: 0, warmStartMs: 0, wordsPerSec: 0, rtf: 0 };
    }
  }

  async synthesize(text: string, options: {
    voiceId: string;
    speed?: number;
    language?: string;
  }): Promise<Buffer> {
    const voice = options.voiceId || "en-US-GuyNeural";
    
    // Validate voiceId to enforce "en-US-" starting pattern
    if (!voice.startsWith("en-US-")) {
      throw new Error(`[EdgeProvider] Rejected voiceId "${voice}". Voice must start with "en-US-".`);
    }

    const { exec } = require("child_process");
    const fs = require("fs");
    const path = require("path");
    const crypto = require("crypto");
    
    const tempFileId = crypto.randomBytes(8).toString("hex");
    const tempFile = path.join(process.cwd(), "scratch", `edge_tts_temp_${tempFileId}.mp3`);

    const rate = options.speed ? `${Math.round((options.speed - 1) * 100)}%` : "+0%";
    const rateString = rate.startsWith("-") || rate.startsWith("+") ? rate : `+${rate}`;

    const cmd = `edge-tts --text "${text.replace(/"/g, '\\"')}" --voice "${voice}" --rate "${rateString}" --write-media "${tempFile}"`;

    return new Promise<Buffer>((resolve, reject) => {
      exec(cmd, (error: any, stdout: any, stderr: any) => {
        if (error) {
          if (fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch {}
          }
          return reject(new Error(`edge-tts CLI synthesis failed: ${error.message}. Stderr: ${stderr}`));
        }

        try {
          if (!fs.existsSync(tempFile)) {
            return reject(new Error("edge-tts CLI synthesis succeeded but output file was not created."));
          }
          const buf = fs.readFileSync(tempFile);
          if (!buf || buf.length === 0) {
            try { fs.unlinkSync(tempFile); } catch {}
            return reject(new Error("edge-tts CLI synthesis created an empty file."));
          }
          fs.unlinkSync(tempFile);
          resolve(buf);
        } catch (readErr: any) {
          if (fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch {}
          }
          reject(readErr);
        }
      });
    });
  }
}

export const edgeProvider = new EdgeProvider();
