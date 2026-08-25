/**
 * ShortForge / FactoryOS Auto Model Discovery & Ranking Engine
 * =============================================================
 * Discovers, filters, capability-checks, and ranks available models for each provider
 * using configurable weights and preferred model overrides with resilient caching.
 */

import {
  ProviderModel,
  ModelRequirements,
  ModelSelectionWeights,
  ModelSelectionResult,
} from "./types";

interface CacheEntry {
  provider: string;
  discoveredAt: number;
  expiresAt: number;
  models: ProviderModel[];
}

export class ModelDiscoveryManager {
  private static instance: ModelDiscoveryManager;
  private cache = new Map<string, CacheEntry>();
  private staleCache = new Map<string, ProviderModel[]>();

  private constructor() {}

  public static getInstance(): ModelDiscoveryManager {
    if (!ModelDiscoveryManager.instance) {
      ModelDiscoveryManager.instance = new ModelDiscoveryManager();
    }
    return ModelDiscoveryManager.instance;
  }

  public getCacheTtlSeconds(): number {
    const raw = process.env.MODEL_DISCOVERY_CACHE_SECONDS;
    const parsed = parseInt(raw || "300", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
  }

  public getWeights(): ModelSelectionWeights {
    return {
      quality: parseFloat(process.env.MODEL_SELECTION_QUALITY_WEIGHT || "0.40"),
      speed: parseFloat(process.env.MODEL_SELECTION_SPEED_WEIGHT || "0.25"),
      cost: parseFloat(process.env.MODEL_SELECTION_COST_WEIGHT || "0.15"),
      context: parseFloat(process.env.MODEL_SELECTION_CONTEXT_WEIGHT || "0.10"),
      priority: parseFloat(process.env.MODEL_SELECTION_PRIORITY_WEIGHT || "0.10"),
    };
  }

  /**
   * Discovers models with TTL caching and stale fallback.
   */
  public async getOrDiscoverModels(
    providerId: string,
    fetchFn: () => Promise<ProviderModel[]>
  ): Promise<ProviderModel[]> {
    const now = Date.now();
    const cached = this.cache.get(providerId);

    if (cached && cached.expiresAt > now) {
      return cached.models;
    }

    try {
      const models = await fetchFn();
      const ttlMs = this.getCacheTtlSeconds() * 1000;

      this.cache.set(providerId, {
        provider: providerId,
        discoveredAt: now,
        expiresAt: now + ttlMs,
        models,
      });

      // Keep stale copy for fallback
      this.staleCache.set(providerId, models);
      return models;
    } catch (err: any) {
      console.warn(`[AI Model Discovery] Model listing failed for ${providerId}: ${err.message}`);
      const stale = this.staleCache.get(providerId);
      if (stale && stale.length > 0) {
        console.log(`[AI Model Discovery] Using stale discovered model list for ${providerId} (${stale.length} models)`);
        return stale;
      }
      throw err;
    }
  }

  /**
   * Filters out unavailable, deprecated, blocked, or incapable models.
   */
  public filterModels(
    models: ProviderModel[],
    requirements: ModelRequirements = { text: true, json: true }
  ): ProviderModel[] {
    return models.filter((m) => {
      if (!m.available) return false;
      if (m.deprecated) return false;
      if (m.blocked) return false;

      if (requirements.text && !m.supportsText) return false;
      if (requirements.json && !m.supportsJson) return false;
      if (requirements.vision && !m.supportsVision) return false;
      if (requirements.imageGeneration && !m.supportsImageGeneration) return false;
      if (requirements.structuredOutput && !m.supportsStructuredOutput) return false;
      if (requirements.streaming && !m.supportsStreaming) return false;
      if (requirements.minContextWindow && m.contextWindow < requirements.minContextWindow) return false;

      return true;
    });
  }

  /**
   * Ranks compatible models using deterministic scoring and preferred model priority.
   */
  public rankModels(
    models: ProviderModel[],
    preferredList: string[] = [],
    weights: ModelSelectionWeights = this.getWeights()
  ): Array<{ model: ProviderModel; score: number; reason: string }> {
    const normPreferred = preferredList.map((p) => p.trim().toLowerCase()).filter(Boolean);

    const scored = models.map((model) => {
      let score =
        model.qualityScore * weights.quality +
        model.speedScore * weights.speed +
        model.inputTokenCost * weights.cost +
        (Math.min(model.contextWindow, 128000) / 128000) * weights.context +
        model.priorityScore * weights.priority;

      // Check preferred model boost
      const modelIdNorm = model.id.toLowerCase();
      const prefIndex = normPreferred.findIndex(
        (pref) => modelIdNorm === pref || modelIdNorm.includes(pref)
      );

      let reason = "Auto-ranked by capability, speed & quality metrics";

      if (prefIndex !== -1) {
        // Boost score proportional to preferred rank
        const boost = (normPreferred.length - prefIndex) * 2.0;
        score += boost;
        reason = `Selected via administrator preferred model ranking (rank ${prefIndex + 1})`;
      }

      return { model, score, reason };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Selects best compatible model.
   */
  public selectBestModel(
    models: ProviderModel[],
    requirements: ModelRequirements = { text: true, json: true },
    preferredList: string[] = []
  ): { model: ProviderModel; result: ModelSelectionResult } | null {
    const t0 = Date.now();
    const compatible = this.filterModels(models, requirements);

    if (compatible.length === 0) {
      return null;
    }

    const ranked = this.rankModels(compatible, preferredList);
    const top = ranked[0];
    const selectionTimeMs = Date.now() - t0;

    return {
      model: top.model,
      result: {
        provider: top.model.provider,
        selectionMode: "AUTO",
        modelId: top.model.id,
        modelDisplayName: top.model.displayName,
        score: parseFloat(top.score.toFixed(3)),
        capabilities: {
          text: top.model.supportsText,
          vision: top.model.supportsVision,
          json: top.model.supportsJson,
          imageGeneration: top.model.supportsImageGeneration,
          structuredOutput: top.model.supportsStructuredOutput,
        },
        selectionReason: top.reason,
        discoveryTimeMs: 0,
        selectionTimeMs,
      },
    };
  }

  public clearCache(): void {
    this.cache.clear();
    this.staleCache.clear();
  }
}

export const modelDiscovery = ModelDiscoveryManager.getInstance();
