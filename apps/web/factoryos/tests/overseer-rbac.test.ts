import { describe, it, expect } from "vitest";
import { OverseerToolRegistry } from "../../lib/overseer/tool-registry";
import { OverseerPermissions } from "../../lib/overseer/permissions";
import { AdminUser } from "../../lib/auth/types";

describe("FactoryOS Overseer — Server-Side RBAC Enforcement Suite", () => {
  const viewer: AdminUser = { uid: "v1", email: "viewer@factoryos.pro", role: "VIEWER", active: true, disabled: false, createdAt: "", updatedAt: "" };
  const editor: AdminUser = { uid: "e1", email: "editor@factoryos.pro", role: "EDITOR", active: true, disabled: false, createdAt: "", updatedAt: "" };
  const admin: AdminUser = { uid: "a1", email: "admin@factoryos.pro", role: "ADMIN", active: true, disabled: false, createdAt: "", updatedAt: "" };

  it("01: Denies Admin tools to VIEWER and EDITOR users server-side", () => {
    const adminTool = OverseerToolRegistry.getTool("getFactoryHealth")!;

    expect(() => OverseerPermissions.assertToolPermission(adminTool, viewer)).toThrow("Insufficient permissions");
    expect(() => OverseerPermissions.assertToolPermission(adminTool, editor)).toThrow("Insufficient permissions");
    expect(() => OverseerPermissions.assertToolPermission(adminTool, admin)).not.toThrow();
  });

  it("02: Denies Write Action tools to VIEWER users", () => {
    const createTool = OverseerToolRegistry.getTool("createVideo")!;

    expect(() => OverseerPermissions.assertToolPermission(createTool, viewer)).toThrow("Insufficient permissions");
    expect(() => OverseerPermissions.assertToolPermission(createTool, editor)).not.toThrow();
  });
});
