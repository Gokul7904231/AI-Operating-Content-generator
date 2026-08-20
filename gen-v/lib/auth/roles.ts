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
  return ["OWNER", "ADMIN", "USER", "EDITOR", "VIEWER"].includes(role);
}

export function isOwnerUser(role?: UserRole | string | null): boolean {
  if (!role) return false;
  return role === "OWNER";
}

export function isAdminUser(role?: UserRole | string | null): boolean {
  if (!role) return false;
  return role === "OWNER" || role === "ADMIN";
}

export function isBasicUser(role?: UserRole | string | null): boolean {
  if (!role) return true;
  return role === "USER" || role === "EDITOR" || role === "VIEWER";
}

export function isEditorUser(role?: UserRole | string | null): boolean {
  if (!role) return false;
  return role === "EDITOR";
}

export function isViewerUser(role?: UserRole | string | null): boolean {
  if (!role) return false;
  return role === "VIEWER";
}
