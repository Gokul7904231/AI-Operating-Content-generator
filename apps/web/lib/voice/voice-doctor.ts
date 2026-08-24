import { VoiceRouter } from "./voice-router";
import { VoiceBenchmarkDB } from "./voice-benchmark";


export interface DiagnosticsReport {
  timestamp: string;
  providers: {
    id: string;
    online: boolean;
    latencyMs: number;
    error?: string;
    coldStartMs: number;
    warmStartMs: number;
    rtf: number;
    wordsPerSec: number;
  }[];
  verifications: {
    englishPass: boolean;
  };
}

class VoiceDoctorClass {
  private lastReport: DiagnosticsReport | null = null;

  async runDiagnostics(): Promise<DiagnosticsReport> {
    console.log("[VoiceDoctor] Starting boot-up voice diagnostics...");
    const report: DiagnosticsReport = {
      timestamp: new Date().toISOString(),
      providers: [],
      verifications: {
        englishPass: false
      }
    };

    const providers = ["supertonic", "edge", "elevenlabs"];
    const testPhrase = "Hello! Welcome to ShortFactory. Voice synthesis check is now active.";

    // 1. Diagnose Providers
    for (const pid of providers) {
      const provider = VoiceRouter.getProvider(pid);
      if (!provider) continue;

      const health = await provider.health();
      let benchmark = { latencyMs: 0, coldStartMs: 0, warmStartMs: 0, wordsPerSec: 0, rtf: 0 };
      
      if (health.online) {
        benchmark = await provider.benchmark();
        VoiceBenchmarkDB.record({
          providerId: pid,
          voiceId: "diagnostic_voice",
          latencyMs: benchmark.latencyMs,
          coldStartMs: benchmark.coldStartMs,
          warmStartMs: benchmark.warmStartMs,
          wordsPerSec: benchmark.wordsPerSec,
          rtf: benchmark.rtf,
          cpuPct: health.cpu ?? 5,
          ramMb: health.memory ?? 50,
          failureCount: 0,
          retryCount: 0
        });
      }

      report.providers.push({
        id: pid,
        online: health.online,
        latencyMs: health.online ? health.latencyMs : 0,
        error: health.error,
        coldStartMs: benchmark.coldStartMs,
        warmStartMs: benchmark.warmStartMs,
        rtf: benchmark.rtf,
        wordsPerSec: benchmark.wordsPerSec
      });
    }

    // 2. English verification check using the new NarrationSession API
    try {
      console.log("[VoiceDoctor] Verifying English speech...");
      const diagSession = await VoiceRouter.createSession(`voicedoctor_diag_${Date.now()}`);
      const diagProvider = diagSession.provider;
      const diagVoiceId = diagSession.mainVoiceId;
      const enBuffer = await diagProvider.synthesize(testPhrase, {
        voiceId: diagVoiceId,
        modelId: diagSession.modelId
      });
      report.verifications.englishPass = enBuffer && enBuffer.length > 100;
    } catch (e: any) {
      console.warn("[VoiceDoctor] English verification check failed:", e.message);
    }


    this.lastReport = report;
    console.log("[VoiceDoctor] Diagnostics complete. Hospital report created.");
    return report;
  }

  getLastReport(): DiagnosticsReport | null {
    return this.lastReport;
  }
}

export const VoiceDoctor = new VoiceDoctorClass();
export default VoiceDoctor;
