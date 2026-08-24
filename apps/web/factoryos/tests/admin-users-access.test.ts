import { describe, it, expect } from "vitest";
import { isRoleAtLeast } from "../../lib/auth/roles";
import { hasPermission } from "../../lib/auth/permissions";

describe("FactoryOS — Admin User Access RBAC Tests", () => {
  it("enforces OWNER/ADMIN clearance for user directory and admin mutations", () => {
    expect(isRoleAtLeast("OWNER", "ADMIN")).toBe(true);
    expect(isRoleAtLeast("ADMIN", "ADMIN")).toBe(true);
    expect(isRoleAtLeast("EDITOR", "ADMIN")).toBe(false);
    expect(isRoleAtLeast("VIEWER", "ADMIN")).toBe(false);
  });

  it("checks permissions for user directory and system configuration", () => {
    expect(hasPermission("ADMIN", "engines:configure")).toBe(true);
    expect(hasPermission("OWNER", "admins:manage")).toBe(true);
    expect(hasPermission("VIEWER", "admins:manage")).toBe(false);
  });
});
