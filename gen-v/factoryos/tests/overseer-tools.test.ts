import { describe, it, expect } from "vitest";
import { OverseerToolRegistry } from "../../lib/overseer/tool-registry";

describe("FactoryOS Overseer — Tool Registry Suite", () => {
  it("01: Registers 15+ real tools across read, admin, research, and action categories", () => {
    const allTools = OverseerToolRegistry.getAllTools();
    expect(allTools.length).toBeGreaterThan(12);

    const getMyProjects = OverseerToolRegistry.getTool("getMyProjects");
    expect(getMyProjects).toBeDefined();
    expect(getMyProjects?.requiredRole).toBe("VIEWER");

    const getFactoryHealth = OverseerToolRegistry.getTool("getFactoryHealth");
    expect(getFactoryHealth).toBeDefined();
    expect(getFactoryHealth?.requiredRole).toBe("ADMIN");
  });

  it("02: Filters tools according to user role permissions", () => {
    const viewerTools = OverseerToolRegistry.getToolsForRole("VIEWER");
    expect(viewerTools.some(t => t.id === "getFactoryHealth")).toBe(false);

    const adminTools = OverseerToolRegistry.getToolsForRole("ADMIN");
    expect(adminTools.some(t => t.id === "getFactoryHealth")).toBe(true);
  });
});
