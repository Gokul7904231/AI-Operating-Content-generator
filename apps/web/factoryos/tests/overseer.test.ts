/**
 * FactoryOS v0.1 — Step 8 Overseer Tests
 *
 * Verifies active run monitoring, failure diagnostics/remediation, and
 * operator interventions (Pause, Cancel, Step Force-Completion & Resume).
 */

import { describe, it, expect, beforeEach } from "vitest";

import { FactoryRuntime } from "../core/runtime/FactoryRuntime";
import { OverseerImpl } from "../core/overseer/OverseerImpl";

import type { Worker, WorkerContext } from "../core/contracts/Worker";
import type { WorkerResult } from "../core/contracts/Result";
import { ok, fail } from "../core/contracts/Result";
import type { WorkflowDefinition } from "../core/contracts/Workflow";

// ─── Mock Workers ────────────────────────────────────────────────────────────

class FailingWorker implements Worker<any, any> {
  readonly id = "stepA";
  async execute(): Promise<WorkerResult<any>> {
    return fail("INTENTIONAL_FAIL", "Validation failed for tool calculator.add: missing a");
  }
}

class SuccessWorker implements Worker<any, any, any> {
  readonly id = "stepB";
  async execute(ctx: WorkerContext<any, any>): Promise<WorkerResult<any>> {
    const inputFromA = ctx.accumulated["stepA"] || {};
    return ok({ stepBResult: "succeeded", receivedFromA: inputFromA });
  }
}

describe("FactoryOS v0.1 — Overseer Supervisory Control Plane", () => {
  let runtime: FactoryRuntime;
  let overseer: OverseerImpl;

  beforeEach(() => {
    runtime = new FactoryRuntime();
    overseer = new OverseerImpl(runtime);
  });

  it("monitors active runs and removes them on completion", async () => {
    const worker = {
      id: "step1",
      execute: async () => {
        await new Promise((r) => setTimeout(r, 80));
        return ok({ val: 1 });
      },
    };
    const workflow: WorkflowDefinition<any> = {
      id: "wf-mon",
      name: "Mon",
      version: "1.0.0",
      steps: [worker],
    };

    const runPromise = runtime.start(workflow, {});
    // Yield to let the event loop process start events
    await new Promise((r) => setTimeout(r, 20));

    const active = await overseer.getActiveRuns();
    expect(active.length).toBeGreaterThanOrEqual(1);

    const run = await runPromise;
    expect(run.status).toBe("COMPLETED");

    // Yield to let the event loop process completed events
    await new Promise((r) => setTimeout(r, 20));

    const activeAfter = await overseer.getActiveRuns();
    expect(activeAfter).toHaveLength(0);
  });

  it("diagnoses a ToolValidationError and suggests correct remediation", async () => {
    const workflow: WorkflowDefinition<any> = {
      id: "wf-fail",
      name: "Fail",
      version: "1.0.0",
      steps: [new FailingWorker()],
    };

    const run = await runtime.start(workflow, {});
    expect(run.status).toBe("FAILED");

    const diagnosis = await overseer.analyzeFailure(run.runId);
    expect(diagnosis).not.toBeNull();
    expect(diagnosis!.failedStepId).toBe("stepA");
    expect(diagnosis!.errorClass).toBe("ToolValidationError");
    expect(diagnosis!.remediationSuggestion).toContain("Verify the input argument schema");
  });

  it("fails to force-complete step autonomously because privileged overrides are disabled", async () => {
    const workflow: WorkflowDefinition<any> = {
      id: "wf-force",
      name: "Force Complete",
      version: "1.0.0",
      steps: [new FailingWorker(), new SuccessWorker()],
    };

    // 1. Start execution -> fails at stepA
    let run = await runtime.start(workflow, {});
    expect(run.status).toBe("FAILED");
    expect(run.steps["stepA"].status).toBe("FAILED");

    // 2. Operator attempts to force-complete stepA, which must fail
    const overriddenOutput = { customKey: "overrideValue" };
    await expect(
      overseer.forceCompleteStep(run.runId, "stepA", overriddenOutput)
    ).rejects.toThrow("[Overseer Security] Privileged force-completion is DISABLED");
  });
});
