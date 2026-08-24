/**
 * Workflow Step Registry
 *
 * Registers reusable step executors.
 * Allows steps like script, critic, scene, voice, image, render, upload, publish.
 * Supports plugin additions without touching the core runtime engine.
 */

import type { ExecutionContext } from "./workflow-runtime";

export type StepExecutor = (context: ExecutionContext) => Promise<void>;

class WorkflowStepRegistryClass {
  private registry = new Map<string, StepExecutor>();

  /**
   * Register a new step executor.
   */
  register(id: string, executor: StepExecutor): void {
    console.log(`[WorkflowStepRegistry] Registered executor for step: "${id}"`);
    this.registry.set(id, executor);
  }

  /**
   * Resolve a step executor.
   */
  get(id: string): StepExecutor | undefined {
    return this.registry.get(id);
  }

  /**
   * Check if a step is registered.
   */
  has(id: string): boolean {
    return this.registry.has(id);
  }
}

export const WorkflowStepRegistry = new WorkflowStepRegistryClass();
