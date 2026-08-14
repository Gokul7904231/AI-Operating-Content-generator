/**
 * FactoryOS — AI Model Registry & Multi-Model Fallback Engine
 * Provides model definitions across supported providers with automatic fallback strategies.
 */

export interface AIModelSpec {
  id: string;
  name: string;
  provider: "Google" | "Groq" | "Anthropic" | "DeepSeek" | "Alibaba" | "Mistral";
  contextWindow: string;
  speed: "Fast" | "Ultra-Fast" | "Balanced" | "High-Reasoning";
  costTier: "Budget" | "Standard" | "Premium";
  supportsVision: boolean;
  recommendedFor: string;
}

export const AVAILABLE_MODELS: AIModelSpec[] = [
  {
    id: "gemini-1.5-flash",
    name: "Google Gemini 1.5 Flash",
    provider: "Google",
    contextWindow: "1M tokens",
    speed: "Ultra-Fast",
    costTier: "Budget",
    supportsVision: true,
    recommendedFor: "High-volume script & scene generation",
  },
  {
    id: "gemini-1.5-pro",
    name: "Google Gemini 1.5 Pro",
    provider: "Google",
    contextWindow: "2M tokens",
    speed: "Balanced",
    costTier: "Standard",
    supportsVision: true,
    recommendedFor: "Complex storytelling & deep RAG reasoning",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Groq Llama 3.3 70B",
    provider: "Groq",
    contextWindow: "128k tokens",
    speed: "Ultra-Fast",
    costTier: "Budget",
    supportsVision: false,
    recommendedFor: "Instant script criticism & rapid dialogue editing",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Anthropic Claude 3.5 Sonnet",
    provider: "Anthropic",
    contextWindow: "200k tokens",
    speed: "Balanced",
    costTier: "Premium",
    supportsVision: true,
    recommendedFor: "High-precision script generation & brand alignment",
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek V3 / R1",
    provider: "DeepSeek",
    contextWindow: "64k tokens",
    speed: "High-Reasoning",
    costTier: "Budget",
    supportsVision: false,
    recommendedFor: "Logical trivia validation & quiz answer checking",
  },
  {
    id: "qwen-2.5-72b",
    name: "Qwen 2.5 72B Instruct",
    provider: "Alibaba",
    contextWindow: "128k tokens",
    speed: "Fast",
    costTier: "Standard",
    supportsVision: true,
    recommendedFor: "Multilingual narration scripts & international topics",
  },
  {
    id: "mistral-large",
    name: "Mistral Large 2",
    provider: "Mistral",
    contextWindow: "128k tokens",
    speed: "Balanced",
    costTier: "Premium",
    supportsVision: false,
    recommendedFor: "Fact verification & news synthesis",
  },
];

export function getModelById(id: string): AIModelSpec {
  return AVAILABLE_MODELS.find((m) => m.id === id) || AVAILABLE_MODELS[0];
}

export function getModelLabel(id: string): string {
  const model = AVAILABLE_MODELS.find((m) => m.id === id);
  return model ? `${model.name} (${model.provider})` : id;
}

/**
 * Executes a function with primary model and falls back to fallback model on error/timeout.
 */
export async function executeWithFallback<T>(
  primaryModelId: string,
  fallbackModelId: string,
  taskFn: (modelId: string) => Promise<T>
): Promise<{ result: T; usedModel: string; fellBack: boolean }> {
  try {
    const result = await taskFn(primaryModelId);
    return { result, usedModel: primaryModelId, fellBack: false };
  } catch (primaryErr: any) {
    console.warn(
      `[AI Model Router] Primary model ${primaryModelId} failed (${primaryErr.message}). Initiating fallback to ${fallbackModelId}...`
    );
    const result = await taskFn(fallbackModelId);
    return { result, usedModel: fallbackModelId, fellBack: true };
  }
}
