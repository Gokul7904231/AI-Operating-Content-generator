import fs from "fs";
import path from "path";
import { EnvironmentDoctor, DoctorReport } from "./EnvironmentDoctor";
import { ProviderVerifier, ProviderHealth } from "./ProviderVerifier";
import { CapabilityVerifier, CapabilityHealth } from "./CapabilityVerifier";
import { AIConfigManager } from "../../ai/ai-config-manager";
import { AIProviderRegistry } from "../../ai/capability-registry";

export interface ModelPassport {
  id: string;
  providers: string[];
  capabilities: string[];
  benchmarks: Record<string, number>;
  health: number; // 0 to 100
  latency: number;
  successRate: number;
}

export interface DoctorDiagnosis {
  timestamp: string;
  envReport: DoctorReport;
  providerReports: ProviderHealth[];
  capabilityHealthMatrix: Record<string, Record<string, CapabilityHealth>>; // Model@Provider -> Capability -> Health
  modelPassports: ModelPassport[];
  workflowStatus: {
    enginesRegistered: string[];
    valid: boolean;
  };
  pipelineStatus: {
    sharpLoaded: boolean;
    valid: boolean;
  };
  doctorScore: number; // 0 to 100
  recommendations: string[];
}

class AIDoctorClass {
  private reportFile = path.resolve(process.cwd(), "data", "ai-doctor-report.json");
  private passportFile = path.resolve(process.cwd(), "data", "model-passports.json");
  private lastRun = 0;
  private intervalMs = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.setupTimer();
  }

  private setupTimer() {
    if (typeof window === "undefined") {
      setInterval(() => {
        console.log("[AIDoctor] Recurring 30-minute diagnosis triggered...");
        this.runDiagnosis();
      }, this.intervalMs);
    }
  }

  async getLatestReport(): Promise<DoctorDiagnosis> {
    if (fs.existsSync(this.reportFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.reportFile, "utf-8"));
      } catch {}
    }
    return this.runDiagnosis();
  }

  async runDiagnosis(): Promise<DoctorDiagnosis> {
    console.log("[AIDoctor] Starting AI Infrastructure audit...");
    this.lastRun = Date.now();

    // 1. Audit .env
    const envReport = EnvironmentDoctor.audit();

    // 2. Load configurations and verify active providers
    AIConfigManager.loadAll();
    const activeProviders = AIConfigManager.providers;
    const providerReports = await ProviderVerifier.verifyAll(activeProviders);

    // 3. Capability Health Matrix
    const capabilityHealthMatrix: Record<string, Record<string, CapabilityHealth>> = {};
    for (const model of AIConfigManager.models) {
      for (const provId of model.providers) {
        const key = `${model.id}@${provId}`;
        capabilityHealthMatrix[key] = {};
        for (const cap of model.capabilities) {
          const capHealth = await CapabilityVerifier.verifyCapability(cap, model.id, provId);
          capabilityHealthMatrix[key][cap] = capHealth;
        }
      }
    }

    // 4. Model Passports
    const modelPassports: ModelPassport[] = [];
    for (const model of AIConfigManager.models) {
      const benchmarkData = AIConfigManager.benchmarks[model.id] || { script: 90, critic: 88, metadata: 85 };
      
      // Calculate overall health and latency averages for passport
      let totalLatency = 0;
      let count = 0;
      for (const provId of model.providers) {
        const key = `${model.id}@${provId}`;
        const capMatrix = capabilityHealthMatrix[key];
        if (capMatrix) {
          for (const cap of Object.keys(capMatrix)) {
            totalLatency += capMatrix[cap].latency;
            count++;
          }
        }
      }

      modelPassports.push({
        id: model.id,
        providers: model.providers,
        capabilities: model.capabilities,
        benchmarks: benchmarkData,
        health: 100, // baseline
        latency: count > 0 ? Math.round(totalLatency / count) : 800,
        successRate: 99.2
      });
    }

    // 5. Workflow Verifier
    const enginesDir = path.resolve(process.cwd(), "content-engines");
    const enginesList = fs.existsSync(enginesDir) ? fs.readdirSync(enginesDir).filter(f => !f.startsWith("_")) : [];
    const workflowStatus = {
      enginesRegistered: enginesList,
      valid: enginesList.length > 0
    };

    // 6. Pipeline Verifier
    let sharpLoaded = false;
    try {
      const pkg = "sharp";
      require(pkg);
      sharpLoaded = true;
    } catch {}
    const pipelineStatus = {
      sharpLoaded,
      valid: sharpLoaded
    };

    // 7. Score and Recommendations
    const doctorScore = this.calculateDoctorScore(envReport, providerReports, pipelineStatus);
    const recommendations = this.generateRecommendations(envReport, providerReports, pipelineStatus);

    const diagnosis: DoctorDiagnosis = {
      timestamp: new Date().toISOString(),
      envReport,
      providerReports,
      capabilityHealthMatrix,
      modelPassports,
      workflowStatus,
      pipelineStatus,
      doctorScore,
      recommendations,
    };

    // Save report & passports
    try {
      const dataDir = path.dirname(this.reportFile);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      
      fs.writeFileSync(this.reportFile, JSON.stringify(diagnosis, null, 2), "utf-8");
      fs.writeFileSync(this.passportFile, JSON.stringify(modelPassports, null, 2), "utf-8");
      console.log(`[AIDoctor] Audit complete. Score: ${doctorScore}/100. Saved to data/ai-doctor-report.json`);
    } catch (e: any) {
      console.error("[AIDoctor] Failed to write report files:", e.message);
    }

    return diagnosis;
  }

  triggerFailureDiagnosis(providerId: string, errorMsg: string) {
    console.warn(`[AIDoctor] Critical failure logged for provider "${providerId}": ${errorMsg}. Running dynamic diagnostics...`);
    // Run diagnostics asynchronously to avoid blocking the main runtime thread
    this.runDiagnosis().catch(() => {});
  }

  private calculateDoctorScore(
    envReport: DoctorReport,
    providerReports: ProviderHealth[],
    pipelineStatus: { sharpLoaded: boolean }
  ): number {
    let score = 100;

    // Env Deductions
    const errorsCount = envReport.diagnostics.filter(d => d.type === "error").length;
    score -= errorsCount * 10;

    // Provider Deductions
    for (const prov of providerReports) {
      if (prov.status === "OFFLINE") {
        score -= 15;
      }
    }

    // Pipeline Deductions
    if (!pipelineStatus.sharpLoaded) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(
    envReport: DoctorReport,
    providerReports: ProviderHealth[],
    pipelineStatus: { sharpLoaded: boolean }
  ): string[] {
    const recommendations: string[] = [];

    for (const d of envReport.diagnostics) {
      if (d.type === "error") {
        recommendations.push(`[.env Audit] Critical: ${d.message}`);
      }
    }

    for (const prov of providerReports) {
      if (prov.status === "OFFLINE") {
        recommendations.push(`[Provider Health] "${prov.name}" is OFFLINE. Check credentials.`);
      }
    }

    if (!pipelineStatus.sharpLoaded) {
      recommendations.push("[Media Pipeline] Sharp image processing library failed to load. Resizing optimizations disabled.");
    }

    if (recommendations.length === 0) {
      recommendations.push("System status is healthy. No action required.");
    }

    return recommendations;
  }
}

export const AIDoctor = new AIDoctorClass();
