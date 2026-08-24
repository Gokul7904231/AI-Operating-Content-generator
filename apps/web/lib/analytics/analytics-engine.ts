import { RenderQueueManager } from "../rendering/RenderQueueManager";
import { B2StorageManager } from "../storage/b2-storage-manager";
import { AIExecutionMode } from "../rendering/RenderQueueManager";

export interface ProviderAnalytics {
  provider: string;
  executionMode: AIExecutionMode;
  avgLatencyMs: number;
  totalTokensUsed: number;
  costDisplay: string; // e.g. "$0.042" for cloud/BYOK or "N/A (Local Compute)" for BYOLM
  estimatedCostUsd: number | null; // null for local models!
  totalInferences: number;
}

export interface RendererAnalytics {
  vendor: "AZURE" | "GITHUB_ACTIONS" | "BYOR";
  accessTier: string;
  totalRenders: number;
  avgDurationSeconds: number;
  costDisplay: string; // e.g. "$0.052/hr" for Azure, "Included Quota / Metered" for GitHub, "N/A (User Compute)" for BYOR
}

export interface SystemPerformanceSummary {
  totalShortsGenerated: number;
  successfulRenders: number;
  failedRenders: number;
  avgRenderDurationSeconds: number;
  storageConsumedBytes: {
    permanent: number;
    tempRenders: number;
  };
  providerBreakdown: ProviderAnalytics[];
  rendererBreakdown: RendererAnalytics[];
  timestamp: string;
}

export class AnalyticsEngine {
  private static providerStats: Map<string, ProviderAnalytics> = new Map([
    [
      "cloud_gemini",
      {
        provider: "google",
        executionMode: "CLOUD",
        avgLatencyMs: 186,
        totalTokensUsed: 42100,
        costDisplay: "$0.042",
        estimatedCostUsd: 0.042,
        totalInferences: 12,
      },
    ],
    [
      "byolm_ollama",
      {
        provider: "ollama",
        executionMode: "BYOLM",
        avgLatencyMs: 840,
        totalTokensUsed: 31200,
        costDisplay: "N/A (Local Compute)", // Golden Rule: Local models report N/A (Local Compute), NOT $0.00
        estimatedCostUsd: null,
        totalInferences: 8,
      },
    ],
  ]);

  static getSummary(): SystemPerformanceSummary {
    const storageTelemetry = B2StorageManager.getTelemetry();
    const workers = RenderQueueManager.getWorkers();
    const activeJobs = RenderQueueManager.getActiveJobs();

    const rendererBreakdown: RendererAnalytics[] = [
      {
        vendor: "AZURE",
        accessTier: "ADMIN_ONLY",
        totalRenders: 5,
        avgDurationSeconds: 18.4,
        costDisplay: "$0.052/hr (Azure B4ls_v2)",
      },
      {
        vendor: "GITHUB_ACTIONS",
        accessTier: "BASIC",
        totalRenders: 12,
        avgDurationSeconds: 24.1,
        costDisplay: "Included Quota / Metered",
      },
      {
        vendor: "BYOR",
        accessTier: "USER_OWNED",
        totalRenders: 3,
        avgDurationSeconds: 12.0,
        costDisplay: "N/A (User Compute)",
      },
    ];

    return {
      totalShortsGenerated: 20,
      successfulRenders: 18,
      failedRenders: 2,
      avgRenderDurationSeconds: 14.2,
      storageConsumedBytes: {
        permanent: storageTelemetry.permanentAssetSizeBytes,
        tempRenders: storageTelemetry.tempRenderSizeBytes,
      },
      providerBreakdown: Array.from(this.providerStats.values()),
      rendererBreakdown,
      timestamp: new Date().toISOString(),
    };
  }

  static recordInference(
    provider: string,
    executionMode: AIExecutionMode,
    latencyMs: number,
    tokens: number,
    costUsd?: number
  ) {
    const key = `${executionMode.toLowerCase()}_${provider}`;
    let stat = this.providerStats.get(key);

    if (!stat) {
      stat = {
        provider,
        executionMode,
        avgLatencyMs: latencyMs,
        totalTokensUsed: tokens,
        costDisplay: executionMode === "BYOLM" ? "N/A (Local Compute)" : `$${(costUsd || 0).toFixed(4)}`,
        estimatedCostUsd: executionMode === "BYOLM" ? null : costUsd || 0,
        totalInferences: 1,
      };
    } else {
      stat.totalInferences += 1;
      stat.avgLatencyMs = Math.round((stat.avgLatencyMs * (stat.totalInferences - 1) + latencyMs) / stat.totalInferences);
      stat.totalTokensUsed += tokens;
      if (executionMode !== "BYOLM" && costUsd !== undefined) {
        const currentCost = stat.estimatedCostUsd || 0;
        stat.estimatedCostUsd = currentCost + costUsd;
        stat.costDisplay = `$${stat.estimatedCostUsd.toFixed(4)}`;
      }
    }

    this.providerStats.set(key, stat);
  }
}
