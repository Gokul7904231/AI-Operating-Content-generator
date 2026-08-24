import { AICapability } from "../capability-registry";
import { ChatAdapter, VisionAdapter } from "../execution-adapters";

export interface BaseModelPlugin {
  id: string; // e.g. "claude"
  name: string; // e.g. "Claude Model Family"
  supports: AICapability[];
  
  getConfidenceScore(capability: AICapability): number;
}

export abstract class BaseModelPluginClass implements BaseModelPlugin {
  abstract id: string;
  abstract name: string;
  abstract supports: AICapability[];

  protected confidenceScores = new Map<AICapability, number>();

  getConfidenceScore(capability: AICapability): number {
    return this.confidenceScores.get(capability) ?? 0.8; // default 0.8 confidence
  }

  /**
   * Execution adapter for text script generation tasks.
   */
  async executeScript(
    params: { prompt: string; system?: string; temperature?: number; maxTokens?: number },
    adapter: ChatAdapter,
    signal?: AbortSignal
  ): Promise<string> {
    const res = await adapter.generateText(
      {
        ...params,
        responseFormat: "text",
      },
      signal
    );
    return res.text;
  }

  /**
   * Execution adapter for image vision analysis tasks.
   */
  async executeVision(
    params: { imageUrl: string; prompt: string },
    adapter: VisionAdapter,
    signal?: AbortSignal
  ): Promise<string> {
    const res = await adapter.analyzeImage(params, signal);
    return res.text;
  }

  /**
   * Execution adapter for structured JSON generation.
   */
  async executeJSON(
    params: { prompt: string; system?: string; temperature?: number; maxTokens?: number },
    adapter: ChatAdapter,
    signal?: AbortSignal
  ): Promise<any> {
    const res = await adapter.generateText(
      {
        ...params,
        responseFormat: "json_object",
      },
      signal
    );
    
    try {
      return JSON.parse(res.text);
    } catch {
      // Clean up markdown markers if returned
      const match = res.text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error(`[BaseModelPlugin] Failed to parse model output as valid JSON: ${res.text}`);
    }
  }
}
