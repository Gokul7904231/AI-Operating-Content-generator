import { AIProviderRegistry } from "../../ai/capability-registry";
import { MetricsDB } from "../queue-db";

export interface ProviderHealth {
  id: string;
  name: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  latency: number;
  modelCount: number;
  supportsChat: boolean;
  supportsImage: boolean;
  supportsVision: boolean;
  supportsEmbeddings: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
  quota?: string;
}

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(id);
  }
}

class ProviderVerifierClass {
  async verifyAll(providersList: any[]): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];

    for (const prov of providersList) {
      const result = await this.verifyProvider(prov);
      results.push(result);

      // Record to SQLite queue_metrics for analytics
      try {
        MetricsDB.record(
          result.status === "ONLINE" ? "success" : "failure",
          "engine",
          result.status === "ONLINE" ? 1 : 0,
          {
            provider: result.id,
            latency: String(result.latency),
            modelCount: String(result.modelCount),
            supportsChat: String(result.supportsChat),
            supportsImage: String(result.supportsImage),
            supportsVision: String(result.supportsVision),
            supportsEmbeddings: String(result.supportsEmbeddings),
            supportsAudio: String(result.supportsAudio),
            supportsVideo: String(result.supportsVideo),
          }
        );
      } catch {}
    }

    return results;
  }

  async verifyProvider(prov: any): Promise<ProviderHealth> {
    const id = prov.id;
    const name = prov.name;
    const baseUrl = prov.baseUrl;
    const apiKey = prov.apiKey; // Decrypted or process fallback key
    
    const health: ProviderHealth = {
      id,
      name,
      status: "OFFLINE",
      latency: 9999,
      modelCount: 0,
      supportsChat: false,
      supportsImage: false,
      supportsVision: false,
      supportsEmbeddings: false,
      supportsAudio: false,
      supportsVideo: false,
      quota: "Unlimited (Free / Community)"
    };

    const start = Date.now();
    try {
      if (id === "pollinations") {
        const res = await fetchWithTimeout(`${baseUrl}/v1/models`);
        if (res.ok) {
          health.status = "ONLINE";
          health.latency = Date.now() - start;
          const data = await res.json();
          health.modelCount = Array.isArray(data) ? data.length : data?.data?.length || 10;
          health.supportsChat = true;
          health.supportsImage = true;
          health.supportsAudio = true;
          health.supportsVideo = true;
          health.supportsVision = true;
        } else {
          await res.text(); // Consume body to release socket
        }
      } else if (id === "google-ai" || id === "google") {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) throw new Error("Missing Google Key");
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const res = await fetchWithTimeout(url);
        if (res.ok) {
          health.status = "ONLINE";
          health.latency = Date.now() - start;
          const data = await res.json();
          health.modelCount = data?.models?.length || 5;
          health.supportsChat = true;
          health.supportsVision = true;
          health.supportsEmbeddings = true;
          health.quota = "15 RPM / 1500 RPD";
        } else {
          await res.text(); // Consume body to release socket
        }
      } else if (id === "groq") {
        const key = apiKey || process.env.GROQ_API_KEY;
        if (!key) throw new Error("Missing Groq Key");

        const res = await fetchWithTimeout(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${key}` }
        });
        if (res.ok) {
          health.status = "ONLINE";
          health.latency = Date.now() - start;
          const data = await res.json();
          health.modelCount = data?.data?.length || 3;
          health.supportsChat = true;
          health.quota = "30 RPM";
        } else {
          await res.text(); // Consume body to release socket
        }
      } else if (id === "nvidia") {
        const key = apiKey || process.env.NVIDIA_API_KEY;
        if (!key) throw new Error("Missing NVIDIA Key");

        const res = await fetchWithTimeout(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${key}` }
        });
        if (res.ok) {
          health.status = "ONLINE";
          health.latency = Date.now() - start;
          const data = await res.json();
          health.modelCount = data?.data?.length || 5;
          health.supportsChat = true;
          health.supportsVision = true;
          health.supportsEmbeddings = true;
        } else {
          await res.text(); // Consume body to release socket
        }
      } else if (id === "openrouter") {
        const key = apiKey || process.env.OPENROUTER_API_KEY;
        if (!key) throw new Error("Missing OpenRouter Key");

        const res = await fetchWithTimeout(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${key}` }
        });
        if (res.ok) {
          health.status = "ONLINE";
          health.latency = Date.now() - start;
          const data = await res.json();
          health.modelCount = data?.data?.length || 20;
          health.supportsChat = true;
          health.supportsVision = true;
        } else {
          await res.text(); // Consume body to release socket
        }
      } else if (id === "zai") {
        const key = apiKey || process.env.ZAI_API_KEY;
        if (!key) throw new Error("Missing ZAI Key");

        const res = await fetchWithTimeout(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${key}` }
        });
        if (res.ok) {
          health.status = "ONLINE";
          health.latency = Date.now() - start;
          const data = await res.json();
          health.modelCount = data?.data?.length || 1;
          health.supportsChat = true;
        } else {
          await res.text(); // Consume body to release socket
        }
      }
    } catch (err: any) {
      health.status = "OFFLINE";
      health.quota = `Error: ${err.message || err}`;
    }

    return health;
  }
}

export const ProviderVerifier = new ProviderVerifierClass();
