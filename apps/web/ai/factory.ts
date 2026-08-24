/**
 * @deprecated Legacy factory bridge — superseded by the AIProviderRegistry plugin system.
 * Will be removed in Phase 3 cleanup.
 */
import { AIProviderRegistry } from "./capability-registry";
import { LLMProvider, LLMProviderAdapter } from "./provider";
import { getProviderWithFallback } from "./providers/factory_with_fallback";

export function providerFactory(provider: LLMProvider, ctx: { apiKey?: string }): LLMProviderAdapter {
  // Bridge old code to the new plugin registry
  const plugin = getProviderWithFallback(provider as string);

  return {
    async generateText(params) {
      if (!plugin) throw new Error(`No provider plugin found for: ${provider}`);
      const result = await plugin.execute("SCRIPT", params);
      // LLMProviderAdapter.generateText must return Promise<string>
      if (typeof result === "string") return result;
      if (result && typeof result === "object" && "text" in result) return result.text as string;
      return String(result ?? "");
    },
  };
}
