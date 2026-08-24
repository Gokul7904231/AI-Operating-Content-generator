/**
 * FactoryOS Frontier v3 — Enhanced Tool Contracts
 *
 * Defines typed contracts for tool definitions, tool contexts, capability routing,
 * idempotency, side-effect declarations, risk levels, and execution results.
 */

import { ToolRiskLevel, ToolSideEffect } from "../contracts/PolicyContracts";

export interface ToolContext {
  workflowId: string;
  runId: string;
  stepId: string;
  toolId: string;
  missionId?: string;
  userId?: string;
  userRole?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface ToolErrorPayload {
  code: string;
  message: string;
  cause?: unknown;
  retryable?: boolean;
}

export interface ToolResult<TOutput = unknown> {
  success: boolean;
  output?: TOutput;
  error?: ToolErrorPayload;
  durationMs?: number;
  costUsd?: number;
  sideEffectOccurred?: boolean;
  evidenceId?: string;
}

export interface ValidationResult<T = unknown> {
  valid: boolean;
  error?: string;
  parsed?: T;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly capability?: string;
  readonly riskLevel?: ToolRiskLevel;
  readonly sideEffects?: ToolSideEffect;
  readonly requiredRole?: "VIEWER" | "EDITOR" | "ADMIN" | "OWNER";
  readonly requiredPermissions?: string[];
  readonly estimatedCostUsd?: number;
  readonly timeoutMs?: number;
  readonly supportsIdempotency?: boolean;
  validateInput?(input: unknown): ValidationResult<TInput>;
  execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>>;
}

/** Function injected into WorkerContext allowing Workers to call tools */
export type ToolInvoker = <TInput = unknown, TOutput = unknown>(
  toolId: string,
  input: TInput,
  contextOverride?: Partial<ToolContext>
) => Promise<ToolResult<TOutput>>;

/** Convenience factory for successful tool result */
export function toolOk<T>(output: T, durationMs?: number, costUsd: number = 0): ToolResult<T> {
  return { success: true, output, durationMs, costUsd };
}

/** Convenience factory for failed tool result */
export function toolFail(
  code: string,
  message: string,
  cause?: unknown,
  durationMs?: number,
  retryable: boolean = false
): ToolResult<never> {
  return { success: false, error: { code, message, cause, retryable }, durationMs };
}
