import {
  ModelMeta,
  ProviderHealthMetrics,
  PluginManifest,
  AIProviderRegistry,
  AICapability,
} from "../capability-registry";
import { BaseProviderPlugin } from "./base-provider";

export class ZAIProviderPlugin extends BaseProviderPlugin {
  id = "zai";
  name = "Z.AI Provider";

  manifest: PluginManifest = {
    id: "zai",
    name: "Z.AI Provider",
    version: "1.0.0",
    author: "ShortFactory Core Team",
    description: "Provider plugin routing requests to Z.AI GLM inference engines",
    dependencies: [],
    capabilities: ["SCRIPT"],
  };

  protected apiKey = process.env.ZAI_API_KEY || "";
  protected baseUrl = process.env.ZAI_BASE_URL || "https://api.z.ai/api/paas/v4";

  constructor() {
    super();
    this.setupAdapters();
  }

  private setupAdapters() {
    this.chatAdapter = {
      id: "zai-chat",
      generateText: async (params, signal) => {
        const rawModelName = params.model || "glm-4.7-flash";
        const modelName = rawModelName.replace("zai/", "");

        const messages = [];
        if (params.system) {
          messages.push({ role: "system", content: params.system });
        }
        messages.push({ role: "user", content: params.prompt });

        const body: any = {
          model: modelName,
          messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2048,
          stream: false,
        };

        if (params.responseFormat === "json_object") {
          body.response_format = { type: "json_object" };
        }

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Z.AI API returned status ${res.status}: ${errText}`);
        }

        this.updateRateLimitMetrics(res.headers);

        const data: any = await res.json();
        const text = data?.choices?.[0]?.message?.content || "";
        const usage = data?.usage || {
          prompt_tokens: Math.round(params.prompt.length / 4),
          completion_tokens: Math.round(text.length / 4),
        };

        return {
          text,
          usage: {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
          },
        };
      },
    };
  }

  async authenticateGuard(): Promise<void> {
    if (!this.apiKey) {
      this.metrics.state = "AUTH FAILED";
      throw new Error("Z.AI Provider: ZAI_API_KEY is not configured in process environment.");
    }
  }

  async discoverModels(): Promise<ModelMeta[]> {
    return [
      {
        id: "zai/glm-4.7-flash",
        name: "GLM 4.7 Flash (Z.AI)",
        provider: "zai",
        capabilities: ["SCRIPT"],
        contextWindow: 128000,
        costInput: 0.0,
        costOutput: 0.0,
        speed: 120,
        health: 1.0,
        availability: true,
        isLocal: false,
        tags: ["zai", "fast", "json"],
      },
    ];
  }
}

// Auto-register plugin
export const zaiProvider = new ZAIProviderPlugin();
AIProviderRegistry.registerPlugin(zaiProvider);
