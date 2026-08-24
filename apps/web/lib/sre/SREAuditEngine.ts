/**
 * SRE Audit Engine — Main Orchestrator
 * Runs all 19 phases sequentially. Never stops on failure.
 * Streams progress via EventBus. Saves report to data/sre-report.json.
 * Also autonomously scheduled every 30 minutes.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { SREAuditReport, SREProgressEvent } from "./types";
import { runProviderDiscovery } from "./phases/01-provider-discovery";
import { runEnvVerification } from "./phases/02-env-verification";
import { runEndpointHealth } from "./phases/03-endpoint-health";
import { runModelDiscovery } from "./phases/04-model-discovery";
import { runCapabilityVerification } from "./phases/05-capability-verification";
import { runFunctionalTests } from "./phases/06-functional-tests";
import { runPerformanceBenchmark } from "./phases/07-performance-benchmark";
import {
  runRateLimitDetection,
  runRouterVerification,
  runImageProviderTests,
  runStorageAudit,
  runPublisherAudit,
  runSecurityAudit,
  runCacheAudit,
  runEventBusAudit,
  runDashboardVerification,
} from "./phases/08-17-combined";
import { buildDoctorCards, buildFinalSummary } from "./phases/18-19-doctor-summary";
import { HistoricalStore } from "./HistoricalStore";
import { buildProviderScores, buildCapabilityRoutes, buildMarketplaceModels } from "./ProviderScorer";

const REPORT_FILE = path.resolve(process.cwd(), "data", "sre-report.json");

// Global SSE subscriber list for live streaming
type ProgressCallback = (event: SREProgressEvent) => void;
const progressSubscribers = new Set<ProgressCallback>();

function emit(event: SREProgressEvent) {
  for (const cb of progressSubscribers) {
    try { cb(event); } catch {}
  }
}

function log(phase: number, phaseName: string, message: string, data?: any) {
  const evt: SREProgressEvent = {
    type: "log",
    phase,
    phaseName,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
  console.log(`[SRE P${phase}] ${message}`);
  emit(evt);
}

function phaseStart(phase: number, name: string) {
  emit({ type: "phase_start", phase, phaseName: name, message: `Starting Phase ${phase}: ${name}`, timestamp: new Date().toISOString() });
}

function phaseComplete(phase: number, name: string, data?: any) {
  emit({ type: "phase_complete", phase, phaseName: name, message: `Phase ${phase} complete: ${name}`, timestamp: new Date().toISOString(), data });
}

async function safePhase<T>(phase: number, name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  phaseStart(phase, name);
  try {
    const result = await fn();
    phaseComplete(phase, name);
    return result;
  } catch (err: any) {
    const msg = `Phase ${phase} (${name}) error: ${err.message}`;
    console.error(`[SRE Engine] ${msg}`);
    emit({ type: "phase_fail", phase, phaseName: name, message: msg, timestamp: new Date().toISOString() });
    return fallback;
  }
}

class SREAuditEngineClass {
  private isRunning = false;
  private lastRunAt = 0;
  private autoTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Auto-start autonomous doctor on server startup
    if (typeof window === "undefined") {
      setTimeout(() => this.runFullAudit(false), 5000);
      this.startAutonomousSchedule();
    }
  }

  private startAutonomousSchedule() {
    // Every 30 minutes
    this.autoTimer = setInterval(() => {
      console.log("[SREAuditEngine] Autonomous 30-minute audit triggered...");
      this.runFullAudit(false).catch(() => {});
    }, 30 * 60 * 1000);
  }

  subscribeToProgress(cb: ProgressCallback): () => void {
    progressSubscribers.add(cb);
    return () => progressSubscribers.delete(cb);
  }

  async getLatestReport(): Promise<SREAuditReport | null> {
    try {
      if (fs.existsSync(REPORT_FILE)) {
        return JSON.parse(fs.readFileSync(REPORT_FILE, "utf-8"));
      }
    } catch {}
    return null;
  }

  async runFullAudit(includeStressTest = false): Promise<SREAuditReport> {
    if (this.isRunning) {
      throw new Error("SRE Audit already in progress. Please wait.");
    }

    this.isRunning = true;
    this.lastRunAt = Date.now();
    const auditId = `sre_${crypto.randomBytes(6).toString("hex")}`;
    const startedAt = new Date().toISOString();

    emit({ type: "phase_start", phase: 0, phaseName: "INIT", message: `ShortFactory SRE Audit started — ID: ${auditId}`, timestamp: startedAt });

    try {
      // ─── Phase 1: Provider Discovery ────────────────────────────────────
      const phase1 = await safePhase(1, "Provider Discovery", runProviderDiscovery, []);
      log(1, "Provider Discovery", `Discovered ${phase1.length} providers, ${phase1.filter(p => p.enabled).length} active`);

      // ─── Phase 2: Env Verification ───────────────────────────────────────
      const phase2 = await safePhase(2, "Env Verification", runEnvVerification, { phase: 2, totalKeys: 0, validKeys: 0, issues: [], providersDetected: [], securityScore: 0 });
      log(2, "Env Verification", `${phase2.totalKeys} keys, ${phase2.issues.filter(i => i.severity === "critical").length} critical issues`);

      // ─── Phase 3: Endpoint Health ─────────────────────────────────────────
      const phase3 = await safePhase(3, "Endpoint Health", () => runEndpointHealth(phase1), []);
      const healthy3 = phase3.filter(h => h.status === "healthy").length;
      log(3, "Endpoint Health", `${healthy3}/${phase3.length} providers healthy`);

      // ─── Phase 4: Model Discovery ──────────────────────────────────────────
      const phase4 = await safePhase(4, "Model Discovery", () => runModelDiscovery(phase1, phase3), []);
      log(4, "Model Discovery", `${phase4.length} models discovered`);

      // ─── Phase 5: Capability Verification ─────────────────────────────────
      const phase5 = await safePhase(5, "Capability Verification", () => runCapabilityVerification(phase1, phase4), []);
      log(5, "Capability Verification", `${phase5.filter(t => t.status === "pass").length}/${phase5.length} capability tests passed`);

      // ─── Phase 6: Functional Tests ─────────────────────────────────────────
      const phase6 = await safePhase(6, "Functional Tests", () => runFunctionalTests(phase1), []);
      log(6, "Functional Tests", `${phase6.filter(t => t.status === "pass").length}/${phase6.length} functional tests passed`);

      // ─── Phase 7: Performance Benchmark ───────────────────────────────────
      const phase7 = await safePhase(7, "Performance Benchmark", () => runPerformanceBenchmark(phase1, phase4), []);
      const fastestBench = phase7.sort((a, b) => a.avgLatencyMs - b.avgLatencyMs)[0];
      log(7, "Performance Benchmark", `Fastest: ${fastestBench?.modelId || "n/a"} @ ${fastestBench?.avgLatencyMs || 0}ms`);

      // ─── Phase 8: Stress Test (opt-in) ────────────────────────────────────
      const phase8 = includeStressTest
        ? await safePhase(8, "Stress Test", async () => {
            const { runStressTest } = await import("./phases/08-17-combined");
            const p = phase1.find(p => p.id === "gemini" && p.enabled);
            if (!p || !phase4.find(m => m.providerId === "gemini")) return [];
            const m = phase4.find(m => m.providerId === "gemini")!;
            return [await runStressTest(p, m.id, [1, 5, 10])];
          }, [])
        : [];

      // ─── Phase 9: Rate Limit Detection ────────────────────────────────────
      const phase9 = await safePhase(9, "Rate Limit Detection", () => runRateLimitDetection(phase1), []);
      log(9, "Rate Limit Detection", `${phase9.filter(r => r.headersFound.length > 0).length} providers returned rate limit headers`);

      // ─── Phase 10: Router Verification ────────────────────────────────────
      const phase10 = await safePhase(10, "Router Verification", runRouterVerification, { steps: [], fullChainCovered: false, fallbackSuccess: false });
      log(10, "Router Verification", `Fallback chain: ${phase10.fallbackSuccess ? "✓ PASS" : "✗ FAIL"}`);

      // ─── Phase 11: Image Providers ─────────────────────────────────────────
      const phase11 = await safePhase(11, "Image Providers", () => runImageProviderTests(phase1), []);
      log(11, "Image Providers", `${phase11.filter(r => r.success).length}/${phase11.length} image providers working`);

      // ─── Phase 12: Storage Audit ───────────────────────────────────────────
      const phase12 = await safePhase(12, "Storage Audit", runStorageAudit, []);

      // ─── Phase 13: Publisher Audit ─────────────────────────────────────────
      const phase13 = await safePhase(13, "Publisher Audit", runPublisherAudit, []);

      // ─── Phase 14: Security Audit ──────────────────────────────────────────
      const phase14 = await safePhase(14, "Security Audit", runSecurityAudit, { noKeyLeakInLogs: false, noStackTracesExposed: false, noClientSideSecrets: false, internalKeyStrong: false, issues: [], score: 0 });
      log(14, "Security Audit", `Security score: ${phase14.score}/100`);

      // ─── Phase 15: Cache Audit ─────────────────────────────────────────────
      const phase15 = await safePhase(15, "Cache Audit", runCacheAudit, { cacheHit: false, providerCallSkipped: false });

      // ─── Phase 16: EventBus Audit ──────────────────────────────────────────
      const phase16 = await safePhase(16, "EventBus Audit", runEventBusAudit, { eventsVerified: [], allPresent: false });
      log(16, "EventBus Audit", `${phase16.eventsVerified.length} events verified`);

      // ─── Phase 17: Dashboard Verification ─────────────────────────────────
      const phase17 = await safePhase(17, "Dashboard Verification", runDashboardVerification, { dataFresh: false, sseFunctional: false });

      // ─── Phase 18: AI Doctor Cards ─────────────────────────────────────────
      const phase18 = await safePhase(18, "AI Doctor", async () =>
        buildDoctorCards(phase1, phase3, phase6, phase7, phase9), []);
      log(18, "AI Doctor", `Doctor cards generated for ${phase18.length} providers`);

      // ─── Phase 19: Final Report ────────────────────────────────────────────
      const phase19 = await safePhase(19, "Final Report", async () =>
        buildFinalSummary(phase1, phase3, phase6, phase7, phase4, phase5, phase14.score), {} as any);

      // ─── Derived Data ──────────────────────────────────────────────────────
      const providerScores = buildProviderScores(phase1, phase3, phase6, phase7, phase9);
      const capabilityRoutes = buildCapabilityRoutes(phase5, phase4, phase9);
      const marketplaceModels = buildMarketplaceModels(phase4, phase7, phase5);

      // ─── Record historical snapshots ───────────────────────────────────────
      for (const h of phase3) {
        HistoricalStore.recordFromAudit(
          h.providerId,
          h.latencyMs,
          h.status,
          100,
          h.status === "healthy" ? 0 : 1,
          h.status === "healthy" ? 0 : 1
        );
      }

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - new Date(startedAt).getTime();

      const report: SREAuditReport = {
        id: auditId,
        startedAt,
        completedAt,
        durationMs,
        phase1_providers: phase1,
        phase2_env: phase2,
        phase3_health: phase3,
        phase4_models: phase4,
        phase5_capabilities: phase5,
        phase6_functional: phase6,
        phase7_benchmarks: phase7,
        phase8_stress: phase8,
        phase9_rateLimits: phase9,
        phase10_router: phase10,
        phase11_imageProviders: phase11,
        phase12_storage: phase12,
        phase13_publisher: phase13,
        phase14_security: phase14,
        phase15_cache: phase15,
        phase16_eventbus: phase16,
        phase17_dashboard: phase17,
        phase18_doctorCards: phase18,
        phase19_summary: phase19,
        providerScores,
        capabilityRoutes,
        marketplaceModels,
      };

      // Save report
      try {
        fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
        fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
        console.log(`[SRE Engine] ✓ Audit complete in ${(durationMs / 1000).toFixed(1)}s. Score: ${phase19.overallScore}/100 (${phase19.grade})`);
      } catch {}

      emit({ type: "audit_complete", message: `Audit complete. Score: ${phase19.overallScore}/100 Grade: ${phase19.grade}`, timestamp: completedAt, data: { score: phase19.overallScore, grade: phase19.grade } });

      return report;
    } finally {
      this.isRunning = false;
    }
  }

  get isAuditRunning() { return this.isRunning; }
}

export const SREAuditEngine = new SREAuditEngineClass();
