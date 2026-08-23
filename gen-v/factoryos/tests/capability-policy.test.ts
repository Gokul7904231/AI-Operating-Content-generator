/**
 * FactoryOS Capability Policy & Role Matrix Unit Tests
 */

import { describe, it, expect } from "vitest";
import { can } from "../../lib/auth/capability-policy";

describe("Capability Policy & Tier Matrix", () => {
  it("01: Basic user has creation access but NO engine management or factory operations", () => {
    const basicUser = { uid: "u1", role: "USER" };

    expect(can(basicUser, "CREATE_VIDEO")).toBe(true);
    expect(can(basicUser, "USE_ACTIVE_SYSTEM_ENGINES")).toBe(true);
    expect(can(basicUser, "USE_ACTIVE_USER_ENGINES")).toBe(false);
    expect(can(basicUser, "ENGINE_MANAGEMENT")).toBe(false);
    expect(can(basicUser, "FACTORY_OPERATIONS")).toBe(false);
  });

  it("02: Pro user has creation access and engine management", () => {
    const proUser = { uid: "u2", role: "PRO" };

    expect(can(proUser, "CREATE_VIDEO")).toBe(true);
    expect(can(proUser, "USE_ACTIVE_SYSTEM_ENGINES")).toBe(true);
    expect(can(proUser, "USE_ACTIVE_USER_ENGINES")).toBe(true);
    expect(can(proUser, "ENGINE_MANAGEMENT")).toBe(true);
    expect(can(proUser, "FACTORY_OPERATIONS")).toBe(false);
  });

  it("03: Admin and Owner have creation, engine management, and factory operations", () => {
    const adminUser = { uid: "u3", role: "ADMIN" };
    const ownerUser = { uid: "u4", role: "OWNER" };

    expect(can(adminUser, "CREATE_VIDEO")).toBe(true);
    expect(can(adminUser, "ENGINE_MANAGEMENT")).toBe(true);
    expect(can(adminUser, "FACTORY_OPERATIONS")).toBe(true);
    expect(can(adminUser, "SYSTEM_CONFIGURATION")).toBe(false);

    expect(can(ownerUser, "SYSTEM_CONFIGURATION")).toBe(true);
  });
});
