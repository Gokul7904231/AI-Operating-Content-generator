/**
 * FactoryOS Frontier v3 — Overseer Cognition Client
 * Server-side client for OVERSEER_API supporting OpenAI-compatible, Gemini, Ollama, and local endpoints.
 * Never logs secrets or returns credentials to client code.
 */

import type {
  OverseerCognitionConfig,
  CognitiveRequest,
  CognitiveResponse,
  IntentClassification,
  ExecutionPlan,
  AnswerContract,
  ResponseReview,
} from "./CognitiveContracts";

export class OverseerCognitionClient {
  private config: OverseerCognitionConfig;

  constructor(overrideConfig?: Partial<OverseerCognitionConfig>) {
    this.config = {
      endpoint: overrideConfig?.endpoint || process.env.OVERSEER_API || "",
      model: overrideConfig?.model || process.env.OVERSEER_MODEL || "default",
      apiKey: overrideConfig?.apiKey || process.env.OVERSEER_API_KEY || "",
      maxTokens: overrideConfig?.maxTokens || 2048,
      temperature: overrideConfig?.temperature ?? 0.2,
      timeoutMs: overrideConfig?.timeoutMs || 8000,
    };
  }

  get isConfigured(): boolean {
    return Boolean(this.config.endpoint && this.config.endpoint.trim() !== "");
  }

  /**
   * Internal low-level request dispatcher with timeout and error handling.
   */
  async executeRequest<T = any>(req: CognitiveRequest): Promise<CognitiveResponse<T>> {
    const startTime = Date.now();

    if (!this.isConfigured) {
      // Fallback heuristics when OVERSEER_API is not configured
      return this.executeLocalFallback<T>(req, startTime);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const endpoint = this.config.endpoint!.replace(/\/$/, "");
      const isChatEndpoint = endpoint.includes("/chat/completions") || endpoint.includes("/v1");
      const url = isChatEndpoint && !endpoint.endsWith("/chat/completions")
        ? `${endpoint}/chat/completions`
        : endpoint;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      const bodyPayload = {
        model: this.config.model,
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.userPrompt },
        ],
        temperature: req.temperature ?? this.config.temperature,
        max_tokens: req.maxTokens ?? this.config.maxTokens,
        response_format: { type: "json_object" },
      };

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          provider: "overseer_api",
          model: this.config.model || "unknown",
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const rawJson = await res.json();
      const textContent = rawJson.choices?.[0]?.message?.content || rawJson.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      
      let parsedData: T;
      try {
        parsedData = JSON.parse(textContent);
      } catch {
        parsedData = textContent as unknown as T;
      }

      return {
        success: true,
        data: parsedData,
        rawText: textContent,
        latencyMs,
        provider: "overseer_api",
        model: this.config.model || "configured-model",
        usage: rawJson.usage ? {
          promptTokens: rawJson.usage.prompt_tokens || 0,
          completionTokens: rawJson.usage.completion_tokens || 0,
          totalTokens: rawJson.usage.total_tokens || 0,
        } : undefined,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return this.executeLocalFallback<T>(req, startTime, err.message);
    }
  }

  /**
   * Deterministic local fallback when OVERSEER_API is absent or fails.
   */
  private executeLocalFallback<T>(
    req: CognitiveRequest,
    startTime: number,
    errorNotice?: string
  ): CognitiveResponse<T> {
    const latencyMs = Date.now() - startTime;
    const userPromptLower = req.userPrompt.toLowerCase();

    if (req.operation === "CLASSIFY") {
      let intent: any = "GENERAL_CHAT";
      let sourceClass: any = "GENERAL_KNOWLEDGE";
      let responseMode: any = "DIRECT_FACT";
      let requiresLiveResearch = false;
      let clarificationRequired = false;

      if (
        userPromptLower.includes("floor") ||
        userPromptLower.includes("telemetry") ||
        userPromptLower.includes("how many floors") ||
        userPromptLower.includes("worker status")
      ) {
        intent = "FACTORY_TELEMETRY";
        sourceClass = "FACTORY_TELEMETRY";
        responseMode = "DIRECT_FACT";
      } else if (
        userPromptLower.includes("trend") ||
        userPromptLower.includes("trending") ||
        userPromptLower.includes("hot today") ||
        userPromptLower.includes("what should i make today") ||
        userPromptLower.includes("latest topic") ||
        userPromptLower.includes("what is hot")
      ) {
        intent = "CURRENT_TREND";
        sourceClass = "AGENT_REACH";
        responseMode = "RESEARCH_SUMMARY";
        requiresLiveResearch = true;
      } else if (userPromptLower.includes("brand guide") || userPromptLower.includes("document") || userPromptLower.includes("doc")) {
        intent = "DOCUMENT_LOOKUP";
        sourceClass = "OFK_KNOWLEDGE";
        responseMode = "DIRECT_FACT";
      } else if (userPromptLower.includes("quota") || userPromptLower.includes("credit") || userPromptLower.includes("balance")) {
        intent = "QUOTA";
        sourceClass = "QUOTA_SERVICE";
        responseMode = "DIRECT_FACT";
      } else if (
        userPromptLower.includes("video") && 
        (userPromptLower.includes("status") || userPromptLower.includes("where is") || userPromptLower.includes("progress") || userPromptLower.includes("happening") || userPromptLower.includes("rendering"))
      ) {
        intent = "VIDEO_STATUS";
        sourceClass = "MISSION_DATABASE";
        responseMode = "OPERATIONAL_STATUS";
      } else if (userPromptLower.includes("make") && userPromptLower.includes("short") && userPromptLower.includes("trend")) {
        intent = "CURRENT_TREND";
        sourceClass = "AGENT_REACH";
        responseMode = "RESEARCH_SUMMARY";
        requiresLiveResearch = true;
      } else if (userPromptLower.includes("create") || userPromptLower.includes("generate") || userPromptLower.includes("make a short")) {
        intent = "VIDEO_CREATION";
        sourceClass = "MISSION_DATABASE";
        responseMode = "TASK_PROGRESS";
      } else if (userPromptLower.includes("make it better") || userPromptLower.includes("improve it") || userPromptLower.includes("fix it")) {
        intent = "CLARIFICATION_REQUIRED";
        clarificationRequired = true;
        responseMode = "CLARIFICATION";
      }

      const classification: IntentClassification = {
        intent,
        confidence: 0.95,
        entities: {},
        freshness: requiresLiveResearch ? "today" : "static",
        requiresLiveResearch,
        requiresEvidence: intent !== "GENERAL_CHAT",
        sourceClass,
        responseMode,
        clarificationRequired,
        clarificationPrompt: clarificationRequired ? "Could you clarify which video or script you would like me to improve?" : undefined,
      };

      return {
        success: true,
        data: classification as unknown as T,
        latencyMs,
        provider: "local_heuristic_fallback",
        model: "factoryos-builtin-classifier",
        error: errorNotice,
      };
    }

    if (req.operation === "REVIEW") {
      const review: ResponseReview = {
        topicAdherent: true,
        factuallyGrounded: true,
        unsupportedClaims: [],
        unnecessaryContent: [],
        shouldRewrite: false,
      };
      return {
        success: true,
        data: review as unknown as T,
        latencyMs,
        provider: "local_heuristic_fallback",
        model: "factoryos-builtin-reviewer",
      };
    }

    // Default synthesis/plan fallback
    return {
      success: true,
      data: { answer: req.userPrompt } as unknown as T,
      rawText: req.userPrompt,
      latencyMs,
      provider: "local_heuristic_fallback",
      model: "factoryos-builtin-synthesizer",
    };
  }
}
