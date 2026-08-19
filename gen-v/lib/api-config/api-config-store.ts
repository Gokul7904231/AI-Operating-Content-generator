/**
 * FactoryOS API & Local AI Configuration Data Types
 */

export type ProviderMode = "cloud" | "local";
export type LocalProviderType = "ollama" | "openai-compatible" | "lm-studio" | "custom";
export type ProviderCategory = "llm" | "image" | "voice" | "embedding" | "storage" | "publishing" | "rendering" | "local_ai";

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
  hasKey?: boolean;
  maskedKey?: string;
  lastTested?: string;
  status: "connected" | "failed" | "not_configured";
}

export interface ApiProviderConfig {
  id: string;
  name: string;
  category: ProviderCategory;
  description: string;
  mode: ProviderMode;
  enabled: boolean;
  allowCloudFallback: boolean;
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
