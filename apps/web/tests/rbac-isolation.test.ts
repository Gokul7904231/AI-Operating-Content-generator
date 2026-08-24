import { describe, it, expect } from "vitest";
import { isRoleAtLeast, isAdminUser, isBasicUser, isValidRole } from "../lib/auth/roles";
import { verifyRole } from "../lib/auth/auth";
import { AdminUser, UserRole } from "../lib/auth/types";
import { ForbiddenError } from "../lib/auth/errors";

describe("FactoryOS RBAC & Role Isolation Suite", () => {
  it("correctly evaluates role hierarchy weights", () => {
    expect(isRoleAtLeast("OWNER", "ADMIN")).toBe(true);
    expect(isRoleAtLeast("ADMIN", "ADMIN")).toBe(true);
    expect(isRoleAtLeast("EDITOR", "ADMIN")).toBe(false);
    expect(isRoleAtLeast("VIEWER", "ADMIN")).toBe(false);
    expect(isRoleAtLeast("EDITOR", "VIEWER")).toBe(true);
  });

  it("classifies Admin users vs Basic Users accurately", () => {
    expect(isAdminUser("OWNER")).toBe(true);
    expect(isAdminUser("ADMIN")).toBe(true);
    expect(isAdminUser("EDITOR")).toBe(false);
    expect(isAdminUser("VIEWER")).toBe(false);

    expect(isBasicUser("EDITOR")).toBe(true);
    expect(isBasicUser("VIEWER")).toBe(true);
    expect(isBasicUser("ADMIN")).toBe(false);
  });

  it("throws ForbiddenError when Basic User attempts Admin role requirement", () => {
    const basicUser: AdminUser = {
      uid: "user_basic_123",
      email: "basic@factoryos.pro",
      role: "EDITOR",
      active: true,
      disabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(() => verifyRole(basicUser, "ADMIN")).toThrowError(ForbiddenError);
  });

  it("allows Admin user to pass Admin role requirement", () => {
    const adminUser: AdminUser = {
      uid: "user_admin_999",
      email: "admin@factoryos.pro",
      role: "ADMIN",
      active: true,
      disabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(() => verifyRole(adminUser, "ADMIN")).not.toThrow();
  });

  it("validates role strings correctly", () => {
    expect(isValidRole("OWNER")).toBe(true);
    expect(isValidRole("ADMIN")).toBe(true);
    expect(isValidRole("EDITOR")).toBe(true);
    expect(isValidRole("VIEWER")).toBe(true);
    expect(isValidRole("SUPERADMIN")).toBe(false);
    expect(isValidRole("HACKER")).toBe(false);
  });
});
