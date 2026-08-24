/**
 * FactoryOS v0.1 — Worker Contract
 *
 * Every step in a FactoryOS workflow must implement this interface.
 * Workers are pure: they receive an ExecutionContext and return a WorkerResult.
 *
 * Dependency direction: ShortsFactory → FactoryOS
 * FactoryOS Worker must NOT import any ShortsFactory-specific modules.
 */

import type { WorkerResult } from "./Result";
import type { ToolInvoker } from "../tools/ToolContracts";

/**
 * The controlled execution context injected into every Worker.
 *
 * Workers must NOT mutate global state directly.
 * Side effects are expressed through WorkerResult.output only.
 */
export interface WorkerContext<TInput = unknown, TAccumulated = unknown> {
  /** Stable identifier for the workflow definition */
  workflowId: string;
  /** Stable identifier for this specific execution run */
  runId: string;
  /** Stable identifier for this step */
  stepId: string;
  /** Original workflow input */
  input: TInput;
  /** Accumulated outputs from previously completed steps */
  accumulated: TAccumulated;
  /** AbortSignal for cooperative cancellation */
  signal?: AbortSignal;
  /** Tool invoker allowing workers to execute registered capabilities */
  tools?: ToolInvoker;
}

/**
 * Generic worker/step interface.
 *
 * - `id` must be stable and unique within a workflow.
 * - `execute` must be deterministic given the same context.
 * - Exceptions are caught by the runtime and normalized into WorkerResult failures.
 */
export interface Worker<TInput = unknown, TOutput = unknown, TAccumulated = unknown> {
  readonly id: string;
  readonly allowedTools?: string[];
  execute(
    context: WorkerContext<TInput, TAccumulated>,
    signal?: AbortSignal
  ): Promise<WorkerResult<TOutput>>;
}
