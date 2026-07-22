/**
 * @deprecated This factory file is superseded by the AIProviderRegistry plugin system.
 * Use AIProviderRegistry.getPlugin(providerId) instead.
 *
 * Retained for backward-compatibility during the Phase 2B transition.
 * Will be removed in Phase 3 cleanup.
 */
import { AIProviderRegistry } from "../capability-registry";
import { googleProvider } from "./google";
import { groqProvider } from "./groq";
import { openRouterProvider } from "./openrouter";
import { pollinationsProvider } from "./pollinations/index";
import { zaiProvider } from "./zai";

export { googleProvider, groqProvider, openRouterProvider, pollinationsProvider, zaiProvider };

export function getProviderWithFallback(providerId: string) {
  const plugin = AIProviderRegistry.getPlugin(providerId);
  if (plugin) return plugin;
  // Fallback to OpenRouter
  return AIProviderRegistry.getPlugin("openrouter");
}
