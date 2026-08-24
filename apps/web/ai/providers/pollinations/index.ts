import { PollinationsProviderPlugin } from "./provider";
import { AIProviderRegistry } from "../../capability-registry";

export const pollinationsProvider = new PollinationsProviderPlugin();

// Auto-register inside capabilities registry
AIProviderRegistry.registerPlugin(pollinationsProvider);

console.log("[Pollinations] dynamic provider successfully loaded and initialized.");
