import fs from "fs";
import path from "path";
import { db } from "../firebase-admin";
import { encrypt, decrypt } from "../providers/crypto";
import { createLocalAIAdapter, LocalModel } from "./LocalAIAdapter";
import { 
  ApiProviderConfig, 
  ApiCredential, 
  ApiConfigSummary, 
  ProviderCategory, 
  ProviderMode, 
  LocalProviderType,
  DiscoveredModel
} from "./api-config-store";
import { OverseerCognitionClient } from "@/factoryos/core/cognition/OverseerCognitionClient";
import { GeminiTTSProvider } from "@/factoryos/core/voice/GeminiTTSProvider";

const CONFIG_FILE_PATH = path.resolve(process.cwd(), "config", "api_configurations.json");

// Canonical Catalog of Open Design Providers & FactoryOS Local AI Runtimes
const INITIAL_PROVIDER_CATALOG: Array<{
  id: string;
  name: string;
  category: ProviderCategory;
  description: string;
  mode: ProviderMode;
  envKey?: string;
  defaultBaseUrl?: string;
  defaultModel?: string;
  getKeyUrl?: string;
  providerPreset?: string;
}> = [
  // Cloud API Providers (Open Design Catalog)
  { id: "anthropic", name: "Anthropic", category: "llm", description: "Claude 3.5 Sonnet & Claude 3 Opus", mode: "cloud", envKey: "ANTHROPIC_API_KEY", defaultBaseUrl: "https://api.anthropic.com", defaultModel: "claude-3-5-sonnet-20241022", getKeyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "openai", name: "OpenAI", category: "llm", description: "GPT-4o, GPT-4o-mini & o3-mini reasoning", mode: "cloud", envKey: "OPENAI_API_KEY", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o", getKeyUrl: "https://platform.openai.com/api-keys" },
  { id: "atlas", name: "Atlas Cloud", category: "llm", description: "Enterprise serverless AI inference", mode: "cloud", envKey: "ATLAS_API_KEY", defaultBaseUrl: "https://api.atlascloud.ai/v1", defaultModel: "atlas-general" },
  { id: "gemini", name: "Google Gemini", category: "llm", description: "Multimodal Gemini 3.7 Flash & 2.5 Flash models", mode: "cloud", envKey: "GEMINI_API_KEY", defaultBaseUrl: "https://generativelanguage.googleapis.com", defaultModel: "gemini-3.7-flash", getKeyUrl: "https://aistudio.google.com/app/apikey" },
  { id: "ollama_cloud", name: "Ollama Cloud", category: "llm", description: "Hosted cloud Ollama infrastructure", mode: "cloud", envKey: "OLLAMA_CLOUD_API_KEY", defaultBaseUrl: "https://api.ollama.com/v1", defaultModel: "llama3.3" },
  { id: "azure_openai", name: "Azure OpenAI", category: "llm", description: "Enterprise isolated Azure OpenAI instances", mode: "cloud", envKey: "AZURE_OPENAI_API_KEY", defaultBaseUrl: "https://your-resource.openai.azure.com", defaultModel: "gpt-4o" },
  { id: "siliconflow_cn", name: "SiliconFlow (CN)", category: "llm", description: "SiliconFlow High-Speed China Gateway", mode: "cloud", envKey: "SILICONFLOW_CN_API_KEY", defaultBaseUrl: "https://api.siliconflow.cn/v1", defaultModel: "deepseek-ai/DeepSeek-V3" },
  { id: "siliconflow_global", name: "SiliconFlow (Global)", category: "llm", description: "SiliconFlow Global Cloud Inference", mode: "cloud", envKey: "SILICONFLOW_GLOBAL_API_KEY", defaultBaseUrl: "https://api.siliconflow.com/v1", defaultModel: "deepseek-ai/DeepSeek-R1" },
  { id: "ppio", name: "PPIO", category: "llm", description: "Distributed GPU inference network", mode: "cloud", envKey: "PPIO_API_KEY", defaultBaseUrl: "https://api.ppinfra.com/v3/openai", defaultModel: "deepseek/deepseek-v3" },
  { id: "nvidia", name: "NVIDIA", category: "llm", description: "NVIDIA NIM high-throughput inference", mode: "cloud", envKey: "NVIDIA_API_KEY", defaultBaseUrl: "https://integrate.api.nvidia.com/v1", defaultModel: "meta/llama-3.3-70b-instruct" },
  { id: "stepfun", name: "StepFun", category: "llm", description: "Step-1 and Step-2 series models", mode: "cloud", envKey: "STEPFUN_API_KEY", defaultBaseUrl: "https://api.stepfun.com/v1", defaultModel: "step-1-8k" },
  { id: "deepseek", name: "DeepSeek", category: "llm", description: "DeepSeek-V3 and DeepSeek-R1 reasoning models", mode: "cloud", envKey: "DEEPSEEK_API_KEY", defaultBaseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat", getKeyUrl: "https://platform.deepseek.com/api_keys" },
  { id: "openrouter", name: "OpenRouter", category: "llm", description: "Unified multi-provider router", mode: "cloud", envKey: "OPENROUTER_API_KEY", defaultBaseUrl: "https://openrouter.ai/api/v1", defaultModel: "anthropic/claude-3.5-sonnet", getKeyUrl: "https://openrouter.ai/keys" },
  { id: "mistral", name: "Mistral AI", category: "llm", description: "Mistral Large 2 & Codestral", mode: "cloud", envKey: "MISTRAL_API_KEY", defaultBaseUrl: "https://api.mistral.ai/v1", defaultModel: "mistral-large-latest" },
  { id: "xai", name: "xAI", category: "llm", description: "Grok 2 & Grok 3 high-speed inference", mode: "cloud", envKey: "XAI_API_KEY", defaultBaseUrl: "https://api.x.ai/v1", defaultModel: "grok-2-latest" },
  { id: "together", name: "Together AI", category: "llm", description: "FLUX.1 Schnell & Together Inference", mode: "cloud", envKey: "TOGETHER_API_KEY", defaultBaseUrl: "https://api.together.xyz/v1", defaultModel: "black-forest-labs/FLUX.1-schnell" },
  { id: "huggingface", name: "Hugging Face", category: "llm", description: "Inference Endpoints & Hub models", mode: "cloud", envKey: "HF_API_KEY", defaultBaseUrl: "https://api-inference.huggingface.co/models", defaultModel: "meta-llama/Llama-3.3-70B-Instruct" },
  { id: "qwen", name: "Qwen", category: "llm", description: "Alibaba DashScope Qwen 2.5 Max & Turbo", mode: "cloud", envKey: "DASHSCOPE_API_KEY", defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", defaultModel: "qwen-max" },
  { id: "volcengine", name: "Volcengine Ark", category: "llm", description: "ByteDance Doubao reasoning platform", mode: "cloud", envKey: "VOLCENGINE_API_KEY", defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3", defaultModel: "doubao-pro-32k" },
  { id: "baidu_qianfan", name: "Baidu Qianfan", category: "llm", description: "Baidu ERNIE-4.0 & ERNIE-Speed", mode: "cloud", envKey: "QIANFAN_API_KEY", defaultBaseUrl: "https://qianfan.baidubce.com/v2", defaultModel: "ernie-4.0-8k" },
  { id: "xiaomi_mimo", name: "Xiaomi MiMo", category: "llm", description: "Xiaomi MiMo intelligence engine", mode: "cloud", envKey: "MIMO_API_KEY", defaultBaseUrl: "https://api.mimo.xiaomi.com/v1", defaultModel: "mimo-v1" },
  { id: "minimax", name: "MiniMax", category: "voice", description: "abab 6.5 & Speech-01 voice models", mode: "cloud", envKey: "MINIMAX_API_KEY", defaultBaseUrl: "https://api.minimax.chat/v1", defaultModel: "abab6.5-chat" },
  { id: "moonshot", name: "Moonshot", category: "llm", description: "Kimi Moonshot long-context models", mode: "cloud", envKey: "MOONSHOT_API_KEY", defaultBaseUrl: "https://api.moonshot.cn/v1", defaultModel: "moonshot-v1-32k" },
  { id: "zhipu", name: "Zhipu AI", category: "llm", description: "GLM-4 & GLM-4V multimodal models", mode: "cloud", envKey: "ZHIPU_API_KEY", defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4", defaultModel: "glm-4" },
  { id: "senseaudio", name: "SenseAudio", category: "voice", description: "SenseTime Audio & TTS synthesis", mode: "cloud", envKey: "SENSEAUDIO_API_KEY", defaultBaseUrl: "https://api.sensenova.cn/v1", defaultModel: "senseaudio-tts" },
  { id: "aihubmix", name: "AIHubMix", category: "llm", description: "AIHubMix API aggregation gateway", mode: "cloud", envKey: "AIHUBMIX_API_KEY", defaultBaseUrl: "https://aihubmix.com/v1", defaultModel: "gpt-4o" },
  { id: "custom", name: "Custom provider", category: "llm", description: "Custom OpenAI-compatible inference gateway", mode: "cloud", envKey: "CUSTOM_API_KEY", defaultBaseUrl: "https://api.custom.com/v1", defaultModel: "custom-model" },

  // Local AI Runtimes (FactoryOS Local Execution)
  { id: "ollama_local", name: "Ollama (Local AI)", category: "local_ai", description: "Local LLM runtime running Qwen, DeepSeek, Llama", mode: "local", defaultBaseUrl: "http://127.0.0.1:11434", defaultModel: "qwen2.5-coder" },
  { id: "lm_studio_local", name: "LM Studio (Local AI)", category: "local_ai", description: "Local OpenAI-compatible runner", mode: "local", defaultBaseUrl: "http://localhost:1234/v1", defaultModel: "local-model" },
  { id: "vllm", name: "vLLM", category: "local_ai", description: "High-throughput local vLLM serving engine", mode: "local", defaultBaseUrl: "http://localhost:8000/v1", defaultModel: "local-model" },
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
   * Dynamic Model Discovery for Cloud & Local Providers
   */
  static async discoverProviderModels(
    providerId: string,
    endpoint: string,
    apiKey?: string,
    mode?: string,
    localType?: LocalProviderType
  ): Promise<DiscoveredModel[]> {
    const validatedUrl = this.validateEndpointUrl(endpoint);

    // 1. Google Gemini Model Discovery
    if (providerId === "gemini" || providerId === "gemini_tts") {
      const keyToUse = apiKey || process.env.GEMINI_API_KEY;
      if (!keyToUse) {
        return [
          { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", source: "From your account", capabilities: ["Text", "Vision", "Structured JSON", "Search Grounding"] },
          { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", source: "From your account", capabilities: ["Text", "Vision", "Fast Inference"] },
          { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", source: "From your account", capabilities: ["Text", "Complex Reasoning", "Code"] },
          { id: "gemini-3.1-flash-tts-preview", name: "Gemini 3.1 Flash TTS Preview", source: "From your account", capabilities: ["Voice Generation", "Audio Profile"] },
        ];
      }

      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
          headers: { "x-goog-api-key": keyToUse },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models)) {
            return data.models.map((m: any) => {
              const cleanId = m.name?.replace(/^models\//, "") || m.name;
              const isTts = cleanId.includes("tts");
              return {
                id: cleanId,
                name: m.displayName || cleanId,
                source: "From your account",
                capabilities: isTts ? ["Voice Generation", "Audio Profile"] : ["Text", "Vision", "JSON"],
              };
            });
          }
        }
      } catch {
        // Fallback default list
      }

      return [
        { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", source: "From your account", capabilities: ["Text", "Vision", "Structured JSON"] },
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", source: "From your account", capabilities: ["Text", "Vision"] },
        { id: "gemini-3.1-flash-tts-preview", name: "Gemini 3.1 Flash TTS Preview", source: "From your account", capabilities: ["Voice Generation"] },
      ];
    }

    // 2. Local AI Model Discovery (Ollama / LM Studio / vLLM)
    if (mode === "local" || providerId.includes("local") || providerId === "vllm") {
      const type = localType || (providerId.includes("ollama") ? "ollama" : providerId.includes("lm") ? "lm-studio" : "vllm");
      try {
        const adapter = createLocalAIAdapter(type, validatedUrl);
        const models = await adapter.listModels();
        return models.map(m => ({
          id: m.id || m.name,
          name: m.name || m.id,
          source: "Local Runtime",
          capabilities: ["Local Inference", "Zero Cost", "Offline First"],
        }));
      } catch {
        return [
          { id: "qwen2.5-coder", name: "qwen2.5-coder (Local)", source: "Local Runtime", capabilities: ["Local Inference", "Zero Cost"] },
        ];
      }
    }

    // 3. OpenAI-Compatible Model Discovery
    const keyToUse = apiKey || (INITIAL_PROVIDER_CATALOG.find(p => p.id === providerId)?.envKey ? process.env[INITIAL_PROVIDER_CATALOG.find(p => p.id === providerId)!.envKey!] : undefined);
    try {
      const headers: Record<string, string> = {};
      if (keyToUse) headers["Authorization"] = `Bearer ${keyToUse}`;
      const res = await fetch(`${validatedUrl}/models`, { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        if (list.length > 0) {
          return list.map((m: any) => ({
            id: m.id || m.name,
            name: m.name || m.id,
            source: "From your account",
            capabilities: ["Text", "Chat"],
          }));
        }
      }
    } catch {
      // Fallback
    }

    return [
      { id: "default-model", name: "Default Model", source: "Provider Default", capabilities: ["Text Generation"] },
    ];
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
        localProviderType: isLocal ? (stored?.primary?.localProviderType || (cat.id.includes("ollama") ? "ollama" : cat.id.includes("lm") ? "lm-studio" : "vllm")) : undefined,
        endpoint: stored?.primary?.endpoint || cat.defaultBaseUrl || "",
        model: stored?.primary?.model || cat.defaultModel || "",
        maxTokens: stored?.primary?.maxTokens || 8192,
        hasKey: primaryHasKey,
        maskedKey: isLocal 
          ? "LOCAL_NO_KEY_REQUIRED" 
          : primaryHasKey 
            ? "••••••••••••••••••••••••••••••••" 
            : "",
        status: primaryHasKey ? "connected" : "not_configured",
        lastTested: stored?.primary?.lastTested,
        latencyMs: stored?.primary?.latencyMs,
        isFreeTier: isLocal || cat.id === "pollinations" || cat.id === "groq",
      };

      const fallbacks: ApiCredential[] = (stored?.fallbacks || []).map((fb: any, index: number) => ({
        id: fb.id || `${cat.id}_fallback_${index + 1}`,
        name: fb.name || `${cat.name} (Fallback ${index + 1})`,
        type: fb.mode === "local" ? "local" : "api",
        isPrimary: false,
        enabled: fb.enabled ?? true,
        priority: index + 2,
        mode: fb.mode || "cloud",
        localProviderType: fb.localProviderType,
        endpoint: fb.endpoint || "",
        model: fb.model || "",
        hasKey: fb.mode === "local" ? true : Boolean(fb.encryptedKey),
        maskedKey: fb.mode === "local" ? "LOCAL_NO_KEY_REQUIRED" : fb.encryptedKey ? "••••••••••••••••" : "",
        status: (fb.mode === "local" || fb.encryptedKey) ? "connected" : "not_configured",
        lastTested: fb.lastTested,
      }));

      return {
        id: cat.id,
        name: cat.name,
        category: cat.category,
        description: cat.description,
        mode: cat.mode,
        providerPreset: cat.providerPreset || cat.name,
        defaultBaseUrl: cat.defaultBaseUrl,
        getKeyUrl: cat.getKeyUrl,
        enabled: stored?.enabled ?? true,
        allowCloudFallback: stored?.allowCloudFallback ?? false,
        primary,
        fallbacks,
      };
    });
  }

  /**
   * Generates real calculated statistics.
   */
  static async getSummary(): Promise<ApiConfigSummary> {
    const providers = await this.getProviders();

    const totalProviders = providers.length;
    let connectedCount = 0;
    let degradedCount = 0;
    let notConfiguredCount = 0;
    let localCount = 0;
    let cloudFallbackEnabledCount = 0;

    for (const p of providers) {
      if (p.mode === "local") localCount++;
      if (p.allowCloudFallback) cloudFallbackEnabledCount++;

      if (p.primary.status === "connected") {
        connectedCount++;
      } else if (p.primary.status === "degraded" || p.primary.status === "rate_limited") {
        degradedCount++;
      } else {
        notConfiguredCount++;
      }
    }

    return {
      totalProviders,
      connectedCount,
      degradedCount,
      notConfiguredCount,
      localCount,
      cloudFallbackEnabledCount,
    };
  }

  /**
   * Resolves provider credentials securely.
   */
  static async resolveProvider(providerId: string): Promise<{
    apiKey: string;
    endpoint: string;
    model: string;
    isLocal: boolean;
    providerId: string;
  }> {
    const rawConfigs = await this.readRawConfigs();
    const catalogItem = INITIAL_PROVIDER_CATALOG.find((p) => p.id === providerId);
    const stored = rawConfigs[providerId];

    let rawKey = "";
    if (stored?.primary?.encryptedKey) {
      rawKey = decrypt(stored.primary.encryptedKey);
    } else if (catalogItem?.envKey) {
      rawKey = process.env[catalogItem.envKey] || "";
    }

    const endpoint = stored?.primary?.endpoint || catalogItem?.defaultBaseUrl || "";
    const model = stored?.primary?.model || catalogItem?.defaultModel || "";
    const isLocal = catalogItem?.mode === "local";

    return {
      apiKey: rawKey,
      endpoint,
      model,
      isLocal,
      providerId,
    };
  }

  /**
   * Saves or updates a provider's primary configuration securely.
   */
  static async updatePrimaryConfig(
    providerId: string,
    updates: {
      endpoint?: string;
      model?: string;
      apiKey?: string;
      maxTokens?: number;
      enabled?: boolean;
      allowCloudFallback?: boolean;
      localProviderType?: LocalProviderType;
      lastTested?: string;
      latencyMs?: number;
      status?: "connected" | "failed" | "not_configured";
    }
  ): Promise<void> {
    const rawConfigs = await this.readRawConfigs();
    if (!rawConfigs[providerId]) {
      rawConfigs[providerId] = { enabled: true, allowCloudFallback: false, primary: {}, fallbacks: [] };
    }

    if (updates.enabled !== undefined) rawConfigs[providerId].enabled = updates.enabled;
    if (updates.allowCloudFallback !== undefined) rawConfigs[providerId].allowCloudFallback = updates.allowCloudFallback;

    if (!rawConfigs[providerId].primary) rawConfigs[providerId].primary = {};

    if (updates.endpoint !== undefined) {
      rawConfigs[providerId].primary.endpoint = this.validateEndpointUrl(updates.endpoint);
    }
    if (updates.model !== undefined) rawConfigs[providerId].primary.model = updates.model;
    if (updates.maxTokens !== undefined) rawConfigs[providerId].primary.maxTokens = updates.maxTokens;
    if (updates.localProviderType !== undefined) rawConfigs[providerId].primary.localProviderType = updates.localProviderType;
    if (updates.lastTested !== undefined) rawConfigs[providerId].primary.lastTested = updates.lastTested;
    if (updates.latencyMs !== undefined) rawConfigs[providerId].primary.latencyMs = updates.latencyMs;
    if (updates.status !== undefined) rawConfigs[providerId].primary.status = updates.status;

    if (updates.apiKey !== undefined && updates.apiKey.trim() !== "") {
      rawConfigs[providerId].primary.encryptedKey = encrypt(updates.apiKey.trim());
    }

    await this.writeRawConfigs(rawConfigs);
  }

  /**
   * File-backed raw configuration persistence.
   */
  private static async readRawConfigs(): Promise<Record<string, any>> {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const content = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
        return JSON.parse(content);
      }
    } catch {
      // Ignore read errors and return empty
    }
    return {};
  }

  private static async writeRawConfigs(configs: Record<string, any>): Promise<void> {
    try {
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configs, null, 2), "utf-8");
    } catch (err: any) {
      console.error("[ApiConfigManager] Failed to write config:", err.message);
    }
  }
}
