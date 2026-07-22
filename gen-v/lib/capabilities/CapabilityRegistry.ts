import { ModelMeta } from "@/ai/capability-registry";
import { ModelDiscoveryService } from "@/ai/model-discovery";
import { AIProfile } from "@/ai/intelligent-router";
import { CircuitBreakerRegistry } from "../core/CircuitBreakerRegistry";

// Dynamic metrics to track latency drift
interface ModelDriftMetrics {
  avgLatencyMs: number;
  requestCount: number;
}

const modelDrifts = new Map<string, ModelDriftMetrics>();

export const CapabilityRegistry = {
  /**
   * Resolve optimal model candidates matching capability and profile requirements.
   */
  async resolveModel(
    capability: string,
    profile: AIProfile,
    options?: {
      jsonRequired?: boolean;
      contextWindowMin?: number;
      maxCost?: number;
    }
  ): Promise<ModelMeta> {
    const candidates = await ModelDiscoveryService.getModelsForCapability(capability as any);
    if (candidates.length === 0) {
      throw new Error(`[CapabilityRegistry] No registered models support capability: ${capability}`);
    }

    // Filter by circuit breakers & constraints
    const activeCandidates = candidates.filter((model) => {
      if (CircuitBreakerRegistry.isOpen(model.id)) {
        console.warn(`[CapabilityRegistry] Circuit breaker open for model: ${model.id}. Skipping.`);
        return false;
      }

      if (options?.contextWindowMin && model.contextWindow < options.contextWindowMin) {
        return false;
      }
      if (options?.jsonRequired) {
        const idLower = model.id.toLowerCase();
        const supportsJson =
          idLower.includes("gemini") ||
          idLower.includes("gpt-") ||
          idLower.includes("claude") ||
          idLower.includes("llama-3") ||
          (model.tags && model.tags.includes("json"));
        if (!supportsJson) return false;
      }
      return true;
    });

    const finalCandidates = activeCandidates.length > 0 ? activeCandidates : candidates;

    // Sort candidates based on profile
    finalCandidates.sort((a, b) => {
      // Fetch drift latencies if tracked
      const driftA = modelDrifts.get(a.id)?.avgLatencyMs ?? (1000 / a.speed) * 100;
      const driftB = modelDrifts.get(b.id)?.avgLatencyMs ?? (1000 / b.speed) * 100;

      const costA = a.costInput + a.costOutput;
      const costB = b.costInput + b.costOutput;

      switch (profile) {
        case "Maximum Quality":
          // Prefer higher context window / premium models
          return b.contextWindow - a.contextWindow || costB - costA;

        case "Maximum Speed":
          // Prefer lowest latency drift
          return driftA - driftB;

        case "Lowest Cost":
          // Prefer lowest absolute pricing
          return costA - costB;

        case "Offline Mode":
        case "Privacy":
          // Prefer local models
          if (a.isLocal && !b.isLocal) return -1;
          if (!a.isLocal && b.isLocal) return 1;
          return costA - costB;

        case "Balanced":
        default:
          // Weighted score: 50% Speed/Latency, 50% Cost
          const scoreA = driftA * 0.5 + costA * 1000 * 0.5;
          const scoreB = driftB * 0.5 + costB * 1000 * 0.5;
          return scoreA - scoreB;
      }
    });

    console.log(
      `[CapabilityRegistry] Resolved optimal model: ${finalCandidates[0].id} for capability ${capability} [Profile: ${profile}]`
    );
    return finalCandidates[0];
  },

  /**
   * Report model execution failures to trip circuit breakers.
   */
  reportFailure(modelId: string) {
    CircuitBreakerRegistry.recordFailure(modelId);
  },

  /**
   * Report successful execution to reset circuit breaker and update drift latency.
   */
  reportSuccess(modelId: string, latencyMs: number) {
    // Reset circuit breaker
    CircuitBreakerRegistry.recordSuccess(modelId);

    // Update exponential moving average latency
    const drift = modelDrifts.get(modelId) || { avgLatencyMs: latencyMs, requestCount: 0 };
    drift.requestCount++;
    drift.avgLatencyMs = drift.avgLatencyMs * 0.8 + latencyMs * 0.2;
    modelDrifts.set(modelId, drift);
  },

  /**
   * Enumerate latency drifts for monitoring dashboard pings.
   */
  getDriftReport() {
    return Array.from(modelDrifts.entries()).map(([modelId, metrics]) => ({
      modelId,
      avgLatencyMs: Math.round(metrics.avgLatencyMs),
      requests: metrics.requestCount,
    }));
  },
};
