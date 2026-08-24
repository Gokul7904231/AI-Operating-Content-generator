/**
 * FactoryOS v0.1 — Built-in Deterministic Test Tools
 *
 * Zero network, zero LLM, zero external API keys.
 * Deterministic local tools for Step 2 testing and verification.
 */

import type { ToolDefinition } from "../ToolContracts";
import { toolOk, toolFail } from "../ToolContracts";

// ─── Calculator Add Tool ──────────────────────────────────────────────────────

export interface AddInput {
  a: number;
  b: number;
}

export const CalculatorAddTool: ToolDefinition<AddInput, number> = {
  id: "calculator.add",
  name: "Calculator Add",
  version: "1.0.0",
  description: "Adds two numbers deterministically",

  validateInput(input: unknown) {
    if (!input || typeof input !== "object") {
      return { valid: false, error: "Input must be an object with { a, b }" };
    }
    const { a, b } = input as Record<string, unknown>;
    if (typeof a !== "number" || typeof b !== "number" || Number.isNaN(a) || Number.isNaN(b)) {
      return { valid: false, error: "Both 'a' and 'b' must be valid numbers" };
    }
    return { valid: true, parsed: { a, b } };
  },

  async execute(input: AddInput) {
    return toolOk(input.a + input.b);
  },
};

// ─── Text Uppercase Tool ──────────────────────────────────────────────────────

export interface UppercaseInput {
  text: string;
}

export const TextUppercaseTool: ToolDefinition<UppercaseInput, string> = {
  id: "text.uppercase",
  name: "Text Uppercase",
  version: "1.0.0",
  description: "Converts text to uppercase deterministically",

  validateInput(input: unknown) {
    if (!input || typeof input !== "object") {
      return { valid: false, error: "Input must be an object with { text }" };
    }
    const { text } = input as Record<string, unknown>;
    if (typeof text !== "string") {
      return { valid: false, error: "'text' must be a string" };
    }
    return { valid: true, parsed: { text } };
  },

  async execute(input: UppercaseInput) {
    return toolOk(input.text.toUpperCase());
  },
};

// ─── Test Fail Tool ───────────────────────────────────────────────────────────

export interface FailInput {
  shouldThrow?: boolean;
  message?: string;
}

export const TestFailTool: ToolDefinition<FailInput, never> = {
  id: "test.fail",
  name: "Test Fail",
  version: "1.0.0",
  description: "Intentionally fails or throws for testing failure propagation",

  async execute(input: FailInput) {
    if (input?.shouldThrow) {
      throw new Error(input.message ?? "TestFailTool threw intentionally");
    }
    return toolFail(
      "INTENTIONAL_TOOL_FAILURE",
      input?.message ?? "TestFailTool failed intentionally"
    );
  },
};
