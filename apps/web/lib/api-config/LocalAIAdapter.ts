/**
 * FactoryOS Pluggable Local AI Adapter Abstraction
 * Supports Ollama, LM Studio, OpenAI-Compatible Local Servers, and Custom Local Endpoints.
 */

export interface ConnectionStatus {
  success: boolean;
  providerType: string;
  endpoint: string;
  latencyMs: number;
  error?: string;
  models?: string[];
}

export interface LocalModel {
  id: string;
  name: string;
  sizeBytes?: number;
  details?: Record<string, any>;
}

export interface LocalAIAdapter {
  providerType: string;
  endpoint: string;
  testConnection(): Promise<ConnectionStatus>;
  listModels(): Promise<LocalModel[]>;
  generateText(prompt: string, model: string, options?: Record<string, any>): Promise<string>;
}

/**
 * 1. Ollama Local AI Adapter
 * Default Endpoint: http://localhost:11434
 */
export class OllamaAdapter implements LocalAIAdapter {
  providerType = "ollama";
  endpoint: string;

  constructor(endpoint: string = "http://localhost:11434") {
    this.endpoint = endpoint.replace(/\/$/, "");
  }

  async testConnection(): Promise<ConnectionStatus> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${this.endpoint}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: any) => m.name);
        return { success: true, providerType: this.providerType, endpoint: this.endpoint, latencyMs, models };
      }
      return { success: false, providerType: this.providerType, endpoint: this.endpoint, latencyMs, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, providerType: this.providerType, endpoint: this.endpoint, latencyMs: Date.now() - startTime, error: "Ollama server unreachable at endpoint." };
    }
  }

  async listModels(): Promise<LocalModel[]> {
    try {
      const res = await fetch(`${this.endpoint}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: any) => ({
        id: m.name,
        name: m.name,
        sizeBytes: m.size,
        details: m.details || {},
      }));
    } catch {
      return [];
    }
  }

  async generateText(prompt: string, model: string, options?: Record<string, any>): Promise<string> {
    const res = await fetch(`${this.endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "llama3:8b",
        prompt,
        stream: false,
        ...options,
      }),
    });
    if (!res.ok) throw new Error(`Ollama generation failed with status ${res.status}`);
    const data = await res.json();
    return data.response || "";
  }
}

/**
 * 2. LM Studio Local AI Adapter
 * Default Endpoint: http://localhost:1234/v1
 */
export class LMStudioAdapter implements LocalAIAdapter {
  providerType = "lm-studio";
  endpoint: string;

  constructor(endpoint: string = "http://localhost:1234/v1") {
    this.endpoint = endpoint.replace(/\/$/, "");
  }

  async testConnection(): Promise<ConnectionStatus> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${this.endpoint}/models`, { signal: controller.signal });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        const data = await res.json();
        const models = (data.data || []).map((m: any) => m.id);
        return { success: true, providerType: this.providerType, endpoint: this.endpoint, latencyMs, models };
      }
      return { success: false, providerType: this.providerType, endpoint: this.endpoint, latencyMs, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, providerType: this.providerType, endpoint: this.endpoint, latencyMs: Date.now() - startTime, error: "LM Studio server unreachable at endpoint." };
    }
  }

  async listModels(): Promise<LocalModel[]> {
    try {
      const res = await fetch(`${this.endpoint}/models`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
      }));
    } catch {
      return [];
    }
  }

  async generateText(prompt: string, model: string, options?: Record<string, any>): Promise<string> {
    const res = await fetch(`${this.endpoint}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "local-model",
        messages: [{ role: "user", content: prompt }],
        ...options,
      }),
    });
    if (!res.ok) throw new Error(`LM Studio generation failed with status ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
}

/**
 * 3. OpenAI-Compatible Local Runtime Adapter (vLLM, LocalAI, etc.)
 */
export class OpenAICompatibleAdapter implements LocalAIAdapter {
  providerType = "openai-compatible";
  endpoint: string;

  constructor(endpoint: string = "http://localhost:8000/v1") {
    this.endpoint = endpoint.replace(/\/$/, "");
  }

  async testConnection(): Promise<ConnectionStatus> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${this.endpoint}/models`, { signal: controller.signal });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      if (res.ok || res.status === 401) {
        return { success: true, providerType: this.providerType, endpoint: this.endpoint, latencyMs };
      }
      return { success: false, providerType: this.providerType, endpoint: this.endpoint, latencyMs, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, providerType: this.providerType, endpoint: this.endpoint, latencyMs: Date.now() - startTime, error: "OpenAI-compatible server unreachable." };
    }
  }

  async listModels(): Promise<LocalModel[]> {
    try {
      const res = await fetch(`${this.endpoint}/models`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map((m: any) => ({ id: m.id, name: m.id }));
    } catch {
      return [];
    }
  }

  async generateText(prompt: string, model: string, options?: Record<string, any>): Promise<string> {
    const res = await fetch(`${this.endpoint}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "default",
        messages: [{ role: "user", content: prompt }],
        ...options,
      }),
    });
    if (!res.ok) throw new Error(`Local OpenAI generation failed with status ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
}

/**
 * Adapter Factory
 */
export function createLocalAIAdapter(providerType: string, endpoint?: string): LocalAIAdapter {
  switch (providerType) {
    case "ollama":
      return new OllamaAdapter(endpoint || "http://localhost:11434");
    case "lm-studio":
      return new LMStudioAdapter(endpoint || "http://localhost:1234/v1");
    case "openai-compatible":
    case "custom":
    default:
      return new OpenAICompatibleAdapter(endpoint || "http://localhost:8000/v1");
  }
}
