/**
 * Role Definitions & Hierarchy Validation — FactoryOS v1
 */

import { UserRole } from "./types";
import { ROLE_HIERARCHY } from "./constants";

export function isRoleAtLeast(currentRole: UserRole, requiredRole: UserRole): boolean {
  const currentWeight = ROLE_HIERARCHY[currentRole] || 0;
  const requiredWeight = ROLE_HIERARCHY[requiredRole] || 0;
  return currentWeight >= requiredWeight;
}

export function isValidRole(role: string): role is UserRole {
  return ["OWNER", "ADMIN", "EDITOR", "VIEWER"].includes(role);
}
