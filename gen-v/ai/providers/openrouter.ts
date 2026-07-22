import {
  ModelMeta,
  ProviderHealthMetrics,
  PluginManifest,
  AIProviderRegistry,
  AICapability,
} from "../capability-registry";
import { BaseProviderPlugin } from "./base-provider";

export class OpenRouterProviderPlugin extends BaseProviderPlugin {
  id = "openrouter";
  name = "OpenRouter Provider";

  manifest: PluginManifest = {
    id: "openrouter",
    name: "OpenRouter Provider",
    version: "1.0.0",
    author: "ShortFactory Core Team",
    description: "Provider plugin routing requests dynamically via OpenRouter API models",
    dependencies: [],
    capabilities: ["SCRIPT", "VISION"],
  };

  protected apiKey = process.env.OPENROUTER_API_KEY || "";
  protected baseUrl = "https://openrouter.ai/api/v1";

  // Discovery cache
  private cachedModels: ModelMeta[] = [];
  private lastDiscovery = 0;
  private cacheTtl = 86400000; // 24h dynamic cache

  constructor() {
    super();
    this.setupAdapters();
  }

  private setupAdapters() {
    // 1. OpenRouter chat completion adapter
    this.chatAdapter = {
      id: "openrouter-chat",
      generateText: async (params, signal) => {
        const rawModelName = params.model || "meta-llama/llama-3.1-8b-instruct";
        const modelName = rawModelName.startsWith("openrouter/")
          ? rawModelName.replace("openrouter/", "")
          : rawModelName;

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
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "ShortFactory",
          },
          body: JSON.stringify(body),
          signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`OpenRouter API returned status ${res.status}: ${errText}`);
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

    // 2. OpenRouter Vision completions
    this.visionAdapter = {
      id: "openrouter-vision",
      analyzeImage: async (params, signal) => {
        const messages = [
          {
            role: "user",
            content: [
              { type: "text", text: params.prompt },
              {
                type: "image_url",
                image_url: { url: params.imageUrl },
              },
            ],
          },
        ];

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "ShortFactory",
          },
          body: JSON.stringify({
            model: "google/gemini-flash-1.5", // default vision model on OpenRouter
            messages,
            stream: false,
          }),
          signal,
        });

        if (!res.ok) {
          throw new Error(`OpenRouter Vision API call failed with status ${res.status}`);
        }

        const data: any = await res.json();
        const text = data?.choices?.[0]?.message?.content || "";
        const usage = data?.usage || { prompt_tokens: 0, completion_tokens: 0 };

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
      throw new Error("OpenRouter Provider: OPENROUTER_API_KEY is not configured in process environment.");
    }
  }

  /**
   * Dynamically query and normalize OpenRouter model listings.
   * Auto-tags capability indicators instead of maintaining lists by hand.
   */
  async discoverModels(): Promise<ModelMeta[]> {
    if (!this.apiKey) return [];

    const now = Date.now();
    if (this.cachedModels.length > 0 && now - this.lastDiscovery < this.cacheTtl) {
      return this.cachedModels;
    }

    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch models from OpenRouter: ${res.status}`);
      }

      const data: any = await res.json();
      const models = data?.data || [];
      const discovered: ModelMeta[] = [];

      for (const m of models) {
        // Enforce capabilities based on context lengths and dynamic tags
        const capabilities: AICapability[] = ["SCRIPT"];
        const idLower = m.id.toLowerCase();
        
        if (idLower.includes("vision") || idLower.includes("gemini") || idLower.includes("gpt-4o")) {
          capabilities.push("VISION");
        }

        // Auto pricing calculations (per 1M tokens)
        const costInput = parseFloat(m.pricing?.prompt || "0.0") * 1000000;
        const costOutput = parseFloat(m.pricing?.completion || "0.0") * 1000000;

        discovered.push({
          id: `openrouter/${m.id}`,
          name: m.name || m.id,
          provider: "openrouter",
          capabilities,
          contextWindow: m.context_length || 4096,
          costInput,
          costOutput,
          speed: idLower.includes("flash") || idLower.includes("groq") ? 90 : 35,
          health: 1.0,
          availability: true,
          isLocal: false,
          tags: ["openrouter", idLower.includes("free") ? "free" : "paid"],
        });
      }

      // Filter: keep current stable / popular models  
      const priorityModels = ["claude-3-5-sonnet", "gpt-4o", "gemini-flash-1.5", "llama-3.1-8b-instruct", "deepseek-coder", "deepseek-r1"];
      this.cachedModels = discovered.filter((m) => 
        priorityModels.some((p) => m.id.toLowerCase().includes(p))
      );
      // If no matches, return first 10 discovered models
      if (this.cachedModels.length === 0) {
        this.cachedModels = discovered.slice(0, 10);
      }
      
      this.lastDiscovery = now;
      this.metrics.state = "ONLINE";
      return this.cachedModels;

    } catch (e) {
      console.warn("[OpenRouter] Model discovery failed, returning cached/default items.", e);
      return this.cachedModels;
    }
  }
}

// Auto-register plugin
export const openRouterProvider = new OpenRouterProviderPlugin();
AIProviderRegistry.registerPlugin(openRouterProvider);
