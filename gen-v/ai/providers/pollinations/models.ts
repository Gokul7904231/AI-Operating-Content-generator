import { ModelMeta } from "../../capability-registry";
import { PollinationsCapabilityResolver } from "./capabilities";

export class PollinationsModelDiscovery {
  private static cache: ModelMeta[] = [];
  private static lastFetched = 0;
  private static cacheTtl = 5 * 60 * 1000; // 5 minutes cache TTL

  static async discover(baseUrl: string, apiKey?: string): Promise<ModelMeta[]> {
    const now = Date.now();
    if (this.cache.length > 0 && now - this.lastFetched < this.cacheTtl) {
      return this.cache;
    }

    try {
      console.log(`[PollinationsModelDiscovery] Fetching dynamic models list from ${baseUrl}/v1/models...`);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const res = await fetch(`${baseUrl}/v1/models`, { headers, method: "GET" });
      if (!res.ok) {
        throw new Error(`Endpoint returned HTTP ${res.status}`);
      }

      const data = await res.json();
      // Handle array or OpenAI style { data: [...] }
      const list = Array.isArray(data) ? data : data?.data || [];
      const discovered: ModelMeta[] = [];

      for (const item of list) {
        const id = item.id || item;
        const type = item.type || (id.includes("flux") || id.includes("sd") ? "image" : "text");
        const capabilities = PollinationsCapabilityResolver.infer(id, type);

        discovered.push({
          id: `pollinations/${id}`,
          name: item.name || id,
          provider: "pollinations",
          capabilities,
          contextWindow: type === "text" ? 32768 : 0,
          costInput: 0.0, // Pollinations is currently free / community based
          costOutput: 0.0,
          speed: type === "image" ? 45 : 85,
          health: 1.0,
          availability: true,
          isLocal: false,
          tags: ["pollinations", type, "dynamic"],
        });
      }

      if (discovered.length > 0) {
        this.cache = discovered;
        this.lastFetched = now;
        return this.cache;
      }
    } catch (err: any) {
      console.warn(`[PollinationsModelDiscovery] Failed to query dynamic endpoint: ${err.message}. Using fallback model registry...`);
    }

    // Static fallback models in case the network/api is down
    return this.getStaticFallbacks();
  }

  private static getStaticFallbacks(): ModelMeta[] {
    return [
      {
        id: "pollinations/flux",
        name: "Flux-Schnell (Pollinations)",
        provider: "pollinations",
        capabilities: ["IMAGE", "THUMBNAIL"],
        contextWindow: 0,
        costInput: 0.0,
        costOutput: 0.0,
        speed: 40,
        health: 1.0,
        availability: true,
        isLocal: false,
        tags: ["pollinations", "image"],
      },
      {
        id: "pollinations/qwen-2.5-coder-32b",
        name: "Qwen 2.5 Coder 32B (Pollinations)",
        provider: "pollinations",
        capabilities: ["SCRIPT", "TRANSLATION"],
        contextWindow: 32768,
        costInput: 0.0,
        costOutput: 0.0,
        speed: 85,
        health: 1.0,
        availability: true,
        isLocal: false,
        tags: ["pollinations", "text"],
      },
      {
        id: "pollinations/llama-3.3-70b-instruct",
        name: "Llama 3.3 70B Instruct (Pollinations)",
        provider: "pollinations",
        capabilities: ["SCRIPT", "CLASSIFICATION"],
        contextWindow: 32768,
        costInput: 0.0,
        costOutput: 0.0,
        speed: 80,
        health: 1.0,
        availability: true,
        isLocal: false,
        tags: ["pollinations", "text"],
      }
    ];
  }
}
