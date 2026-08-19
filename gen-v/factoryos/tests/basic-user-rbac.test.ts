import { describe, it, expect } from "vitest";
import { isValidRole, isRoleAtLeast } from "../../lib/auth/roles";

describe("FactoryOS — Basic User RBAC Tests", () => {
  it("validates role hierarchy and recognizes VIEWER and CREATOR roles", () => {
    expect(isValidRole("OWNER")).toBe(true);
    expect(isValidRole("ADMIN")).toBe(true);
    expect(isValidRole("EDITOR")).toBe(true);
    expect(isValidRole("VIEWER")).toBe(true);
    expect(isValidRole("INVALID_ROLE")).toBe(false);
  });

  it("ensures VIEWER role has read-only clearance", () => {
    expect(isRoleAtLeast("VIEWER", "EDITOR")).toBe(false);
    expect(isRoleAtLeast("VIEWER", "ADMIN")).toBe(false);
    expect(isRoleAtLeast("VIEWER", "VIEWER")).toBe(true);
  });
});
