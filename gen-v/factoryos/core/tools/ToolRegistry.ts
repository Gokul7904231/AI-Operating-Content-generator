/**
 * FactoryOS v0.1 — Tool Registry
 *
 * Central registry for all executable tools in FactoryOS.
 * Enforces registration uniqueness and validation.
 */

import type { ToolDefinition } from "./ToolContracts";
import {
  DuplicateToolRegistrationError,
  InvalidWorkflowDefinitionError,
} from "../errors/Errors";

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition<any, any>>();

  /**
   * Register a tool definition.
   * Throws DuplicateToolRegistrationError if a tool with the same ID is already registered.
   */
  register<TInput = unknown, TOutput = unknown>(
    tool: ToolDefinition<TInput, TOutput>
  ): void {
    if (!tool || typeof tool !== "object") {
      throw new InvalidWorkflowDefinitionError("Tool definition must be an object");
    }
    if (!tool.id || typeof tool.id !== "string" || tool.id.trim() === "") {
      throw new InvalidWorkflowDefinitionError("Tool id must be a non-empty string");
    }
    if (!tool.name || typeof tool.name !== "string" || tool.name.trim() === "") {
      throw new InvalidWorkflowDefinitionError("Tool name must be a non-empty string");
    }
    if (this.tools.has(tool.id)) {
      throw new DuplicateToolRegistrationError(tool.id);
    }
    this.tools.set(tool.id, tool);
  }

  /** Retrieve a tool definition by ID, or null if not found */
  get<TInput = unknown, TOutput = unknown>(
    toolId: string
  ): ToolDefinition<TInput, TOutput> | null {
    const tool = this.tools.get(toolId);
    return tool ? (tool as ToolDefinition<TInput, TOutput>) : null;
  }

  /** Returns true if a tool is registered */
  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /** Returns all registered tool definitions */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /** Unregister a tool */
  unregister(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  /** Clear all registered tools */
  clear(): void {
    this.tools.clear();
  }
}
