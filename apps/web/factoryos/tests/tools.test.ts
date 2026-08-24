/**
 * FactoryOS v0.1 — Step 2 Tool Registry & Structured Tool Calling Tests
 *
 * Comprehensive unit, integration, and red-team test suite for Step 2.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { ToolRegistry } from "../core/tools/ToolRegistry";
import { ToolExecutor } from "../core/tools/ToolExecutor";
import { FactoryRuntime } from "../core/runtime/FactoryRuntime";
import { RuntimeEventBus, RuntimeEventTypes } from "../core/events/RuntimeEvent";

import {
  CalculatorAddTool,
  TextUppercaseTool,
  TestFailTool,
} from "../core/tools/builtin/BuiltinTools";

import {
  DuplicateToolRegistrationError,
  InvalidWorkflowDefinitionError,
} from "../core/errors/Errors";

import type { Worker, WorkerContext } from "../core/contracts/Worker";
import type { WorkerResult } from "../core/contracts/Result";
import { ok } from "../core/contracts/Result";
import type { WorkflowDefinition } from "../core/contracts/Workflow";

describe("FactoryOS v0.1 — ToolRegistry & ToolExecutor", () => {
  let registry: ToolRegistry;
  let eventBus: RuntimeEventBus;
  let executor: ToolExecutor;

  beforeEach(() => {
    registry = new ToolRegistry();
    eventBus = new RuntimeEventBus();
    executor = new ToolExecutor(registry, eventBus);
  });

  // ─── §1 Basic Tool Registration & Lookup ───────────────────────────────────

  it("registers and retrieves tools cleanly", () => {
    registry.register(CalculatorAddTool);
    registry.register(TextUppercaseTool);

    expect(registry.has("calculator.add")).toBe(true);
    expect(registry.has("text.uppercase")).toBe(true);
    expect(registry.has("nonexistent")).toBe(false);

    const tool = registry.get("calculator.add");
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe("Calculator Add");

    const all = registry.getAll();
    expect(all).toHaveLength(2);
  });

  it("unregisters tools successfully", () => {
    registry.register(CalculatorAddTool);
    expect(registry.has("calculator.add")).toBe(true);

    const deleted = registry.unregister("calculator.add");
    expect(deleted).toBe(true);
    expect(registry.has("calculator.add")).toBe(false);
  });

  it("rejects duplicate tool registration with DuplicateToolRegistrationError", () => {
    registry.register(CalculatorAddTool);
    expect(() => registry.register(CalculatorAddTool)).toThrowError(
      DuplicateToolRegistrationError
    );
  });

  it("rejects invalid tool definition (missing id or name)", () => {
    expect(() => registry.register({} as any)).toThrowError(
      InvalidWorkflowDefinitionError
    );
    expect(() =>
      registry.register({ id: "", name: "x", version: "1.0", description: "", execute: async () => ({ success: true }) } as any)
    ).toThrowError(InvalidWorkflowDefinitionError);
  });

  // ─── §2 Structured Execution & Input Validation ─────────────────────────────

  it("executes calculator.add with structured result output 30", async () => {
    registry.register(CalculatorAddTool);
    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "calculator.add" };

    const res = await executor.execute("calculator.add", { a: 10, b: 20 }, ctx);

    expect(res.success).toBe(true);
    expect(res.output).toBe(30);
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("executes text.uppercase with structured result output HELLO WORLD", async () => {
    registry.register(TextUppercaseTool);
    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "text.uppercase" };

    const res = await executor.execute("text.uppercase", { text: "hello world" }, ctx);

    expect(res.success).toBe(true);
    expect(res.output).toBe("HELLO WORLD");
  });

  it("returns TOOL_VALIDATION_ERROR for invalid inputs", async () => {
    registry.register(CalculatorAddTool);
    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "calculator.add" };

    const res = await executor.execute("calculator.add", { a: "not_a_number", b: 20 }, ctx);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("TOOL_VALIDATION_ERROR");
    expect(res.error?.message).toContain("numbers");
  });

  it("returns TOOL_NOT_FOUND when executing unregistered tool", async () => {
    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "ghost" };
    const res = await executor.execute("ghost", { data: 1 }, ctx);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("TOOL_NOT_FOUND");
  });

  // ─── §3 Error & Exception Normalization ─────────────────────────────────────

  it("normalizes structured tool failure", async () => {
    registry.register(TestFailTool);
    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "test.fail" };

    const res = await executor.execute("test.fail", { shouldThrow: false, message: "fail test" }, ctx);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("INTENTIONAL_TOOL_FAILURE");
    expect(res.error?.message).toBe("fail test");
  });

  it("normalizes thrown tool exception into TOOL_EXECUTION_ERROR", async () => {
    registry.register(TestFailTool);
    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "test.fail" };

    const res = await executor.execute("test.fail", { shouldThrow: true, message: "crash test" }, ctx);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("TOOL_EXECUTION_ERROR");
    expect(res.error?.message).toContain("crash test");
  });

  // ─── §4 Event Telemetry Emission ───────────────────────────────────────────

  it("emits tool.started and tool.completed events", async () => {
    registry.register(CalculatorAddTool);
    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "calculator.add" };

    await executor.execute("calculator.add", { a: 5, b: 5 }, ctx);

    await new Promise((r) => setTimeout(r, 50));

    const started = eventBus.getByType(RuntimeEventTypes.TOOL_STARTED);
    const completed = eventBus.getByType(RuntimeEventTypes.TOOL_COMPLETED);

    expect(started).toHaveLength(1);
    expect(completed).toHaveLength(1);
    expect(started[0].payload.toolId).toBe("calculator.add");
    expect(completed[0].payload.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("emits tool.failed event on tool failure", async () => {
    registry.register(TestFailTool);
    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "test.fail" };

    await executor.execute("test.fail", { shouldThrow: false }, ctx);

    await new Promise((r) => setTimeout(r, 50));

    const failed = eventBus.getByType(RuntimeEventTypes.TOOL_FAILED);
    expect(failed).toHaveLength(1);
    expect(failed[0].payload.toolId).toBe("test.fail");
  });
});

// ─── §5 Worker Integration & Runtime Tests ────────────────────────────────────

class ToolUsingWorker implements Worker<{ value: number }, { calcResult: number; textResult: string }> {
  readonly id = "tool-worker";

  async execute(
    ctx: WorkerContext<{ value: number }>
  ): Promise<WorkerResult<{ calcResult: number; textResult: string }>> {
    if (!ctx.tools) {
      throw new Error("WorkerContext.tools is not injected!");
    }

    // Call calculator.add
    const calcRes = await ctx.tools<{ a: number; b: number }, number>("calculator.add", {
      a: ctx.input.value,
      b: 10,
    });
    if (!calcRes.success || calcRes.output === undefined) {
      throw new Error(`calculator.add failed: ${calcRes.error?.message}`);
    }

    // Call text.uppercase
    const textRes = await ctx.tools<{ text: string }, string>("text.uppercase", {
      text: `result is ${calcRes.output}`,
    });
    if (!textRes.success || textRes.output === undefined) {
      throw new Error(`text.uppercase failed: ${textRes.error?.message}`);
    }

    return ok({ calcResult: calcRes.output, textResult: textRes.output });
  }
}

describe("FactoryOS v0.1 — Tool Execution inside Worker Workflow", () => {
  it("worker invokes registered tools through WorkerContext.tools", async () => {
    const runtime = new FactoryRuntime();
    runtime.toolRegistry.register(CalculatorAddTool);
    runtime.toolRegistry.register(TextUppercaseTool);

    const workflow: WorkflowDefinition<{ value: number }> = {
      id: "tool-wf",
      name: "Tool Workflow",
      version: "1.0.0",
      steps: [new ToolUsingWorker()],
    };

    const run = await runtime.start(workflow, { value: 15 });

    expect(run.status).toBe("COMPLETED");
    const output = run.steps["tool-worker"].output as { calcResult: number; textResult: string };
    expect(output.calcResult).toBe(25); // 15 + 10 = 25
    expect(output.textResult).toBe("RESULT IS 25");
  });
});

// ─── §6 Red-Team Attacks for Tool Calling ─────────────────────────────────────

describe("FactoryOS v0.1 — Red-Team Tool Security & Reference Safety", () => {
  let registry: ToolRegistry;
  let executor: ToolExecutor;

  beforeEach(() => {
    registry = new ToolRegistry();
    executor = new ToolExecutor(registry);
  });

  it("ATTACK: mutating input object post-call does NOT affect tool execution", async () => {
    registry.register(CalculatorAddTool);
    const inputObj = { a: 10, b: 20 };
    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "calculator.add" };

    const promise = executor.execute("calculator.add", inputObj, ctx);
    inputObj.a = 999; // Mutate input object immediately

    const res = await promise;
    expect(res.output).toBe(30); // 10 + 20 = 30 (not 999 + 20)
  });

  it("ATTACK: mutating returned tool output does NOT alter future executions or internal data", async () => {
    class ObjectReturnTool implements Worker {
      readonly id = "obj-tool";
      async execute() {
        return ok({ data: { count: 10 } });
      }
    }
    registry.register({
      id: "obj.tool",
      name: "Obj Tool",
      version: "1.0",
      description: "",
      async execute() {
        return { success: true, output: { data: { count: 10 } } };
      },
    });

    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "obj.tool" };
    const res1 = await executor.execute("obj.tool", {}, ctx);
    (res1.output as any).data.count = 999; // Mutate output

    const res2 = await executor.execute("obj.tool", {}, ctx);
    expect((res2.output as any).data.count).toBe(10); // Isolated!
    expect(res1.output).not.toBe(res2.output);
  });

  it("ATTACK: concurrent tool calls execute safely without state cross-contamination", async () => {
    registry.register(CalculatorAddTool);
    const ctx = { workflowId: "wf1", runId: "r1", stepId: "s1", toolId: "calculator.add" };

    const calls = Array.from({ length: 50 }, (_, i) =>
      executor.execute("calculator.add", { a: i, b: i }, ctx)
    );

    const results = await Promise.all(calls);
    expect(results).toHaveLength(50);
    for (let i = 0; i < 50; i++) {
      expect(results[i].success).toBe(true);
      expect(results[i].output).toBe(i * 2);
    }
  });
});
