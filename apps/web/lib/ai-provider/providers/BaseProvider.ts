/**
 * Base AI Provider Interface
 * ===========================
 * Defines the contract that all concrete provider slots (Gemini, Fallback 1, Fallback 2) implement.
 */

import {
  BasicVideoGenerationRequest,
  BasicVideoGenerationResult,
  ProviderModel,
  ModelRequirements,
  ModelSelectionResult,
} from "../types";

export interface ProviderExecutionOptions {
  timeoutMs?: number;
}

export interface IAIProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  listModels(): Promise<ProviderModel[]>;
  selectModel(requirements?: ModelRequirements): Promise<{ model: ProviderModel; result: ModelSelectionResult }>;
  generate(
    request: BasicVideoGenerationRequest,
    model?: ProviderModel | string,
    options?: ProviderExecutionOptions
  ): Promise<BasicVideoGenerationResult>;
}
