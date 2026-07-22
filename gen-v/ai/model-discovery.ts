import {
  ModelMeta,
  AICapability,
  AIProviderRegistry,
} from "./capability-registry";

class ModelDiscoveryServiceClass {
  private inMemoryCache: ModelMeta[] = [];
  private lastFetchTime = 0;
  private cacheDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Discovers all models from all registered providers.
   * Leverages an in-memory cache to prevent database/API spam.
   */
  async discoverAllModels(forceRefresh = false): Promise<ModelMeta[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.inMemoryCache.length > 0 &&
      now - this.lastFetchTime < this.cacheDuration
    ) {
      return this.inMemoryCache;
    }

    console.log("[ModelDiscoveryService] Discovering all models dynamically...");
    const plugins = AIProviderRegistry.getAllPlugins();
    const allModels: ModelMeta[] = [];

    // Run discovery on all active provider plugins in parallel
    const promises = plugins.map(async (plugin) => {
      try {
        const models = await plugin.discoverModels();
        console.log(`[ModelDiscoveryService] Discovered ${models.length} models from provider: ${plugin.id}`);
        return models;
      } catch (err) {
        console.error(`[ModelDiscoveryService] Error discovering models from ${plugin.id}:`, err);
        return [];
      }
    });

    const results = await Promise.all(promises);
    for (const models of results) {
      allModels.push(...models);
    }

    if (allModels.length > 0) {
      this.inMemoryCache = allModels;
      this.lastFetchTime = now;
    } else {
      console.warn("[ModelDiscoveryService] Warning: Dynamic model discovery returned 0 models. Relying on fallback lists.");
      // Fallback in case of total offline / config error
      return this.getStaticFallbacks();
    }

    return this.inMemoryCache;
  }

  async getModelsForCapability(capability: AICapability, forceRefresh = false): Promise<ModelMeta[]> {
    const models = await this.discoverAllModels(forceRefresh);
    return models.filter((m) => m.capabilities.includes(capability) && m.availability);
  }

  async getModel(id: string, forceRefresh = false): Promise<ModelMeta | undefined> {
    const models = await this.discoverAllModels(forceRefresh);
    return models.find((m) => m.id === id);
  }

  /**
   * Helper utility to auto-tag models based on their metadata features
   */
  autoTagCapabilities(modelId: string, contextLength: number, pricing: any, description = ""): AICapability[] {
    const caps: AICapability[] = ["SCRIPT"];
    const id = modelId.toLowerCase();
    const desc = description.toLowerCase();

    // Check Vision capability
    if (
      id.includes("vision") ||
      id.includes("vl") ||
      desc.includes("vision") ||
      desc.includes("multimodal") ||
      desc.includes("image input")
    ) {
      caps.push("VISION");
    }

    // Check Embedding capability
    if (id.includes("embed") || desc.includes("embedding")) {
      caps.push("EMBEDDING");
    }

    // Check Reranking capability
    if (id.includes("rerank") || desc.includes("rerank")) {
      caps.push("RERANKING");
    }

    // Check Speech capability (Speech models might offer text to speech)
    if (id.includes("tts") || id.includes("speech") || desc.includes("text-to-speech")) {
      caps.push("SPEECH");
    }

    // Check Image generation capability
    if (
      id.includes("flux") ||
      id.includes("stable-diffusion") ||
      id.includes("dall-e") ||
      desc.includes("text-to-image")
    ) {
      caps.push("IMAGE");
    }

    return caps;
  }

  private getStaticFallbacks(): ModelMeta[] {
    return [
      {
        id: "google/gemini-1.5-flash",
        name: "Gemini 1.5 Flash (Fallback)",
        provider: "google",
        capabilities: ["SCRIPT", "VISION"],
        contextWindow: 1048576,
        costInput: 0.075,
        costOutput: 0.3,
        speed: 80,
        health: 1.0,
        availability: true,
        isLocal: false,
      },
      {
        id: "groq/llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant (Fallback)",
        provider: "groq",
        capabilities: ["SCRIPT"],
        contextWindow: 131072,
        costInput: 0.05,
        costOutput: 0.08,
        speed: 150,
        health: 1.0,
        availability: true,
        isLocal: false,
      },
      {
        id: "openrouter/openai/gpt-4o-mini",
        name: "GPT-4o Mini (Fallback)",
        provider: "openrouter",
        capabilities: ["SCRIPT", "VISION"],
        contextWindow: 128000,
        costInput: 0.15,
        costOutput: 0.6,
        speed: 90,
        health: 1.0,
        availability: true,
        isLocal: false,
      }
    ];
  }
}

export const ModelDiscoveryService = new ModelDiscoveryServiceClass();
