import { describe, it, expect } from "vitest";
import { isRoleAtLeast, isAdminUser, isBasicUser, isOwnerUser, isEditorUser, isViewerUser, isValidRole } from "../../lib/auth/roles";
import { verifyRole, verifyWritePermission } from "../../lib/auth/auth";
import { AdminUser } from "../../lib/auth/types";
import { ForbiddenError } from "../../lib/auth/errors";

describe("FactoryOS RBAC & Role Isolation Suite", () => {
  it("correctly evaluates role hierarchy weights", () => {
    expect(isRoleAtLeast("OWNER", "ADMIN")).toBe(true);
    expect(isRoleAtLeast("ADMIN", "ADMIN")).toBe(true);
    expect(isRoleAtLeast("EDITOR", "ADMIN")).toBe(false);
    expect(isRoleAtLeast("VIEWER", "ADMIN")).toBe(false);
    expect(isRoleAtLeast("EDITOR", "VIEWER")).toBe(true);
  });

  it("classifies explicit roles accurately (isOwnerUser, isAdminUser, isBasicUser, isEditorUser, isViewerUser)", () => {
    expect(isOwnerUser("OWNER")).toBe(true);
    expect(isOwnerUser("ADMIN")).toBe(false);

    expect(isAdminUser("OWNER")).toBe(true);
    expect(isAdminUser("ADMIN")).toBe(true);
    expect(isAdminUser("EDITOR")).toBe(false);
    expect(isAdminUser("VIEWER")).toBe(false);

    expect(isBasicUser("EDITOR")).toBe(true);
    expect(isBasicUser("VIEWER")).toBe(true);
    expect(isBasicUser("ADMIN")).toBe(false);

    expect(isEditorUser("EDITOR")).toBe(true);
    expect(isEditorUser("VIEWER")).toBe(false);

    expect(isViewerUser("VIEWER")).toBe(true);
    expect(isViewerUser("EDITOR")).toBe(false);
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

  it("enforces read-only restrictions on VIEWER role for write operations", () => {
    const viewerUser: AdminUser = {
      uid: "user_viewer_001",
      email: "viewer@factoryos.pro",
      role: "VIEWER",
      active: true,
      disabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const editorUser: AdminUser = {
      uid: "user_editor_002",
      email: "editor@factoryos.pro",
      role: "EDITOR",
      active: true,
      disabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(() => verifyWritePermission(viewerUser)).toThrowError(ForbiddenError);
    expect(() => verifyWritePermission(editorUser)).not.toThrow();
  });

  it("validates role strings correctly", () => {
    expect(isValidRole("OWNER")).toBe(true);
    expect(isValidRole("ADMIN")).toBe(true);
    expect(isValidRole("EDITOR")).toBe(true);
    expect(isValidRole("VIEWER")).toBe(true);
    expect(isValidRole("SUPERADMIN")).toBe(false);
    expect(isValidRole("HACKER")).toBe(false);
  });

  it("rejects unauthenticated requests on generate-script, enhance-script, regenerate-scene, and jobs/approve", async () => {
    const { POST: generateScriptPOST } = await import("../../app/api/generate-script/route");
    const { POST: enhanceScriptPOST } = await import("../../app/api/enhance-script/route");
    const { POST: regenerateScenePOST } = await import("../../app/api/regenerate-scene/route");
    const { POST: approveJobPOST } = await import("../../app/api/jobs/approve/route");

    const reqWithoutAuth = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ topic: "test" }),
    });

    const resGenScript = await generateScriptPOST(reqWithoutAuth.clone());
    expect([401, 403]).toContain(resGenScript.status);

    const resEnhance = await enhanceScriptPOST(reqWithoutAuth.clone());
    expect([401, 403]).toContain(resEnhance.status);

    const resRegen = await regenerateScenePOST(reqWithoutAuth.clone());
    expect([401, 403]).toContain(resRegen.status);

    const resApprove = await approveJobPOST(reqWithoutAuth.clone());
    expect([401, 403]).toContain(resApprove.status);
  });
});
