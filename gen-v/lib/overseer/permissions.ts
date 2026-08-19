import { AdminUser, UserRole } from "../auth/types";
import { isRoleAtLeast } from "../auth/roles";
import { ForbiddenError } from "../auth/errors";
import { OverseerTool } from "./types";

export class OverseerPermissions {
  /**
   * Enforces tool execution permissions server-side.
   */
  static assertToolPermission(tool: OverseerTool, user: AdminUser): void {
    if (!user || !user.role) {
      throw new ForbiddenError("Unauthenticated request: user context missing.");
    }

    if (!isRoleAtLeast(user.role, tool.requiredRole)) {
      throw new ForbiddenError(
        `[Overseer Security] Insufficient permissions for tool "${tool.name}". Required role: ${tool.requiredRole}, current role: ${user.role}`
      );
    }
  }

  /**
   * Enforces tenant isolation scoping queries to user.uid for Basic Users.
   */
  static scopeUserQuery(query: Record<string, any>, user: AdminUser): Record<string, any> {
    const isAdmin = isRoleAtLeast(user.role, "ADMIN");
    if (isAdmin) return query; // Admins can query globally

    return {
      ...query,
      userId: user.uid,
    };
  }

  /**
   * Validates target object ownership to prevent cross-tenant access.
   */
  static assertObjectOwnership(targetUserId: string, user: AdminUser, objectDescription: string = "Resource"): void {
    const isAdmin = isRoleAtLeast(user.role, "ADMIN");
    if (isAdmin) return;

    if (targetUserId !== user.uid) {
      throw new ForbiddenError(`[Overseer Isolation] Access denied to ${objectDescription}. You do not own this resource.`);
    }
  }
}
