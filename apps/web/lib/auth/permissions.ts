/**
 * Permission Policies & Capabilities — FactoryOS v1
 */

import { UserRole } from "./types";
import { isRoleAtLeast } from "./roles";

export type Permission =
  | "jobs:create"
  | "jobs:cancel"
  | "jobs:view"
  | "engines:configure"
  | "engines:view"
  | "admins:manage"
  | "telemetry:view";

const PERMISSION_MAP: Record<Permission, UserRole> = {
  "jobs:create": "EDITOR",
  "jobs:cancel": "ADMIN",
  "jobs:view": "VIEWER",
  "engines:configure": "ADMIN",
  "engines:view": "VIEWER",
  "admins:manage": "OWNER",
  "telemetry:view": "VIEWER",
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const requiredRole = PERMISSION_MAP[permission];
  if (!requiredRole) return false;
  return isRoleAtLeast(role, requiredRole);
}
