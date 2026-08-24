import { AICapability, ModelMeta } from "./capability-registry";
import { ModelDiscoveryService } from "./model-discovery";

export interface NegotiationRequirements {
  capability: AICapability;
  version?: string; // e.g. "v1", "v2"
  jsonRequired?: boolean;
  visionRequired?: boolean;
  streamingRequired?: boolean;
  functionCallingRequired?: boolean;
  contextWindowMinimum?: number;
  maxCostLimit?: number;
}

class CapabilityResolverClass {
  /**
   * Resolves negotiation requirements against all discovered models, returning
   * only candidates that fully satisfy the capability constraints.
   */
  async resolve(requirements: NegotiationRequirements): Promise<ModelMeta[]> {
    console.log(`[CapabilityResolver] Negotiating model capabilities for: ${requirements.capability} (${requirements.version || "any"})`);
    
    // Get all models that support the core capability
    const candidates = await ModelDiscoveryService.getModelsForCapability(requirements.capability);
    const resolved: ModelMeta[] = [];

    for (const model of candidates) {
      // 1. Validate Context Window
      if (requirements.contextWindowMinimum !== undefined) {
        if (model.contextWindow < requirements.contextWindowMinimum) {
          continue;
        }
      }

      // 2. Validate Cost limits
      if (requirements.maxCostLimit !== undefined) {
        const totalEstimatedCost = model.costInput + model.costOutput;
        if (totalEstimatedCost > requirements.maxCostLimit) {
          continue;
        }
      }

      // 3. Validate Vision Support
      if (requirements.visionRequired) {
        if (!model.capabilities.includes("VISION")) {
          continue;
        }
      }

      // 4. Validate JSON capability
      if (requirements.jsonRequired) {
        // Tag checking or custom heuristics for JSON support
        const modelIdLower = model.id.toLowerCase();
        const supportsJson = 
          modelIdLower.includes("gpt-") || 
          modelIdLower.includes("gemini") || 
          modelIdLower.includes("claude") || 
          modelIdLower.includes("llama-3") || 
          (model.tags && model.tags.includes("json"));

        if (!supportsJson) {
          continue;
        }
      }

      // 5. Validate Streaming support
      if (requirements.streamingRequired) {
        const isLocal = model.isLocal;
        const supportsStreaming = !isLocal || modelIdLowerContains(model.id, ["ollama", "lmstudio"]);
        if (!supportsStreaming) {
          continue;
        }
      }

      // Candidate is valid
      resolved.push(model);
    }

    console.log(`[CapabilityResolver] Resolved ${resolved.length} valid model candidates.`);
    return resolved;
  }
}

function modelIdLowerContains(id: string, searchTerms: string[]): boolean {
  const lower = id.toLowerCase();
  return searchTerms.some((term) => lower.includes(term));
}

export const CapabilityResolver = new CapabilityResolverClass();
