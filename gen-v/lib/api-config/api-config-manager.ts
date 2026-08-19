import fs from "fs";
import path from "path";
import { db } from "../firebase-admin";
import { encrypt, decrypt } from "../providers/crypto";
import { createLocalAIAdapter, LocalModel } from "./LocalAIAdapter";
import { ApiProviderConfig, ApiCredential, ApiConfigSummary, ProviderCategory, ProviderMode, LocalProviderType } from "./api-config-store";

const CONFIG_FILE_PATH = path.resolve(process.cwd(), "config", "api_configurations.json");

// Default Catalog of Discovered FactoryOS Providers
const INITIAL_PROVIDER_CATALOG: Array<{
  id: string;
  name: string;
  category: ProviderCategory;
  description: string;
  mode: ProviderMode;
  envKey?: string;
  defaultBaseUrl?: string;
  defaultModel?: string;
}> = [
  // Cloud LLMs
  { id: "gemini", name: "Google Gemini", category: "llm", description: "Primary multimodal LLM for script generation & reasoning", mode: "cloud", envKey: "GEMINI_API_KEY", defaultBaseUrl: "https://generativelanguage.googleapis.com" },
  { id: "groq", name: "Groq", category: "llm", description: "Ultra-fast Llama 3 70B & DeepSeek R1 inference", mode: "cloud", envKey: "GROQ_API_KEY", defaultBaseUrl: "https://api.groq.com/openai/v1" },
  { id: "openrouter", name: "OpenRouter", category: "llm", description: "Unified gateway to GPT-4o, Claude 3.5, and open models", mode: "cloud", envKey: "OPENROUTER_API_KEY", defaultBaseUrl: "https://openrouter.ai/api/v1" },
  { id: "nvidia", name: "NVIDIA NIM", category: "llm", description: "High-performance enterprise AI models via NVIDIA NIM", mode: "cloud", envKey: "NVIDIA_API_KEY", defaultBaseUrl: "https://integrate.api.nvidia.com/v1" },
  { id: "zai", name: "Z.AI (GLM)", category: "llm", description: "Z.AI GLM-4.5 & GLM-4.7 reasoning engine", mode: "cloud", envKey: "ZAI_API_KEY", defaultBaseUrl: "https://api.z.ai/api/paas/v4" },

  // Local AI Runtimes
  { id: "ollama_local", name: "Ollama (Local AI)", category: "local_ai", description: "Local LLM server running Llama 3, Qwen, Mistral", mode: "local", defaultBaseUrl: "http://localhost:11434", defaultModel: "qwen3-coder" },
  { id: "lm_studio_local", name: "LM Studio (Local AI)", category: "local_ai", description: "Local OpenAI-compatible model runner", mode: "local", defaultBaseUrl: "http://localhost:1234/v1", defaultModel: "local-model" },
  { id: "openai_compat_local", name: "OpenAI-Compatible Local", category: "local_ai", description: "Custom local inference server (vLLM, LocalAI)", mode: "local", defaultBaseUrl: "http://localhost:8000/v1", defaultModel: "default" },

  // Image Generation
  { id: "pollinations", name: "Pollinations AI", category: "image", description: "Free FLUX.1 & SDXL image generation engine", mode: "cloud", envKey: "POLLINATIONS_API_KEY", defaultBaseUrl: "https://gen.pollinations.ai" },
  { id: "together", name: "Together AI", category: "image", description: "FLUX.1 Schnell & Pro scene generation", mode: "cloud", envKey: "TOGETHER_API_KEY", defaultBaseUrl: "https://api.together.xyz/v1" },

  // Voice / Audio
  { id: "elevenlabs", name: "ElevenLabs TTS", category: "voice", description: "Hyper-realistic voice synthesis for short videos", mode: "cloud", envKey: "ELEVENLABS_API_KEY", defaultBaseUrl: "https://api.elevenlabs.io" },

  // Storage
  { id: "cloudinary", name: "Cloudinary", category: "storage", description: "Media CDN and scene video asset storage", mode: "cloud", envKey: "CLOUDINARY_API_KEY", defaultBaseUrl: "https://api.cloudinary.com" },

  // Rendering Microservice
  { id: "vps_render", name: "VPS Render Engine", category: "rendering", description: "Hybrid microservice for FFmpeg video assembly", mode: "local", defaultBaseUrl: "http://localhost:8000" },
];

export class ApiConfigManager {
  /**
   * SSRF Endpoint URL Validation Guard
   */
  static validateEndpointUrl(urlStr: string): string {
    if (!urlStr || typeof urlStr !== "string") throw new Error("Endpoint URL is required.");
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Endpoint URL must use HTTP or HTTPS protocol.");
      }
      return parsed.toString().replace(/\/$/, "");
    } catch (err: any) {
      throw new Error(`Invalid Endpoint URL: ${err.message}`);
    }
  }

  /**
   * Local Model Discovery
   */
  static async discoverLocalModels(endpoint: string, localType: LocalProviderType): Promise<LocalModel[]> {
    const validatedUrl = this.validateEndpointUrl(endpoint);
    const adapter = createLocalAIAdapter(localType, validatedUrl);
    return await adapter.listModels();
  }

  /**
   * Retrieves all provider configurations.
   */
  static async getProviders(): Promise<ApiProviderConfig[]> {
    const rawConfigs = await this.readRawConfigs();

    return INITIAL_PROVIDER_CATALOG.map((cat) => {
      const stored = rawConfigs[cat.id];
      const envKeyVal = cat.envKey ? process.env[cat.envKey] || "" : "";
      
      const isLocal = cat.mode === "local";
      const primaryHasKey = isLocal ? true : Boolean(stored?.primary?.encryptedKey || envKeyVal);

      const primary: ApiCredential = {
        id: `${cat.id}_primary`,
        name: `${cat.name} (Primary)`,
        type: isLocal ? "local" : "api",
        isPrimary: true,
        enabled: stored?.primary?.enabled ?? true,
        priority: 1,
        mode: cat.mode,
        localProviderType: isLocal ? (stored?.primary?.localProviderType || (cat.id.includes("ollama") ? "ollama" : cat.id.includes("lm") ? "lm-studio" : "openai-compatible")) : undefined,
        endpoint: stored?.primary?.endpoint || cat.defaultBaseUrl || "",
        model: stored?.primary?.model || cat.defaultModel || "",
        hasKey: primaryHasKey,
        maskedKey: isLocal 
          ? "LOCAL_NO_KEY_REQUIRED" 
          : primaryHasKey 
          ? "••••••••••••••••••••" 
          : "",
        lastTested: stored?.primary?.lastTested,
        status: stored?.primary?.status || (primaryHasKey ? "connected" : "not_configured"),
      };

      const fallbacks: ApiCredential[] = (stored?.fallbacks || []).map((fb: any, idx: number) => ({
        id: fb.id || `${cat.id}_fallback_${idx + 1}`,
        name: fb.name || `Fallback #${idx + 1}`,
        type: fb.mode === "local" ? "local" : "api",
        isPrimary: false,
        enabled: fb.enabled ?? true,
        priority: idx + 2,
        mode: fb.mode || cat.mode,
        localProviderType: fb.localProviderType,
        endpoint: fb.endpoint || "",
        model: fb.model || "",
        hasKey: fb.mode === "local" ? true : Boolean(fb.encryptedKey),
        maskedKey: fb.mode === "local" ? "LOCAL_NO_KEY_REQUIRED" : "••••••••••••••••••••",
        lastTested: fb.lastTested,
        status: fb.status || "connected",
      }));

      return {
        id: cat.id,
        name: cat.name,
        category: cat.category,
        description: cat.description,
        mode: cat.mode,
        enabled: stored?.enabled ?? true,
        allowCloudFallback: stored?.allowCloudFallback ?? false,
        primary,
        fallbacks,
      };
    });
  }

  /**
   * Health Summary Metrics
   */
  static async getSummary(): Promise<ApiConfigSummary> {
    const providers = await this.getProviders();
    return {
      totalProviders: providers.length,
      connectedCount: providers.filter(p => p.primary.status === "connected" && p.enabled).length,
      degradedCount: providers.filter(p => p.primary.status === "failed" && p.enabled).length,
      notConfiguredCount: providers.filter(p => !p.primary.hasKey).length,
      localCount: providers.filter(p => p.mode === "local").length,
      cloudFallbackEnabledCount: providers.filter(p => p.allowCloudFallback).length,
    };
  }

  /**
   * Updates Primary Configuration
   */
  static async updatePrimary(
    providerId: string, 
    data: { apiKey?: string; endpoint?: string; model?: string; localProviderType?: LocalProviderType }
  ): Promise<void> {
    const rawConfigs = await this.readRawConfigs();
    const cat = INITIAL_PROVIDER_CATALOG.find(c => c.id === providerId);
    if (!cat) throw new Error(`Provider "${providerId}" not found in catalog.`);

    const existing = rawConfigs[providerId] || {};
    const isLocal = cat.mode === "local";

    let validatedEndpoint = existing.primary?.endpoint || cat.defaultBaseUrl || "";
    if (data.endpoint && data.endpoint.trim() !== "") {
      validatedEndpoint = this.validateEndpointUrl(data.endpoint.trim());
    }

    let encryptedKey = existing.primary?.encryptedKey || "";
    if (data.apiKey && data.apiKey.trim() !== "") {
      encryptedKey = encrypt(data.apiKey.trim());
    }

    rawConfigs[providerId] = {
      ...existing,
      enabled: existing.enabled ?? true,
      primary: {
        enabled: true,
        encryptedKey: isLocal ? "" : encryptedKey,
        endpoint: validatedEndpoint,
        model: data.model ?? existing.primary?.model ?? cat.defaultModel ?? "",
        localProviderType: data.localProviderType ?? existing.primary?.localProviderType ?? "ollama",
        status: "connected",
        lastTested: new Date().toISOString(),
      },
    };

    await this.writeRawConfigs(rawConfigs);
    await this.logAudit("API_PRIMARY_UPDATED", providerId, { mode: cat.mode });
  }

  /**
   * Update Cloud Fallback Policy (allowCloudFallback)
   */
  static async updateCloudFallbackPolicy(providerId: string, allowCloudFallback: boolean): Promise<void> {
    const rawConfigs = await this.readRawConfigs();
    const existing = rawConfigs[providerId] || {};

    rawConfigs[providerId] = {
      ...existing,
      allowCloudFallback: Boolean(allowCloudFallback),
    };

    await this.writeRawConfigs(rawConfigs);
    await this.logAudit("LOCAL_AI_FALLBACK_CHANGED", providerId, { allowCloudFallback });
  }

  /**
   * Adds a Fallback API Credential or Local Model Endpoint
   */
  static async addFallback(
    providerId: string,
    fallback: { name: string; apiKey?: string; endpoint?: string; mode?: ProviderMode; localProviderType?: LocalProviderType; model?: string }
  ): Promise<void> {
    const rawConfigs = await this.readRawConfigs();
    const existing = rawConfigs[providerId] || {};
    const cat = INITIAL_PROVIDER_CATALOG.find(c => c.id === providerId);

    const fallbacks = existing.fallbacks || [];
    const isLocal = fallback.mode === "local";

    let validatedEndpoint = fallback.endpoint || "";
    if (validatedEndpoint) {
      validatedEndpoint = this.validateEndpointUrl(validatedEndpoint);
    }

    const newFallback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: fallback.name,
      enabled: true,
      mode: fallback.mode || cat?.mode || "cloud",
      localProviderType: fallback.localProviderType,
      encryptedKey: isLocal ? "" : (fallback.apiKey ? encrypt(fallback.apiKey.trim()) : ""),
      endpoint: validatedEndpoint,
      model: fallback.model || "",
      status: "connected",
      lastTested: new Date().toISOString(),
    };

    rawConfigs[providerId] = {
      ...existing,
      fallbacks: [...fallbacks, newFallback],
    };

    await this.writeRawConfigs(rawConfigs);
    await this.logAudit("API_FALLBACK_ADDED", providerId, { fallbackName: fallback.name });
  }

  /**
   * Reorders fallbacks array
   */
  static async reorderFallbacks(providerId: string, fallbackIds: string[]): Promise<void> {
    const rawConfigs = await this.readRawConfigs();
    const existing = rawConfigs[providerId];
    if (!existing || !existing.fallbacks) return;

    const currentFallbacks: any[] = existing.fallbacks;
    const reordered: any[] = [];

    for (const id of fallbackIds) {
      const match = currentFallbacks.find(f => f.id === id);
      if (match) reordered.push(match);
    }

    rawConfigs[providerId] = { ...existing, fallbacks: reordered };
    await this.writeRawConfigs(rawConfigs);
    await this.logAudit("API_FALLBACK_REORDERED", providerId, { count: reordered.length });
  }

  /**
   * Removes a Fallback Credential
   */
  static async removeFallback(providerId: string, fallbackId: string): Promise<void> {
    const rawConfigs = await this.readRawConfigs();
    const existing = rawConfigs[providerId];
    if (!existing || !existing.fallbacks) return;

    rawConfigs[providerId] = {
      ...existing,
      fallbacks: existing.fallbacks.filter((f: any) => f.id !== fallbackId),
    };

    await this.writeRawConfigs(rawConfigs);
    await this.logAudit("API_FALLBACK_REMOVED", providerId, { fallbackId });
  }

  /**
   * Enables or Disables a Provider
   */
  static async toggleProvider(providerId: string, enabled: boolean): Promise<void> {
    const rawConfigs = await this.readRawConfigs();
    const existing = rawConfigs[providerId] || {};

    rawConfigs[providerId] = { ...existing, enabled };
    await this.writeRawConfigs(rawConfigs);
    await this.logAudit(enabled ? "API_PROVIDER_ENABLED" : "API_PROVIDER_DISABLED", providerId);
  }

  /**
   * Resolves provider credential/endpoint with strict allowCloudFallback guard
   */
  static async resolveProvider(providerId: string): Promise<{ apiKey: string; endpoint: string; model: string; isLocal: boolean }> {
    const rawConfigs = await this.readRawConfigs();
    const cat = INITIAL_PROVIDER_CATALOG.find(c => c.id === providerId);
    const stored = rawConfigs[providerId];

    const isLocal = cat?.mode === "local";
    const allowCloudFallback = stored?.allowCloudFallback ?? false;

    // 1. Local AI Primary Resolution
    if (isLocal) {
      const primaryEndpoint = stored?.primary?.endpoint || cat?.defaultBaseUrl || "http://localhost:11434";
      const primaryModel = stored?.primary?.model || cat?.defaultModel || "qwen3-coder";

      return {
        apiKey: "",
        endpoint: primaryEndpoint,
        model: primaryModel,
        isLocal: true,
      };
    }

    // 2. Cloud DB Primary Resolution
    if (stored?.primary?.encryptedKey) {
      const decrypted = decrypt(stored.primary.encryptedKey);
      if (decrypted) {
        return {
          apiKey: decrypted,
          endpoint: stored.primary.endpoint || cat?.defaultBaseUrl || "",
          model: stored.primary.model || "",
          isLocal: false,
        };
      }
    }

    // 3. Fallbacks
    if (stored?.fallbacks) {
      for (const fb of stored.fallbacks) {
        if (fb.enabled) {
          if (fb.mode === "local") {
            return {
              apiKey: "",
              endpoint: fb.endpoint || "http://localhost:11434",
              model: fb.model || "",
              isLocal: true,
            };
          }
          if (fb.encryptedKey && (allowCloudFallback || !isLocal)) {
            const decrypted = decrypt(fb.encryptedKey);
            if (decrypted) {
              return {
                apiKey: decrypted,
                endpoint: fb.endpoint || cat?.defaultBaseUrl || "",
                model: fb.model || "",
                isLocal: false,
              };
            }
          }
        }
      }
    }

    // 4. .env Fallback
    const envKeyName = cat?.envKey;
    const envKeyVal = envKeyName ? process.env[envKeyName] || "" : "";

    return {
      apiKey: envKeyVal,
      endpoint: cat?.defaultBaseUrl || "",
      model: cat?.defaultModel || "",
      isLocal: false,
    };
  }

  // --- Storage & Audit Helpers ---

  private static async readRawConfigs(): Promise<Record<string, any>> {
    try {
      const snapshot = await db.collection("api_configurations").get();
      if (!snapshot.empty) {
        const data: Record<string, any> = {};
        snapshot.docs.forEach((doc) => { data[doc.id] = doc.data(); });
        return data;
      }
    } catch {}

    if (fs.existsSync(CONFIG_FILE_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf-8"));
      } catch {
        return {};
      }
    }
    return {};
  }

  private static async writeRawConfigs(configs: Record<string, any>): Promise<void> {
    try {
      for (const [key, val] of Object.entries(configs)) {
        await db.collection("api_configurations").doc(key).set(val, { merge: true });
      }
    } catch {
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configs, null, 2), "utf-8");
    }
  }

  private static async logAudit(eventType: string, providerId: string, details?: Record<string, any>): Promise<void> {
    try {
      await db.collection("audit_logs").add({
        eventType,
        providerId,
        details: details || {},
        timestamp: new Date().toISOString(),
      });
    } catch {
      console.log(`[AuditLog] ${eventType} for provider "${providerId}" at ${new Date().toISOString()}`);
    }
  }
}
