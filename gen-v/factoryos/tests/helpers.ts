/**
 * FactoryOS v0.1 — Test Helpers
 *
 * Deterministic test workers. Zero LLMs, zero network, zero databases.
 *
 * Test workflow:
 *   Worker A: input + 1     (input: 5 → output: 6)
 *   Worker B: result * 2    (6 → 12)
 *   Worker C: result → str  (12 → "12")
 */

import type { Worker, WorkerContext } from "../core/contracts/Worker";
import type { WorkerResult } from "../core/contracts/Result";
import { ok, fail } from "../core/contracts/Result";

type NumInput = { value: number };
type AccumulatedOutputs = Record<string, unknown>;

// ─── Execution counters (reset between tests) ─────────────────────────────────

export const counters = {
  a: 0,
  b: 0,
  c: 0,
  reset() {
    this.a = 0;
    this.b = 0;
    this.c = 0;
  },
};

// ─── Worker A: value + 1 ──────────────────────────────────────────────────────

export class WorkerA implements Worker<NumInput, number, AccumulatedOutputs> {
  readonly id = "worker-a";

  async execute(
    ctx: WorkerContext<NumInput, AccumulatedOutputs>
  ): Promise<WorkerResult<number>> {
    counters.a++;
    const result = ctx.input.value + 1;
    return ok(result);
  }
}

// ─── Worker B (succeeding) ────────────────────────────────────────────────────

export class WorkerB implements Worker<NumInput, number, AccumulatedOutputs> {
  readonly id = "worker-b";

  async execute(
    ctx: WorkerContext<NumInput, AccumulatedOutputs>
  ): Promise<WorkerResult<number>> {
    counters.b++;
    const prevOutput = ctx.accumulated["worker-a"] as number | undefined;
    const base = prevOutput ?? ctx.input.value;
    const result = base * 2;
    return ok(result);
  }
}

// ─── Worker B (failing) ───────────────────────────────────────────────────────

export class WorkerBFailing implements Worker<NumInput, number, AccumulatedOutputs> {
  readonly id = "worker-b";

  async execute(
    _ctx: WorkerContext<NumInput, AccumulatedOutputs>
  ): Promise<WorkerResult<number>> {
    counters.b++;
    return fail("INTENTIONAL_FAILURE", "Worker B intentionally failed for testing");
  }
}

// ─── Worker B (failing by throw) ─────────────────────────────────────────────

export class WorkerBThrowing implements Worker<NumInput, number, AccumulatedOutputs> {
  readonly id = "worker-b";

  async execute(
    _ctx: WorkerContext<NumInput, AccumulatedOutputs>
  ): Promise<WorkerResult<number>> {
    counters.b++;
    throw new Error("Worker B threw an exception for testing");
  }
}

// ─── Worker C: number → string ────────────────────────────────────────────────

export class WorkerC implements Worker<NumInput, string, AccumulatedOutputs> {
  readonly id = "worker-c";

  async execute(
    ctx: WorkerContext<NumInput, AccumulatedOutputs>
  ): Promise<WorkerResult<string>> {
    counters.c++;
    const prevOutput = ctx.accumulated["worker-b"] as number | undefined;
    const val = prevOutput ?? 0;
    return ok(String(val));
  }
}

// ─── Workflow definition helpers ──────────────────────────────────────────────

import type { WorkflowDefinition } from "../core/contracts/Workflow";

export function makeSuccessWorkflow(): WorkflowDefinition<NumInput> {
  return {
    id: "factory-test",
    name: "Factory Test Workflow",
    version: "0.1.0",
    steps: [new WorkerA(), new WorkerB(), new WorkerC()],
  };
}

export function makeFailureWorkflow(): WorkflowDefinition<NumInput> {
  return {
    id: "factory-test",
    name: "Factory Test Workflow",
    version: "0.1.0",
    steps: [new WorkerA(), new WorkerBFailing(), new WorkerC()],
  };
}

export function makeThrowingWorkflow(): WorkflowDefinition<NumInput> {
  return {
    id: "factory-test",
    name: "Factory Test Workflow",
    version: "0.1.0",
    steps: [new WorkerA(), new WorkerBThrowing(), new WorkerC()],
  };
}

/** Workflow used for resume: A(pass), B now passes (was failing) */
export function makeResumeWorkflow(): WorkflowDefinition<NumInput> {
  return {
    id: "factory-test",
    name: "Factory Test Workflow",
    version: "0.1.0",
    steps: [new WorkerA(), new WorkerB(), new WorkerC()],
  };
}
