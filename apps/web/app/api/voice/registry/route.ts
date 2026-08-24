import { NextResponse } from "next/server";
import { VoiceProfileRegistry } from "@/lib/voice/voice-registry";
import { VoiceHealthTracker } from "@/lib/voice/voice-health";
import { VoiceBenchmarkDB } from "@/lib/voice/voice-benchmark";
import { VoiceDoctor } from "@/lib/voice/voice-doctor";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profiles = VoiceProfileRegistry.getAllProfiles();
    const healthStats = VoiceHealthTracker.getAllStats();
    const benchmarkHistory = VoiceBenchmarkDB.getHistory(20);
    const lastDoctorReport = VoiceDoctor.getLastReport();

    // Map health stats for easier frontend parsing
    const providers = healthStats.map(stat => {
      const dbStats = VoiceBenchmarkDB.getAverages(stat.providerId);
      return {
        id: stat.providerId,
        online: stat.online,
        latencyMs: stat.latencyMs,
        failureCount: stat.failureCount,
        timeoutCount: stat.timeoutCount,
        circuitBreakerState: stat.circuitBreakerState,
        avgColdStartMs: dbStats?.coldStartMs ?? 0,
        avgWarmStartMs: dbStats?.warmStartMs ?? 0,
        wordsPerSec: dbStats?.wordsPerSec ?? 0,
        rtf: dbStats?.rtf ?? 0,
        cpuPct: dbStats?.cpuPct ?? 0,
        ramMb: dbStats?.ramMb ?? 0
      };
    });

    return NextResponse.json({
      success: true,
      profiles,
      providers,
      benchmarkHistory,
      lastDoctorReport
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Allows triggering Voice Doctor diagnostics on demand
    const report = await VoiceDoctor.runDiagnostics();
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
