/**
 * FactoryOS / ShortForge Basic AI Generation Provider Types
 * =========================================================
 * Authoritative types for the 3-tier multi-provider AI generation subsystem
 * and Auto Model Selection architecture.
 */

export type AIProviderSlot = "GEMINI" | "FALLBACK_1" | "FALLBACK_2";

export interface NormalizedScene {
  contactText: string;
  imagePrompt: string;
}

export interface NormalizedQuizQuestion {
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: string[];
  answer: string;
  answerIndex?: number;
  explanation?: string;
}

export interface BasicVideoGenerationRequest {
  topic: string;
  contentType?: "FACTS" | "QUIZ_SHORTS" | "MOTIVATIONAL" | "STORY" | string;
  durationSeconds?: number;
  style?: string;
  tone?: string;
  questionsCount?: number;
  hook?: string;
  requiredCapabilities?: ModelRequirements;
}

export interface BasicVideoGenerationContent {
  script: string;
  scenes: NormalizedScene[];
  hook?: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  questions?: NormalizedQuizQuestion[];
}

export interface ProviderAttemptRecord {
  provider: string;
  model?: string;
  status: "success" | "failed" | "cooldown";
  reason?: string;
  latencyMs?: number;
  timestamp?: string;
}

export interface BasicVideoGenerationResult {
  success: boolean;
  provider: string;
  model: string;
  selectionMode: "AUTO" | "MANUAL" | "EXPLICIT";
  content: BasicVideoGenerationContent;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
  };
  providerAttempts: ProviderAttemptRecord[];
  modelSelectionInfo?: ModelSelectionResult;
}

export interface ProviderHealthInfo {
  name: string;
  configured: boolean;
  status: "healthy" | "degraded" | "cooldown" | "unconfigured";
  consecutiveFailures: number;
  totalRequests: number;
  totalSuccesses: number;
  totalFailures: number;
  lastFailureAt?: string;
  cooldownUntil?: string;
  selectedModel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalized Model Object & Requirements
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderModel {
  id: string;
  provider: string;
  displayName: string;
  available: boolean;
  supportsText: boolean;
  supportsVision: boolean;
  supportsImageGeneration: boolean;
  supportsStructuredOutput: boolean;
  supportsJson: boolean;
  supportsStreaming: boolean;
  contextWindow: number;
  inputTokenCost: number;
  outputTokenCost: number;
  qualityScore: number;
  speedScore: number;
  priorityScore: number;
  deprecated: boolean;
  blocked: boolean;
}

export interface ModelRequirements {
  text?: boolean;
  json?: boolean;
  structuredOutput?: boolean;
  vision?: boolean;
  imageGeneration?: boolean;
  streaming?: boolean;
  minContextWindow?: number;
}

export interface ModelSelectionWeights {
  quality: number;
  speed: number;
  cost: number;
  context: number;
  priority: number;
}

export interface ModelSelectionResult {
  provider: string;
  selectionMode: "AUTO" | "MANUAL" | "EXPLICIT";
  modelId: string;
  modelDisplayName: string;
  score: number;
  capabilities: {
    text: boolean;
    vision: boolean;
    json: boolean;
    imageGeneration: boolean;
    structuredOutput: boolean;
  };
  selectionReason: string;
  discoveryTimeMs: number;
  selectionTimeMs: number;
}
