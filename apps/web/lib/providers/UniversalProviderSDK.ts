import { BaseProviderPlugin } from "../../ai/providers/base-provider";
import { PluginManifest, ModelMeta, AICapability, AIProviderRegistry } from "../../ai/capability-registry";
import { decrypt } from "./crypto";

export interface UniversalProviderConfig {
  id: string;
  name: string;
  apiKey: string; // Will be decrypted on initialization
  baseUrl: string;
  modelEndpoint?: string;
  optionalHeaders?: Record<string, string>;
  capabilities?: AICapability[];
  staticModels?: ModelMeta[];
}

export class UniversalProviderPlugin extends BaseProviderPlugin {
  id: string;
  name: string;
  manifest: PluginManifest;
  protected apiKey: string;
  protected baseUrl: string;
  private modelEndpoint: string;
  private optionalHeaders: Record<string, string>;
  private staticModels: ModelMeta[];

  constructor(config: UniversalProviderConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.apiKey = decrypt(config.apiKey);
    this.baseUrl = config.baseUrl;
    this.modelEndpoint = config.modelEndpoint || "/chat/completions";
    this.optionalHeaders = config.optionalHeaders || {};
    this.staticModels = config.staticModels || [];

    this.manifest = {
      id: this.id,
      name: this.name,
      version: "1.0.0",
      author: "ShortFactory User Provider Plugin",
      description: `Universal provider plugin for ${this.name}`,
      dependencies: [],
      capabilities: config.capabilities || ["SCRIPT"],
    };

    this.setupAdapters();
  }

  private setupAdapters() {
    this.chatAdapter = {
      id: `${this.id}-chat`,
      generateText: async (params, signal) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...this.optionalHeaders,
        };

        if (this.apiKey) {
          headers["Authorization"] = `Bearer ${this.apiKey}`;
        }

        const messages: any[] = [];
        if (params.system) {
          messages.push({ role: "system", content: params.system });
        }
        messages.push({ role: "user", content: params.prompt });

        const body: any = {
          model: params.model?.replace(`${this.id}/`, "") || "default",
          messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2048,
        };

        if (params.responseFormat === "json_object") {
          body.response_format = { type: "json_object" };
        }

        const cleanBaseUrl = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
        const cleanEndpoint = this.modelEndpoint.startsWith("/") ? this.modelEndpoint : `/${this.modelEndpoint}`;

        const res = await fetch(`${cleanBaseUrl}${cleanEndpoint}`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Universal provider ${this.id} API returned status ${res.status}: ${errText}`);
        }

        // Try parsing rate limit headers safely
        try {
          this.updateRateLimitMetrics(res.headers);
        } catch {}

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
    // If no key is set, we bypass or rely on standard auth
  }

  async discoverModels(): Promise<ModelMeta[]> {
    if (this.staticModels.length > 0) {
      return this.staticModels;
    }

    try {
      const cleanBase = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
      const headers: Record<string, string> = { ...this.optionalHeaders };
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const res = await fetch(`${cleanBase}/models`, { headers, timeout: 5000 } as any);
      if (res.ok) {
        const data: any = await res.json();
        const modelsList = Array.isArray(data) ? data : data?.data || [];
        return modelsList.map((m: any) => ({
          id: `${this.id}/${m.id || m}`,
          name: m.name || m.id || m,
          provider: this.id,
          capabilities: ["SCRIPT"],
          contextWindow: 32768,
          costInput: 0.15,
          costOutput: 0.60,
          speed: 80,
          health: 1.0,
          availability: true,
          isLocal: false,
        }));
      }
    } catch {}

    // Dynamic model fallback
    return [
      {
        id: `${this.id}/default-model`,
        name: `${this.name} Default Model`,
        provider: this.id,
        capabilities: ["SCRIPT"],
        contextWindow: 16384,
        costInput: 0.15,
        costOutput: 0.60,
        speed: 80,
        health: 1.0,
        availability: true,
        isLocal: false,
      },
    ];
  }
}

class UniversalProviderSDKClass {
  async register(config: UniversalProviderConfig) {
    const plugin = new UniversalProviderPlugin(config);
    AIProviderRegistry.registerPlugin(plugin);
    console.log(`[UniversalProviderSDK] Dynamic provider "${config.name}" successfully loaded and registered.`);
    return plugin;
  }
}

export const UniversalProviderSDK = new UniversalProviderSDKClass();
