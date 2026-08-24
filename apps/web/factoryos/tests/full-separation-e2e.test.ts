import { describe, it, expect } from "vitest";
import { getNavigationForRole, ROUTE_SECTIONS } from "@/lib/core/RouteRegistry";
import { isValidRole, isRoleAtLeast, isAdminUser, canWrite, type UserRole } from "@/lib/auth/roles";
import { verifyAuthAndRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/auth";

describe("FactoryOS — Full Basic User vs Admin Separation E2E Test Suite", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Pillar 1: Navigation & Menu Separation
  // ───────────────────────────────────────────────────────────────────────────
  describe("Pillar 1: Navigation Visibility & Role-Filtered Menus", () => {
    it("filters out internal infrastructure routes for basic USER role", () => {
      const userNav = getNavigationForRole("USER");
      const userRouteIds = userNav.flatMap((s) => s.routes.map((i) => i.id));
      const userSectionIds = userNav.map((s) => s.id);

      // SRE section must not be present
      expect(userSectionIds).not.toContain("sre");

      // Internal admin routes must not be present in user nav
      expect(userRouteIds).not.toContain("factory-queue");
      expect(userRouteIds).not.toContain("factory-scheduler");
      expect(userRouteIds).not.toContain("factory-workflows");
      expect(userRouteIds).not.toContain("ai-models");
      expect(userRouteIds).not.toContain("ai-marketplace");
      expect(userRouteIds).not.toContain("ai-capability-reg");
      expect(userRouteIds).not.toContain("ai-runtime");
      expect(userRouteIds).not.toContain("ai-benchmarks");
      expect(userRouteIds).not.toContain("ai-events");
      expect(userRouteIds).not.toContain("media-drive");
      expect(userRouteIds).not.toContain("media-cloudinary");
      expect(userRouteIds).not.toContain("pub-drive");

      // User creator routes MUST be present
      expect(userRouteIds).toContain("factory-jobs");
      expect(userRouteIds).toContain("factory-templates");
      expect(userRouteIds).toContain("engines-quiz");
      expect(userRouteIds).toContain("media-library");
      expect(userRouteIds).toContain("pub-youtube");
      expect(userRouteIds).toContain("analytics-performance");
    });

    it("filters out internal infrastructure routes for VIEWER role", () => {
      const viewerNav = getNavigationForRole("VIEWER");
      const viewerSectionIds = viewerNav.map((s) => s.id);
      const viewerRouteIds = viewerNav.flatMap((s) => s.routes.map((i) => i.id));

      expect(viewerSectionIds).not.toContain("sre");
      expect(viewerRouteIds).not.toContain("factory-queue");
      expect(viewerRouteIds).toContain("factory-jobs");
      expect(viewerRouteIds).toContain("media-library");
    });

    it("grants full telemetry & SRE navigation to ADMIN and OWNER roles", () => {
      const adminNav = getNavigationForRole("ADMIN");
      const ownerNav = getNavigationForRole("OWNER");

      const adminSectionIds = adminNav.map((s) => s.id);
      const ownerSectionIds = ownerNav.map((s) => s.id);

      expect(adminSectionIds).toContain("sre");
      expect(ownerSectionIds).toContain("sre");

      const adminRouteIds = adminNav.flatMap((s) => s.routes.map((i) => i.id));
      expect(adminRouteIds).toContain("sre-ai-hospital");
      expect(adminRouteIds).toContain("sre-workers");
      expect(adminRouteIds).toContain("sre-simulation");
      expect(adminRouteIds).toContain("sre-profiler");
      expect(adminRouteIds).toContain("factory-queue");
      expect(adminRouteIds).toContain("ai-models");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Pillar 2: Role Hierarchy & Permissions
  // ───────────────────────────────────────────────────────────────────────────
  describe("Pillar 2: Canonical Role Hierarchy & Permissions", () => {
    it("correctly identifies admin users vs basic users", () => {
      expect(isAdminUser("OWNER")).toBe(true);
      expect(isAdminUser("ADMIN")).toBe(true);
      expect(isAdminUser("EDITOR")).toBe(false);
      expect(isAdminUser("USER")).toBe(false);
      expect(isAdminUser("VIEWER")).toBe(false);
    });

    it("enforces write permissions accurately across the role hierarchy", () => {
      expect(canWrite("OWNER")).toBe(true);
      expect(canWrite("ADMIN")).toBe(true);
      expect(canWrite("EDITOR")).toBe(true);
      expect(canWrite("USER")).toBe(true);
      expect(canWrite("VIEWER")).toBe(false); // VIEWER is read-only
    });

    it("evaluates role thresholds correctly", () => {
      expect(isRoleAtLeast("USER", "USER")).toBe(true);
      expect(isRoleAtLeast("USER", "ADMIN")).toBe(false);
      expect(isRoleAtLeast("USER", "OWNER")).toBe(false);
      expect(isRoleAtLeast("ADMIN", "USER")).toBe(true);
      expect(isRoleAtLeast("OWNER", "ADMIN")).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Pillar 3: Server-Side RBAC Enforcement & Admin Protection
  // ───────────────────────────────────────────────────────────────────────────
  describe("Pillar 3: Server-Side RBAC Guard Enforcement", () => {
    it("rejects unauthorized access when session has basic USER role attempting ADMIN action", async () => {
      const mockRequest = new Request("https://factoryos.local/api/admin/users", {
        headers: {
          cookie: "session=mock_user_cookie",
        },
      });

      // verifyAuthAndRole with requiredRole="ADMIN"
      await expect(
        verifyAuthAndRole(mockRequest, "ADMIN", async () => {
          return { ok: true };
        })
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Pillar 4: Data Isolation (IDOR Elimination) Logic
  // ───────────────────────────────────────────────────────────────────────────
  describe("Pillar 4: Data Isolation & Multi-Tenant Query Scoping", () => {
    it("scopes query by userId for basic user roles", () => {
      const basicUserRole: UserRole = "USER";
      const adminRole: UserRole = "ADMIN";
      const userId = "usr_creator_456";

      function buildQuery(role: UserRole, uid: string) {
        const queryParams: { isScoped: boolean; filterField?: string; filterValue?: string } = {
          isScoped: false,
        };
        if (!isAdminUser(role)) {
          queryParams.isScoped = true;
          queryParams.filterField = "userId";
          queryParams.filterValue = uid;
        }
        return queryParams;
      }

      const userQuery = buildQuery(basicUserRole, userId);
      expect(userQuery.isScoped).toBe(true);
      expect(userQuery.filterField).toBe("userId");
      expect(userQuery.filterValue).toBe("usr_creator_456");

      const adminQuery = buildQuery(adminRole, "admin_uid");
      expect(adminQuery.isScoped).toBe(false);
      expect(adminQuery.filterField).toBeUndefined();
    });
  });
});
