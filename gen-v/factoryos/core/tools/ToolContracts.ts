/**
 * FactoryOS v0.1 — Tool Contracts
 *
 * Defines typed contracts for tool definitions, tool contexts, and tool results.
 * Tools are pure, registered capabilities that Workers can invoke.
 *
 * Dependency Direction: ShortsFactory → FactoryOS
 * Zero ShortsFactory imports. Zero external cloud / network requirements.
 */

export interface ToolContext {
  workflowId: string;
  runId: string;
  stepId: string;
  toolId: string;
  signal?: AbortSignal;
}

export interface ToolErrorPayload {
  code: string;
  message: string;
  cause?: unknown;
}

export interface ToolResult<TOutput = unknown> {
  success: boolean;
  output?: TOutput;
  error?: ToolErrorPayload;
  durationMs?: number;
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
  validateInput?(input: unknown): ValidationResult<TInput>;
  execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>>;
}

/** Function injected into WorkerContext allowing Workers to call tools */
export type ToolInvoker = <TInput = unknown, TOutput = unknown>(
  toolId: string,
  input: TInput
) => Promise<ToolResult<TOutput>>;

/** Convenience factory for successful tool result */
export function toolOk<T>(output: T, durationMs?: number): ToolResult<T> {
  return { success: true, output, durationMs };
}

/** Convenience factory for failed tool result */
export function toolFail(
  code: string,
  message: string,
  cause?: unknown,
  durationMs?: number
): ToolResult<never> {
  return { success: false, error: { code, message, cause }, durationMs };
}
