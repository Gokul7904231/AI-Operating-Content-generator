/**
 * DAGRunner — Directed Acyclic Graph Step Scheduler
 *
 * Executes workflow steps defined with `dependsOn` arrays.
 * Steps with no unresolved dependencies are run concurrently using Promise.all.
 * This replaces the simple linear for-loop and enables parallel image + voice generation.
 *
 * Architecture:
 *   WorkflowRuntime → DAGRunner.run(steps, context, execFn)
 *   → Topological sort → Wave execution → Parallel groups via Promise.all
 */

import type { WorkflowStep } from "../../content-engines/_loader";
import type { ExecutionContext } from "../../content-engines/_runtime/workflow-runtime";

export type StepExecutorFn = (step: WorkflowStep, context: ExecutionContext) => Promise<void>;

export class DAGRunner {
  /**
   * Execute a DAG of steps. Steps whose dependsOn are all satisfied are
   * dispatched concurrently in a wave. Repeats until all steps complete.
   */
  static async run(
    steps: WorkflowStep[],
    context: ExecutionContext,
    execFn: StepExecutorFn,
    preCompleted?: string[]
  ): Promise<void> {
    const enabled = steps.filter((s) => s.enabled !== false);

    // Build a set of all step IDs for validation
    const allIds = new Set(enabled.map((s) => s.id));

    // Validate all dependsOn references exist
    for (const step of enabled) {
      for (const dep of step.dependsOn ?? []) {
        if (!allIds.has(dep)) {
          throw new Error(
            `[DAGRunner] Step "${step.id}" has unknown dependency "${dep}". Check your workflow DSL.`
          );
        }
      }
    }

    const completed = new Set<string>(preCompleted ?? []);
    const failed = new Set<string>();
    let remaining = [...enabled].filter((s) => !completed.has(s.id));

    while (remaining.length > 0) {
      // Find all steps whose dependencies are satisfied and not yet started
      const wave = remaining.filter((step) => {
        const deps = step.dependsOn ?? [];
        return deps.every((d) => completed.has(d)) && !failed.has(step.id);
      });

      if (wave.length === 0) {
        const blocked = remaining.map((s) => s.id).join(", ");
        const missing = remaining
          .flatMap((s) => s.dependsOn ?? [])
          .filter((d) => !completed.has(d) && !failed.has(d));
        throw new Error(
          `[DAGRunner] Deadlock detected. Blocked steps: [${blocked}]. Unresolved deps: [${[...new Set(missing)].join(", ")}]`
        );
      }

      console.log(
        `[DAGRunner] [${context.jobId}] Executing wave: [${wave.map((s) => s.id).join(", ")}]`
      );

      // Execute the wave concurrently
      await Promise.all(
        wave.map(async (step) => {
          try {
            await execFn(step, context);
            completed.add(step.id);
          } catch (err: any) {
            failed.add(step.id);
            // Re-throw to let WorkflowRuntime handle retry/fail logic
            throw err;
          }
        })
      );

      // Remove completed from remaining
      remaining = remaining.filter((s) => !completed.has(s.id) && !failed.has(s.id));
    }

    console.log(`[DAGRunner] [${context.jobId}] All ${completed.size} steps completed.`);
  }
}
