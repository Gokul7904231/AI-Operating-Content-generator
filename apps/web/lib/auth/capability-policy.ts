/**
 * Capability Policy — FactoryOS Canonical Tier/Role Authorization Matrix
 * 
 * Enforces declarative, fail-closed authorization for creation, engine management,
 * scheduling, Drive connections, user inspection, and factory operations.
 */

export type UserAction =
  | "CREATE_VIDEO"
  | "USE_ACTIVE_SYSTEM_ENGINES"
  | "USE_ACTIVE_USER_ENGINES"
  | "ENGINE_MANAGEMENT"
  | "SCHEDULING"
  | "GOOGLE_DRIVE_CONNECT"
  | "FACTORY_OPERATIONS"
  | "USER_MANAGEMENT"
  | "INFRASTRUCTURE_MONITORING"
  | "SYSTEM_CONFIGURATION";

export interface CapabilityUser {
  uid?: string;
  role?: string;
  adminExpiresAt?: string | null;
}

const TIER_CAPABILITIES: Record<string, Set<UserAction>> = {
  // BASIC / VIEWER / EDITOR / USER
  BASIC: new Set(["CREATE_VIDEO", "USE_ACTIVE_SYSTEM_ENGINES"]),
  USER: new Set(["CREATE_VIDEO", "USE_ACTIVE_SYSTEM_ENGINES"]),
  VIEWER: new Set(["CREATE_VIDEO", "USE_ACTIVE_SYSTEM_ENGINES"]),
  EDITOR: new Set(["CREATE_VIDEO", "USE_ACTIVE_SYSTEM_ENGINES"]),

  // PRO
  PRO: new Set([
    "CREATE_VIDEO",
    "USE_ACTIVE_SYSTEM_ENGINES",
    "USE_ACTIVE_USER_ENGINES",
    "ENGINE_MANAGEMENT",
    "SCHEDULING",
    "GOOGLE_DRIVE_CONNECT",
  ]),

  // ADMIN
  ADMIN: new Set([
    "CREATE_VIDEO",
    "USE_ACTIVE_SYSTEM_ENGINES",
    "USE_ACTIVE_USER_ENGINES",
    "ENGINE_MANAGEMENT",
    "SCHEDULING",
    "GOOGLE_DRIVE_CONNECT",
    "FACTORY_OPERATIONS",
    "USER_MANAGEMENT",
    "INFRASTRUCTURE_MONITORING",
  ]),

  // OWNER
  OWNER: new Set([
    "CREATE_VIDEO",
    "USE_ACTIVE_SYSTEM_ENGINES",
    "USE_ACTIVE_USER_ENGINES",
    "ENGINE_MANAGEMENT",
    "SCHEDULING",
    "GOOGLE_DRIVE_CONNECT",
    "FACTORY_OPERATIONS",
    "USER_MANAGEMENT",
    "INFRASTRUCTURE_MONITORING",
    "SYSTEM_CONFIGURATION",
  ]),
};

/**
 * Checks if a user has permission to perform an action according to the canonical capability policy.
 */
export function can(user: CapabilityUser | null | undefined, action: UserAction): boolean {
  if (!user) return false;

  const role = (user.role || "USER").toUpperCase();
  const allowed = TIER_CAPABILITIES[role] || TIER_CAPABILITIES.BASIC;

  return allowed.has(action);
}
