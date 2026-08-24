/**
 * FactoryOS API & Local AI Configuration Data Types
 * Open Design-aligned Provider Architecture with Local Runtimes & Cognitive Engine
 */

export type ProviderMode = "cloud" | "local";
export type LocalProviderType = "ollama" | "openai-compatible" | "lm-studio" | "vllm" | "custom";
export type ProviderCategory = "llm" | "image" | "voice" | "search" | "storage" | "publishing" | "rendering" | "local_ai";

export interface ModelCapability {
  textGeneration?: boolean;
  multimodal?: boolean;
  structuredOutput?: boolean;
  functionCalling?: boolean;
  searchGrounding?: boolean;
  imageGeneration?: boolean;
  voiceGeneration?: boolean;
  embedding?: boolean;
  computerUse?: boolean;
  reasoning?: boolean;
}

export interface DiscoveredModel {
  id: string;
  name: string;
  source: string; // e.g. "From your account" or "Local Runtime"
  capabilities: string[];
  maxTokens?: number;
}

export interface ApiCredential {
  id: string;
  name: string;
  type: "api" | "local";
  isPrimary: boolean;
  enabled: boolean;
  priority: number;
  mode: ProviderMode;
  localProviderType?: LocalProviderType;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  hasKey?: boolean;
  maskedKey?: string;
  lastTested?: string;
  status: "connected" | "failed" | "not_configured" | "degraded" | "rate_limited" | "unauthorized";
  latencyMs?: number;
  discoveredModels?: DiscoveredModel[];
  customEndpoint?: boolean;
  isFreeTier?: boolean;
}

export interface ApiProviderConfig {
  id: string;
  name: string;
  category: ProviderCategory;
  description: string;
  mode: ProviderMode;
  enabled: boolean;
  allowCloudFallback: boolean;
  providerPreset?: string;
  defaultBaseUrl?: string;
  getKeyUrl?: string;
  primary: ApiCredential;
  fallbacks: ApiCredential[];
}

export interface ApiConfigSummary {
  totalProviders: number;
  connectedCount: number;
  degradedCount: number;
  notConfiguredCount: number;
  localCount: number;
  cloudFallbackEnabledCount: number;
}
