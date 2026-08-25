/**
 * ShortForge / FactoryOS AI Provider & Auto Model Router
 * =======================================================
 * Orchestrates multi-provider failover and intra-provider model fallback
 * with capability-filtering, ranking, health tracking, and secret-free observability.
 */

import { IAIProvider } from "./providers/BaseProvider";
import { GeminiProvider } from "./providers/GeminiProvider";
import { GenericFallbackProvider } from "./providers/GenericFallbackProvider";
import {
  BasicVideoGenerationRequest,
  BasicVideoGenerationResult,
  ProviderAttemptRecord,
  ProviderHealthInfo,
} from "./types";
import {
  ProviderBaseError,
  ProviderUnavailableError,
} from "./errors";
import { healthTracker } from "./health";
import { modelDiscovery } from "./model-discovery";

export class ProviderRouter {
  private static instance: ProviderRouter;
  private providers: Map<string, IAIProvider> = new Map();

  private constructor() {
    this.registerProviders();
  }

  public static getInstance(): ProviderRouter {
    if (!ProviderRouter.instance) {
      ProviderRouter.instance = new ProviderRouter();
    }
    return ProviderRouter.instance;
  }

  private registerProviders(): void {
    // 1. Primary: Gemini
    this.providers.set("GEMINI", new GeminiProvider());

    // 2. Fallback #1
    this.providers.set(
      "FALLBACK_1",
      new GenericFallbackProvider({
        slotId: "FALLBACK_1",
        envPrefix: "FALLBACK_1",
        defaultName: "Groq (Fallback 1)",
        defaultModel: "llama-3.3-70b-versatile",
        defaultBaseUrl: "https://api.groq.com/openai/v1",
      })
    );

    // 3. Fallback #2
    this.providers.set(
      "FALLBACK_2",
      new GenericFallbackProvider({
        slotId: "FALLBACK_2",
        envPrefix: "FALLBACK_2",
        defaultName: "OpenRouter (Fallback 2)",
        defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
        defaultBaseUrl: "https://openrouter.ai/api/v1",
      })
    );

    this.logStartupConfiguration();
  }

  private logStartupConfiguration(): void {
    const isLogging = (process.env.AI_PROVIDER_LOGGING || "true").toLowerCase() === "true";
    if (!isLogging) return;

    for (const [id, provider] of this.providers.entries()) {
      if (provider.isConfigured()) {
        console.log(`[AI Router] ${id} configured (${provider.name})`);
      } else {
        console.log(`[AI Router] ${id} unconfigured (credentials absent in .env)`);
      }
    }
  }

  public getProviderOrder(): string[] {
    const rawOrder = process.env.AI_PROVIDER_ORDER || "GEMINI,FALLBACK_1,FALLBACK_2";
    const primary = process.env.AI_PRIMARY_PROVIDER || "GEMINI";

    const configuredSlots = rawOrder
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => Boolean(s));

    const order = Array.from(new Set([primary.toUpperCase(), ...configuredSlots]));
    return order;
  }

  public async generateContent(
    request: BasicVideoGenerationRequest
  ): Promise<BasicVideoGenerationResult> {
    const order = this.getProviderOrder();
    const timeoutMs = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || "30000", 10);
    const maxRetries = parseInt(process.env.AI_PROVIDER_RETRY_COUNT || "1", 10);
    const cooldownSec = parseInt(process.env.AI_PROVIDER_COOLDOWN_SECONDS || "60", 10);
    const isLogging = (process.env.AI_PROVIDER_LOGGING || "true").toLowerCase() === "true";
    const requirements = request.requiredCapabilities || { text: true, json: true };

    const allAttempts: ProviderAttemptRecord[] = [];
    let lastError: any = null;

    if (isLogging) {
      console.log(`[AI Router] Starting BASIC generation topic="${request.topic.slice(0, 40)}..." order=[${order.join(" -> ")}]`);
    }

    for (const slotId of order) {
      const provider = this.providers.get(slotId);
      if (!provider) continue;

      if (!provider.isConfigured()) {
        if (isLogging) {
          console.log(`[AI Router] Provider=${slotId} skipped (not configured)`);
        }
        allAttempts.push({
          provider: slotId,
          status: "failed",
          reason: "unconfigured",
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Check provider health / cooldown
      const { available, reason } = healthTracker.isAvailable(slotId);
      if (!available) {
        if (isLogging) {
          console.log(`[AI Router] Provider=${slotId} skipped (${reason})`);
        }
        allAttempts.push({
          provider: slotId,
          status: "cooldown",
          reason: reason || "cooldown",
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Step 1: Model Discovery & Ranking for this Provider
      let rankedModels: Array<{ id: string; name: string }> = [];
      try {
        const rawModels = await provider.listModels();
        const preferredEnv = process.env[`${slotId}_PREFERRED_MODELS`] || "";
        const preferredList = preferredEnv.split(",").map((s) => s.trim()).filter(Boolean);

        const compatible = modelDiscovery.filterModels(rawModels, requirements);
        const ranked = modelDiscovery.rankModels(compatible, preferredList);

        rankedModels = ranked.map((r) => ({ id: r.model.id, name: r.model.displayName }));

        if (isLogging) {
          console.log(`[AI Model Router] provider=${slotId} discovered=${rawModels.length} compatible=${compatible.length} topModel=${rankedModels[0]?.id || "none"}`);
        }
      } catch (discErr: any) {
        if (isLogging) {
          console.warn(`[AI Model Router] Model discovery for ${slotId} failed (${discErr.message}), using default model`);
        }
      }

      // If discovery returned no models or failed, use single default attempt
      if (rankedModels.length === 0) {
        rankedModels = [{ id: "auto", name: "Default" }];
      }

      // Step 2: Intra-Provider Model Fallback Loop
      let slotSucceeded = false;

      for (let modelIdx = 0; modelIdx < rankedModels.length; modelIdx++) {
        const currentModel = rankedModels[modelIdx];
        let attemptCount = 0;

        if (isLogging && rankedModels.length > 1) {
          console.log(`[AI Model Router] provider=${slotId} trying model=${currentModel.id} (${modelIdx + 1}/${rankedModels.length})`);
        }

        while (attemptCount <= maxRetries && !slotSucceeded) {
          attemptCount += 1;
          const startTime = Date.now();

          try {
            const slotResult = await provider.generate(request, currentModel.id, { timeoutMs });
            const latencyMs = Date.now() - startTime;

            healthTracker.recordSuccess(slotId);
            slotSucceeded = true;

            if (isLogging) {
              console.log(`[AI Router] Provider=${slotId} model=${currentModel.id} result=success latency=${latencyMs}ms`);
            }

            allAttempts.push({
              provider: slotId,
              model: currentModel.id,
              status: "success",
              latencyMs,
              timestamp: new Date().toISOString(),
            });

            return {
              ...slotResult,
              providerAttempts: allAttempts,
            };
          } catch (err: any) {
            const latencyMs = Date.now() - startTime;
            const errorReason = err instanceof ProviderBaseError ? err.code : err?.name || "ERROR";
            lastError = err;

            if (isLogging) {
              console.log(`[AI Router] Provider=${slotId} model=${currentModel.id} attempt=${attemptCount} result=${errorReason} message="${err?.message?.slice(0, 80)}"`);
            }

            const isLastAttemptForModel = attemptCount > maxRetries || !err?.retryable;

            if (isLastAttemptForModel) {
              allAttempts.push({
                provider: slotId,
                model: currentModel.id,
                status: "failed",
                reason: errorReason,
                latencyMs,
                timestamp: new Date().toISOString(),
              });
              break; // Try next model for this provider
            } else {
              // Retry on same model
              await new Promise((r) => setTimeout(r, 600));
            }
          }
        }

        if (slotSucceeded) break;
      }

      // If all models within this provider failed, record provider failure and cooldown
      if (!slotSucceeded) {
        healthTracker.recordFailure(slotId, lastError?.message || "All models failed", cooldownSec);
      }
    }

    // All providers exhausted
    console.error(`[AI Router] All providers and models exhausted for topic="${request.topic.slice(0, 40)}...".`);
    throw new ProviderUnavailableError(
      "AI generation is temporarily unavailable. Please try again later.",
      "ALL_PROVIDERS"
    );
  }

  public getHealthReport(): ProviderHealthInfo[] {
    const report: ProviderHealthInfo[] = [];
    for (const [id, provider] of this.providers.entries()) {
      report.push(healthTracker.getHealth(id, provider.isConfigured()));
    }
    return report;
  }
}

export const providerRouter = ProviderRouter.getInstance();

export async function generateBasicVideoContent(
  request: BasicVideoGenerationRequest
): Promise<BasicVideoGenerationResult> {
  return providerRouter.generateContent(request);
}
