import {
  ModelMeta,
  ProviderHealthMetrics,
  PluginManifest,
  AIProviderRegistry,
  AICapability,
} from "../capability-registry";
import { BaseProviderPlugin } from "./base-provider";
import {
  ChatAdapter,
  EmbeddingAdapter,
  SpeechAdapter,
  ImageAdapter,
} from "../execution-adapters";
import { EventBus } from "../event-bus";

export class LocalAIManagerPlugin extends BaseProviderPlugin {
  id = "local";
  name = "Local AI Manager";

  manifest: PluginManifest = {
    id: "local",
    name: "Local AI Manager",
    version: "1.0.0",
    author: "ShortFactory Core Team",
    description: "Orchestrates local model discovery and inference via Ollama, LM Studio, and llama.cpp",
    dependencies: [],
    capabilities: ["SCRIPT", "EMBEDDING", "SPEECH", "IMAGE"],
  };

  private ollamaUrl = process.env.LOCAL_OLLAMA_URL || "http://127.0.0.1:11434";
  private lmStudioUrl = process.env.LOCAL_LMSTUDIO_URL || "http://127.0.0.1:1234";
  private llamaCppUrl = process.env.LOCAL_LLAMACPP_URL || "http://127.0.0.1:8080";
  private localSdUrl = process.env.LOCAL_SD_URL || "http://127.0.0.1:7860"; // Stable Diffusion local port

  private cachedModels: ModelMeta[] = [];
  private lastDiscovery = 0;
  private cacheTtl = 30000;

  constructor() {
    super();
    this.setupAdapters();
  }

  private setupAdapters() {
    // 1. Chat Adapter Implementation
    this.chatAdapter = {
      id: "local-chat",
      generateText: async (params, signal) => {
        const fullModelId = params.model || "local/ollama/llama3";
        const parts = fullModelId.split("/");
        const runtime = parts[1] || "ollama";
        const modelName = parts.slice(2).join("/");

        const systemPrompt = params.system || "You are a helpful assistant.";
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.prompt },
        ];

        console.log(`[LocalChat] Routing request to local runtime: ${runtime} (Model: ${modelName})`);

        if (runtime === "ollama") {
          const res = await fetch(`${this.ollamaUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: modelName,
              messages,
              stream: false,
              options: {
                temperature: params.temperature ?? 0.7,
                num_predict: params.maxTokens ?? 2048,
              },
            }),
            signal,
          });

          if (!res.ok) {
            throw new Error(`Ollama chat API returned status: ${res.status}`);
          }

          const data: any = await res.json();
          const text = data?.message?.content || "";
          
          // Estimate token usage
          const inputTokens = Math.round(params.prompt.length / 4);
          const outputTokens = Math.round(text.length / 4);

          return {
            text,
            usage: { inputTokens, outputTokens },
          };
        } else if (runtime === "lmstudio" || runtime === "llamacpp") {
          const baseUrl = runtime === "lmstudio" ? this.lmStudioUrl : this.llamaCppUrl;
          const res = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: modelName,
              messages,
              temperature: params.temperature ?? 0.7,
              max_tokens: params.maxTokens ?? 2048,
              stream: false,
            }),
            signal,
          });

          if (!res.ok) {
            throw new Error(`Local OpenAI-compatible API returned status: ${res.status}`);
          }

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
        } else {
          throw new Error(`Unsupported local chat runtime environment: ${runtime}`);
        }
      },
    };

    // 2. Embedding Adapter Implementation
    this.embeddingAdapter = {
      id: "local-embedding",
      generateEmbeddings: async (texts, signal) => {
        // Embed using Ollama as default
        console.log(`[LocalEmbedding] Generating embeddings for ${texts.length} inputs...`);
        const embeddings: number[][] = [];
        let totalTokens = 0;

        for (const text of texts) {
          const res = await fetch(`${this.ollamaUrl}/api/embeddings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "nomic-embed-text", // standard local embedding default
              prompt: text,
            }),
            signal,
          });

          if (res.ok) {
            const data: any = await res.json();
            if (data?.embedding) {
              embeddings.push(data.embedding);
              totalTokens += Math.round(text.length / 4);
            }
          }
        }

        if (embeddings.length === 0) {
          throw new Error("Local embedding generation failed across all targets.");
        }

        return {
          embeddings,
          usage: { tokens: totalTokens },
        };
      },
    };

    // 3. Speech Adapter Implementation
    this.speechAdapter = {
      id: "local-speech",
      generateSpeech: async (params, signal) => {
        console.log(`[LocalSpeech] Synthesizing speech for task: ${params.task} (Voice: ${params.voiceId})`);
        
        // Broadcast Event-Bus telemetry
        EventBus.publish(
          "speech.started",
          { text: params.text, task: params.task, voice: params.voiceId },
          "tr_local_speech"
        );

        // Standard edge-tts local mock generator: returning placeholder file
        const audioUrl = "/media/audio/local_narrator_placeholder.mp3";
        return {
          audioUrl,
          rawBytes: Buffer.from("placeholder-local-audio-bytes"),
        };
      },
    };

    // 4. Image Adapter Implementation
    this.imageAdapter = {
      id: "local-image",
      generateImage: async (params, signal) => {
        console.log(`[LocalImage] Generating image prompt: "${params.prompt}"`);

        // Check if local Stable Diffusion WebUI is online
        try {
          const res = await fetch(`${this.localSdUrl}/sdapi/v1/txt2img`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: params.prompt,
              steps: params.steps || 20,
              width: params.width || 512,
              height: params.height || 512,
            }),
            signal,
          });

          if (res.ok) {
            const data: any = await res.json();
            const base64Image = data?.images?.[0];
            if (base64Image) {
              const buffer = Buffer.from(base64Image, "base64");
              return {
                imageUrl: `data:image/png;base64,${base64Image}`,
                rawBytes: buffer,
              };
            }
          }
        } catch {
          // SD offline; fallback to logging placeholder
        }

        // Mock Fallback: Return placeholder path
        return {
          imageUrl: "/media/images/local_flux_placeholder.png",
          rawBytes: Buffer.from("placeholder-local-image-bytes"),
        };
      },
    };
  }

  async authenticateGuard(): Promise<void> {
    return Promise.resolve();
  }

  async discoverModels(): Promise<ModelMeta[]> {
    const now = Date.now();
    if (this.cachedModels.length > 0 && now - this.lastDiscovery < this.cacheTtl) {
      return this.cachedModels;
    }

    console.log("[LocalAIManager] Discovering local models from runtimes...");
    const discovered: ModelMeta[] = [];

    // 1. Scan Ollama
    try {
      const res = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) {
        const data: any = await res.json();
        const models = data?.models || [];
        for (const m of models) {
          discovered.push({
            id: `local/ollama/${m.name}`,
            name: `Ollama: ${m.name}`,
            provider: "local",
            capabilities: ["SCRIPT", "EMBEDDING"],
            contextWindow: 8192,
            costInput: 0,
            costOutput: 0,
            speed: 35,
            health: 1.0,
            availability: true,
            isLocal: true,
            tags: ["ollama", "local"],
          });
        }
      }
    } catch (e) {
      // Ollama not running; ignore
    }

    // 2. Scan LM Studio
    try {
      const res = await fetch(`${this.lmStudioUrl}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) {
        const data: any = await res.json();
        const models = data?.data || [];
        for (const m of models) {
          discovered.push({
            id: `local/lmstudio/${m.id}`,
            name: `LM Studio: ${m.id}`,
            provider: "local",
            capabilities: ["SCRIPT"],
            contextWindow: 16384,
            costInput: 0,
            costOutput: 0,
            speed: 40,
            health: 1.0,
            availability: true,
            isLocal: true,
            tags: ["lmstudio", "local"],
          });
        }
      }
    } catch (e) {
      // LM Studio not running; ignore
    }

    // 3. Scan llama.cpp
    try {
      const res = await fetch(`${this.llamaCppUrl}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) {
        const data: any = await res.json();
        const models = data?.data || [];
        for (const m of models) {
          discovered.push({
            id: `local/llamacpp/${m.id}`,
            name: `llama.cpp: ${m.id}`,
            provider: "local",
            capabilities: ["SCRIPT"],
            contextWindow: 8192,
            costInput: 0,
            costOutput: 0,
            speed: 25,
            health: 1.0,
            availability: true,
            isLocal: true,
            tags: ["llamacpp", "local"],
          });
        }
      }
    } catch (e) {
      // llama.cpp not running; ignore
    }

    this.cachedModels = discovered;
    this.lastDiscovery = now;

    if (discovered.length > 0) {
      this.metrics.state = "ONLINE";
    } else {
      this.metrics.state = "DEGRADED";
    }

    return discovered;
  }
}

export const localAIManager = new LocalAIManagerPlugin();
AIProviderRegistry.registerPlugin(localAIManager);
