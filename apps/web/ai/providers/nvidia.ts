import {
  ModelMeta,
  PluginManifest,
  AIProviderRegistry,
  AICapability,
} from "../capability-registry";
import { BaseProviderPlugin } from "./base-provider";

export class NvidiaProviderPlugin extends BaseProviderPlugin {
  id = "nvidia";
  name = "NVIDIA AI Platform";

  manifest: PluginManifest = {
    id: "nvidia",
    name: "NVIDIA AI Platform",
    version: "1.0.0",
    author: "ShortFactory Core Team",
    description: "Multi-capability provider plugin for NVIDIA NIM: LLM, Speech (Riva), Embeddings (NeMo), and Vision",
    dependencies: [],
    capabilities: ["SCRIPT", "SPEECH", "EMBEDDING", "VISION"],
  };

  protected apiKey = process.env.NVIDIA_API_KEY || "";

  constructor() {
    super();
    this.baseUrl = "https://integrate.api.nvidia.com/v1";
    this.setupAdapters();
  }

  private setupAdapters() {
    // 1. NVIDIA LLM Completions (NIM LLM endpoint — OpenAI-compatible)
    this.chatAdapter = {
      id: "nvidia-nim-chat",
      generateText: async (params, signal) => {
        const rawModelName = params.model || "meta/llama-3.1-8b-instruct";
        const modelName = rawModelName.replace("nvidia/", "");

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
          throw new Error(`NVIDIA NIM API returned status ${res.status}: ${errText}`);
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

    // 2. NVIDIA NeMo Retriever Embeddings
    this.embeddingAdapter = {
      id: "nvidia-nemo-embedding",
      generateEmbeddings: async (texts, signal) => {
        const body = {
          input: texts,
          model: "nvidia/nv-embedqa-e5-v5",
          encoding_format: "float",
          input_type: "query",
        };

        const res = await fetch(`${this.baseUrl}/embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal,
        });

        if (!res.ok) {
          throw new Error(`NVIDIA NeMo Embeddings API returned status ${res.status}`);
        }

        const data: any = await res.json();
        const embeddings: number[][] = (data?.data || []).map((item: any) => item.embedding);
        const totalTokens = data?.usage?.prompt_tokens || texts.reduce((acc, t) => acc + Math.round(t.length / 4), 0);

        return { embeddings, usage: { tokens: totalTokens } };
      },
    };

    // 3. NVIDIA Vision (Cosmos / NVLM NIM multimodal endpoints)
    this.visionAdapter = {
      id: "nvidia-vision",
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
          },
          body: JSON.stringify({
            model: "nvidia/llama-3.2-11b-vision-instruct",
            messages,
            max_tokens: 1024,
            stream: false,
          }),
          signal,
        });

        if (!res.ok) {
          throw new Error(`NVIDIA Vision API returned status ${res.status}`);
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

    // 4. NVIDIA Riva TTS (Speech synthesis)
    this.speechAdapter = {
      id: "nvidia-riva-tts",
      generateSpeech: async (params, signal) => {
        // Riva uses gRPC in production; we route through the REST-compatible NIM TTS endpoint
        // For now we log the request and return a placeholder pending full Riva gRPC integration
        console.log(`[NVIDIA Riva TTS] Task: ${params.task}, Voice: ${params.voiceId}`);
        console.log(`[NVIDIA Riva TTS] Text preview: "${params.text.slice(0, 60)}..."`);

        // TODO: Replace with actual Riva gRPC/REST endpoint once NIM TTS API is stable
        return {
          audioUrl: "/media/audio/nvidia_riva_placeholder.wav",
          rawBytes: Buffer.from("nvidia-riva-tts-placeholder-bytes"),
        };
      },
    };
  }

  async authenticateGuard(): Promise<void> {
    if (!this.apiKey) {
      this.metrics.state = "AUTH FAILED";
      throw new Error("NVIDIA Provider: NVIDIA_API_KEY is not configured in process environment.");
    }
  }

  async discoverModels(): Promise<ModelMeta[]> {
    if (!this.apiKey) return [];

    return [
      // LLM Models
      {
        id: "nvidia/meta/llama-3.1-8b-instruct",
        name: "Llama 3.1 8B Instruct (NVIDIA NIM)",
        provider: "nvidia",
        capabilities: ["SCRIPT"],
        contextWindow: 131072,
        costInput: 0.10,
        costOutput: 0.10,
        speed: 120,
        health: 1.0,
        availability: true,
        isLocal: false,
        tags: ["nvidia", "nim", "llama", "json"],
      },
      {
        id: "nvidia/meta/llama-3.1-70b-instruct",
        name: "Llama 3.1 70B Instruct (NVIDIA NIM)",
        provider: "nvidia",
        capabilities: ["SCRIPT"],
        contextWindow: 131072,
        costInput: 0.35,
        costOutput: 0.40,
        speed: 50,
        health: 1.0,
        availability: true,
        isLocal: false,
        tags: ["nvidia", "nim", "reasoning", "json"],
      },
      // Embedding Models
      {
        id: "nvidia/nv-embedqa-e5-v5",
        name: "NV-EmbedQA E5 v5 (NeMo Retriever)",
        provider: "nvidia",
        capabilities: ["EMBEDDING"],
        contextWindow: 512,
        costInput: 0.02,
        costOutput: 0.0,
        speed: 200,
        health: 1.0,
        availability: true,
        isLocal: false,
        tags: ["nvidia", "embedding", "retrieval"],
      },
      // Vision Models
      {
        id: "nvidia/llama-3.2-11b-vision-instruct",
        name: "Llama 3.2 11B Vision (NVIDIA NIM)",
        provider: "nvidia",
        capabilities: ["SCRIPT", "VISION"],
        contextWindow: 128000,
        costInput: 0.20,
        costOutput: 0.20,
        speed: 60,
        health: 1.0,
        availability: true,
        isLocal: false,
        tags: ["nvidia", "vision", "multimodal"],
      },
    ];
  }
}

// Auto-register plugin
export const nvidiaProvider = new NvidiaProviderPlugin();
AIProviderRegistry.registerPlugin(nvidiaProvider);
