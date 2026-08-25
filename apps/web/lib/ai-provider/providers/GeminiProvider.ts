/**
 * Gemini Primary AI Provider with Auto Model Selection
 * =====================================================
 * Discovers available models for the configured API key, capability-filters,
 * ranks, and executes generation with the chosen concrete model ID.
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

export class GeminiProvider implements IAIProvider {
  public readonly id = "GEMINI";
  public readonly name = "Google Gemini (Primary)";

  private getKey(): string | null {
    return process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || null;
  }

  public isConfigured(): boolean {
    return !!this.getKey();
  }

  private getBaseUrl(): string {
    return (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
  }

  /**
   * Discovers all models available to the API key from Gemini's official /models endpoint.
   */
  public async listModels(): Promise<ProviderModel[]> {
    const apiKey = this.getKey();
    if (!apiKey) {
      throw new ProviderAuthenticationError("GEMINI_API_KEY is not configured.", this.id);
    }

    const baseUrl = this.getBaseUrl();

    return modelDiscovery.getOrDiscoverModels(this.id, async () => {
      const discovered: ProviderModel[] = [];
      let nextPageToken = "";
      let pagesFetched = 0;
      const maxPages = 5;

      do {
        pagesFetched += 1;
        const pageQuery = nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : "";
        const endpoint = `${baseUrl}/models?key=${apiKey}&pageSize=50${pageQuery}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
          const res = await fetch(endpoint, {
            method: "GET",
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
          const rawModels = data.models || [];

          for (const m of rawModels) {
            const cleanId = (m.name || "").replace(/^models\//, "");
            if (!cleanId) continue;

            const methods: string[] = m.supportedGenerationMethods || [];
            const supportsText = methods.includes("generateContent") || methods.includes("generateText");
            const supportsJson = supportsText;
            const supportsVision = cleanId.includes("flash") || cleanId.includes("pro") || cleanId.includes("vision");
            const supportsImageGeneration = cleanId.includes("imagen");

            // Scores heuristic based on model tier
            let qualityScore = 0.80;
            let speedScore = 0.85;
            let priorityScore = 0.80;

            if (cleanId.includes("2.0-flash") || cleanId.includes("2.5-flash")) {
              qualityScore = 0.96;
              speedScore = 0.98;
              priorityScore = 0.98;
            } else if (cleanId.includes("1.5-flash")) {
              qualityScore = 0.92;
              speedScore = 0.95;
              priorityScore = 0.92;
            } else if (cleanId.includes("1.5-pro") || cleanId.includes("2.0-pro")) {
              qualityScore = 0.98;
              speedScore = 0.80;
              priorityScore = 0.88;
            } else if (cleanId.includes("gemini-pro")) {
              qualityScore = 0.85;
              speedScore = 0.88;
              priorityScore = 0.80;
            }

            discovered.push({
              id: cleanId,
              provider: this.id,
              displayName: m.displayName || cleanId,
              available: true,
              supportsText,
              supportsVision,
              supportsImageGeneration,
              supportsStructuredOutput: supportsText,
              supportsJson,
              supportsStreaming: true,
              contextWindow: m.inputTokenLimit || 128000,
              inputTokenCost: 0.0,
              outputTokenCost: 0.0,
              qualityScore,
              speedScore,
              priorityScore,
              deprecated: cleanId.includes("deprecated") || cleanId.includes("001"),
              blocked: false,
            });
          }

          nextPageToken = data.nextPageToken || "";
        } catch (err: any) {
          clearTimeout(timeoutId);
          throw classifyProviderError(err, this.id);
        }
      } while (nextPageToken && pagesFetched < maxPages);

      return discovered;
    });
  }

  /**
   * Selects the best compatible model matching requirements.
   */
  public async selectModel(
    requirements: ModelRequirements = { text: true, json: true }
  ): Promise<{ model: ProviderModel; result: ModelSelectionResult }> {
    const configuredModel = (process.env.GEMINI_MODEL || "auto").trim();
    const preferredRaw = process.env.GEMINI_PREFERRED_MODELS || "";
    const preferredList = preferredRaw.split(",").map((s) => s.trim()).filter(Boolean);

    // If explicit concrete model configured (not 'auto')
    if (configuredModel && configuredModel.toLowerCase() !== "auto") {
      const explicitModel: ProviderModel = {
        id: configuredModel,
        provider: this.id,
        displayName: configuredModel,
        available: true,
        supportsText: true,
        supportsVision: true,
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
            vision: true,
            json: true,
            imageGeneration: false,
            structuredOutput: true,
          },
          selectionReason: `Explicitly configured via GEMINI_MODEL="${configuredModel}"`,
          discoveryTimeMs: 0,
          selectionTimeMs: 0,
        },
      };
    }

    // Auto Mode: Discover & Rank
    const models = await this.listModels();
    const selection = modelDiscovery.selectBestModel(models, requirements, preferredList);

    if (!selection) {
      throw new ProviderUnavailableError(
        `No compatible Gemini models found for requirements: ${JSON.stringify(requirements)}`,
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
      throw new ProviderAuthenticationError("GEMINI_API_KEY is not configured.", this.id);
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

    const endpoint = `${baseUrl}/models/${selectedModelId}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Gemini returned empty candidate content.");
      }

      const content = normalizeProviderOutput(rawText, request);
      const usage = {
        inputTokens: data?.usageMetadata?.promptTokenCount || 0,
        outputTokens: data?.usageMetadata?.candidatesTokenCount || 0,
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
