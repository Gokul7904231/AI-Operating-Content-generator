export type CapacityState = "AVAILABLE" | "WARNING" | "EXHAUSTED" | "LOCKED" | "ERROR";

export interface BasicCapacityConfig {
  monthlyUserShortsLimit: number;
  monthlyGlobalRenderMinutesLimit: number;
  currentMonthlyGlobalMinutesUsed: number;
  capacityState: CapacityState;
  basicRenderingEnabled: boolean;
}

export interface UserBasicQuotaUsage {
  userId: string;
  tenantId: string;
  monthKey: string; // e.g. "2026-08"
  shortsRenderedCount: number;
}

export class BasicRenderingCapacityGuardClass {
  private config: BasicCapacityConfig = {
    monthlyUserShortsLimit: 5,
    monthlyGlobalRenderMinutesLimit: parseInt(process.env.BASIC_MONTHLY_RENDER_MINUTES_LIMIT || "1000", 10),
    currentMonthlyGlobalMinutesUsed: 0,
    capacityState: "AVAILABLE",
    basicRenderingEnabled: process.env.BASIC_RENDERING_ENABLED !== "false",
  };

  private userUsageMap = new Map<string, UserBasicQuotaUsage>();

  /**
   * Check if a Basic/Free render request is allowed by local billing safety rules.
   */
  public checkBasicDispatchAllowed(userId: string, tenantId: string, estimatedDurationSeconds: number = 60): { allowed: boolean; reason?: string } {
    if (!this.config.basicRenderingEnabled) {
      return { allowed: false, reason: "BASIC_RENDERING_DISABLED: Basic cloud rendering plane is currently disabled." };
    }

    if (this.config.capacityState === "EXHAUSTED" || this.config.capacityState === "LOCKED") {
      return { allowed: false, reason: "BASIC_RENDER_CAPACITY_UNAVAILABLE: Global Basic rendering capacity limit reached." };
    }

    // User monthly quota check (e.g. 5 Shorts / month)
    const monthKey = new Date().toISOString().slice(0, 7);
    const userKey = `${tenantId}:${userId}:${monthKey}`;
    const usage = this.userUsageMap.get(userKey) || { userId, tenantId, monthKey, shortsRenderedCount: 0 };

    if (usage.shortsRenderedCount >= this.config.monthlyUserShortsLimit) {
      return {
        allowed: false,
        reason: `USER_BASIC_QUOTA_EXCEEDED: User limit of ${this.config.monthlyUserShortsLimit} Shorts/month reached for Basic tier.`,
      };
    }

    // Global monthly render minutes check
    const estimatedMinutes = Math.ceil(estimatedDurationSeconds / 60);
    if (this.config.currentMonthlyGlobalMinutesUsed + estimatedMinutes > this.config.monthlyGlobalRenderMinutesLimit) {
      this.config.capacityState = "EXHAUSTED";
      return {
        allowed: false,
        reason: "BASIC_RENDER_CAPACITY_UNAVAILABLE: Global monthly Basic render minutes budget exhausted.",
      };
    }

    return { allowed: true };
  }

  /**
   * Record completed Basic render minutes usage.
   */
  public recordRenderUsage(userId: string, tenantId: string, durationSeconds: number): void {
    const monthKey = new Date().toISOString().slice(0, 7);
    const userKey = `${tenantId}:${userId}:${monthKey}`;
    const usage = this.userUsageMap.get(userKey) || { userId, tenantId, monthKey, shortsRenderedCount: 0 };

    usage.shortsRenderedCount += 1;
    this.userUsageMap.set(userKey, usage);

    const minutes = Math.ceil(durationSeconds / 60);
    this.config.currentMonthlyGlobalMinutesUsed += minutes;

    const ratio = this.config.currentMonthlyGlobalMinutesUsed / this.config.monthlyGlobalRenderMinutesLimit;
    if (ratio >= 1.0) {
      this.config.capacityState = "EXHAUSTED";
    } else if (ratio >= 0.8) {
      this.config.capacityState = "WARNING";
    }
  }

  public getCapacityState(): CapacityState {
    return this.config.capacityState;
  }

  public getConfig(): BasicCapacityConfig {
    return { ...this.config };
  }

  public getUserUsage(userId: string, tenantId: string): UserBasicQuotaUsage {
    const monthKey = new Date().toISOString().slice(0, 7);
    const userKey = `${tenantId}:${userId}:${monthKey}`;
    return this.userUsageMap.get(userKey) || { userId, tenantId, monthKey, shortsRenderedCount: 0 };
  }

  public reset(): void {
    this.config.currentMonthlyGlobalMinutesUsed = 0;
    this.config.capacityState = "AVAILABLE";
    this.config.basicRenderingEnabled = true;
    this.userUsageMap.clear();
  }
}

export const BasicRenderingCapacityGuard = new BasicRenderingCapacityGuardClass();
