/**
 * Generic OpenAI-Compatible Fallback AI Provider with Auto Model Selection
 * ========================================================================
 * Discovers models via /models, capability-checks, scores, and executes requests.
 */

import { IAIProvider, ProviderExecutionOptions } from "./BaseProvider";
import {
  BasicVideoGenerationRequest,
  BasicVideoGenerationResult,
  ProviderModel,
  ModelRequirements,
  ModelSelectionResult,
} from "../types";
import { classifyProviderError, ProviderAuthenticationError, ProviderUnavailableError } from "../errors";
import { buildSystemPrompt, buildUserPrompt, normalizeProviderOutput } from "../prompt-builder";
import { modelDiscovery } from "../model-discovery";

export interface FallbackProviderConfig {
  slotId: "FALLBACK_1" | "FALLBACK_2";
  envPrefix: "FALLBACK_1" | "FALLBACK_2";
  defaultName: string;
  defaultModel: string;
  defaultBaseUrl: string;
}

export class GenericFallbackProvider implements IAIProvider {
  public readonly id: string;
  public readonly name: string;
  private envPrefix: string;
  private defaultModel: string;
  private defaultBaseUrl: string;

  constructor(config: FallbackProviderConfig) {
    this.id = config.slotId;
    this.envPrefix = config.envPrefix;
    this.defaultModel = config.defaultModel;
    this.defaultBaseUrl = config.defaultBaseUrl;
    this.name = process.env[`${this.envPrefix}_NAME`] || config.defaultName;
  }

  private getKey(): string | null {
    return process.env[`${this.envPrefix}_API_KEY`] || null;
  }

  public isConfigured(): boolean {
    const enabled = process.env[`${this.envPrefix}_ENABLED`];
    if (enabled !== undefined && enabled.toLowerCase() === "false") {
      return false;
    }
    return !!this.getKey();
  }

  private getBaseUrl(): string {
    return (process.env[`${this.envPrefix}_BASE_URL`] || this.defaultBaseUrl).replace(/\/+$/, "");
  }

  public async listModels(): Promise<ProviderModel[]> {
    const apiKey = this.getKey();
    if (!apiKey) {
      throw new ProviderAuthenticationError(`${this.envPrefix}_API_KEY is not configured.`, this.id);
    }

    const baseUrl = this.getBaseUrl();

    return modelDiscovery.getOrDiscoverModels(this.id, async () => {
      const endpoint = `${baseUrl}/models`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
        };
        if (baseUrl.includes("openrouter.ai")) {
          headers["HTTP-Referer"] = "https://shortforge.internal";
          headers["X-Title"] = "ShortForge FactoryOS";
        }

        const res = await fetch(endpoint, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          let errBody: any = null;
          try {
            errBody = await res.json();
          } catch {}
          const msg = errBody?.error?.message || `HTTP ${res.status}`;
          throw classifyProviderError({ message: msg, status: res.status }, this.id);
        }

        const data = await res.json();
        const rawModels: any[] = data.data || data.models || [];
        const discovered: ProviderModel[] = [];

        for (const m of rawModels) {
          const id = m.id || m.name;
          if (!id) continue;

          const idLower = id.toLowerCase();
          // Filter out embeddings / tts / audio-only
          if (idLower.includes("embed") || idLower.includes("whisper") || idLower.includes("dall-e") || idLower.includes("tts")) {
            continue;
          }

          const supportsVision = idLower.includes("vision") || idLower.includes("vl") || idLower.includes("4o") || idLower.includes("gemini");
          const supportsText = true;
          const supportsJson = true;

          // Scores heuristic based on model size & architecture
          let qualityScore = 0.85;
          let speedScore = 0.90;
          let priorityScore = 0.80;

          if (idLower.includes("70b") || idLower.includes("deepseek-v3") || idLower.includes("deepseek-r1")) {
            qualityScore = 0.95;
            speedScore = 0.92;
            priorityScore = 0.95;
          } else if (idLower.includes("8b") || idLower.includes("mini") || idLower.includes("flash")) {
            qualityScore = 0.85;
            speedScore = 0.98;
            priorityScore = 0.85;
          } else if (idLower.includes("free")) {
            qualityScore = 0.88;
            speedScore = 0.88;
            priorityScore = 0.90;
          }

          discovered.push({
            id,
            provider: this.id,
            displayName: m.name || id,
            available: true,
            supportsText,
            supportsVision,
            supportsImageGeneration: false,
            supportsStructuredOutput: true,
            supportsJson,
            supportsStreaming: true,
            contextWindow: m.context_length || 128000,
            inputTokenCost: 0,
            outputTokenCost: 0,
            qualityScore,
            speedScore,
            priorityScore,
            deprecated: false,
            blocked: false,
          });
        }

        return discovered;
      } catch (err: any) {
        clearTimeout(timeoutId);
        throw classifyProviderError(err, this.id);
      }
    });
  }

  public async selectModel(
    requirements: ModelRequirements = { text: true, json: true }
  ): Promise<{ model: ProviderModel; result: ModelSelectionResult }> {
    const configuredModel = (process.env[`${this.envPrefix}_MODEL`] || "auto").trim();
    const preferredRaw = process.env[`${this.envPrefix}_PREFERRED_MODELS`] || "";
    const preferredList = preferredRaw.split(",").map((s) => s.trim()).filter(Boolean);

    if (configuredModel && configuredModel.toLowerCase() !== "auto") {
      const explicitModel: ProviderModel = {
        id: configuredModel,
        provider: this.id,
        displayName: configuredModel,
        available: true,
        supportsText: true,
        supportsVision: false,
        supportsImageGeneration: false,
        supportsStructuredOutput: true,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 128000,
        inputTokenCost: 0,
        outputTokenCost: 0,
        qualityScore: 0.9,
        speedScore: 0.9,
        priorityScore: 1.0,
        deprecated: false,
        blocked: false,
      };

      return {
        model: explicitModel,
        result: {
          provider: this.id,
          selectionMode: "EXPLICIT",
          modelId: configuredModel,
          modelDisplayName: configuredModel,
          score: 1.0,
          capabilities: {
            text: true,
            vision: false,
            json: true,
            imageGeneration: false,
            structuredOutput: true,
          },
          selectionReason: `Explicitly configured via ${this.envPrefix}_MODEL="${configuredModel}"`,
          discoveryTimeMs: 0,
          selectionTimeMs: 0,
        },
      };
    }

    const models = await this.listModels();
    const selection = modelDiscovery.selectBestModel(models, requirements, preferredList);

    if (!selection) {
      throw new ProviderUnavailableError(
        `No compatible models found for ${this.name} with requirements: ${JSON.stringify(requirements)}`,
        this.id
      );
    }

    return selection;
  }

  public async generate(
    request: BasicVideoGenerationRequest,
    modelInput?: ProviderModel | string,
    options: ProviderExecutionOptions = {}
  ): Promise<BasicVideoGenerationResult> {
    const apiKey = this.getKey();
    if (!apiKey) {
      throw new ProviderAuthenticationError(`${this.envPrefix}_API_KEY is not configured.`, this.id);
    }

    const baseUrl = this.getBaseUrl();
    const timeoutMs = options.timeoutMs || parseInt(process.env.AI_REQUEST_TIMEOUT_MS || "30000", 10);

    let selectedModelId = "";
    let selectionInfo: ModelSelectionResult | undefined = undefined;

    if (typeof modelInput === "string" && modelInput !== "auto") {
      selectedModelId = modelInput;
    } else if (modelInput && typeof modelInput === "object") {
      selectedModelId = modelInput.id;
    } else {
      const selection = await this.selectModel(request.requiredCapabilities || { text: true, json: true });
      selectedModelId = selection.model.id;
      selectionInfo = selection.result;
    }

    const systemPrompt = buildSystemPrompt(request);
    const userPrompt = buildUserPrompt(request);

    const endpoint = `${baseUrl}/chat/completions`;

    const payload: any = {
      model: selectedModelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    };

    if (baseUrl.includes("groq.com") || baseUrl.includes("openrouter.ai") || baseUrl.includes("openai.com")) {
      payload.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };

      if (baseUrl.includes("openrouter.ai")) {
        headers["HTTP-Referer"] = "https://shortforge.internal";
        headers["X-Title"] = "ShortForge FactoryOS";
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        let errBody: any = null;
        try {
          errBody = await response.json();
        } catch {}
        const errorMsg = errBody?.error?.message || response.statusText || `HTTP ${response.status}`;
        throw classifyProviderError({ message: errorMsg, status: response.status }, this.id);
      }

      const data = await response.json();
      const rawText = data?.choices?.[0]?.message?.content;

      if (!rawText) {
        throw new Error(`${this.name} returned empty choice content.`);
      }

      const content = normalizeProviderOutput(rawText, request);
      const usage = {
        inputTokens: data?.usage?.prompt_tokens || 0,
        outputTokens: data?.usage?.completion_tokens || 0,
        durationMs,
      };

      return {
        success: true,
        provider: this.id,
        model: selectedModelId,
        selectionMode: selectionInfo ? selectionInfo.selectionMode : "AUTO",
        content,
        usage,
        providerAttempts: [
          {
            provider: this.id,
            model: selectedModelId,
            status: "success",
            latencyMs: durationMs,
          },
        ],
        modelSelectionInfo: selectionInfo,
      };
    } catch (err: any) {
      throw classifyProviderError(err, this.id);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
