/**
 * FactoryOS v0.1 — Workflow Contract
 *
 * Defines the structure of a workflow — its identity, version, and ordered steps.
 *
 * For Step 1: sequential execution only.
 * DAG/parallel execution is deferred to Step 2 (see BACKLOG.md).
 */

import type { Worker } from "./Worker";

/**
 * A complete, immutable workflow definition.
 *
 * `id`      — stable identifier (e.g., "quiz-generation")
 * `version` — semver string (e.g., "0.1.0") — used for checkpoint safety
 * `steps`   — ordered list of Workers to execute sequentially
 */
export interface WorkflowDefinition<TInput = unknown> {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  // biome-ignore lint: Worker generics are intentionally open
  readonly steps: Worker<TInput, any, any>[];
}
