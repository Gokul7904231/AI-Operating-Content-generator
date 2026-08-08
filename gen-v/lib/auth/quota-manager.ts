import { UserTier } from "../rendering/RenderQueueManager";

export interface UserQuotaConfig {
  tier: UserTier;
  monthlyLimit: number;
  dailyLimit?: number;
  priorityQueue: boolean;
  adobeExpressAccess: boolean;
  googleDriveAutomation: boolean;
}

export interface UserUsageRecord {
  userId: string;
  tenantId: string;
  tier: UserTier;
  monthlyUsageCount: number;
  dailyUsageCount: number;
  lastResetMonth: string; // e.g. "2026-08"
  lastResetDay: string; // e.g. "2026-08-08"
}

export class QuotaManager {
  private static tierConfigs: Record<UserTier, UserQuotaConfig> = {
    ADMIN: {
      tier: "ADMIN",
      monthlyLimit: 9999,
      dailyLimit: 5,
      priorityQueue: true,
      adobeExpressAccess: true,
      googleDriveAutomation: true,
    },
    ENTERPRISE: {
      tier: "ENTERPRISE",
      monthlyLimit: 1000,
      priorityQueue: true,
      adobeExpressAccess: false,
      googleDriveAutomation: true,
    },
    PRO: {
      tier: "PRO",
      monthlyLimit: 100,
      priorityQueue: true,
      adobeExpressAccess: false,
      googleDriveAutomation: false,
    },
    FREE: {
      tier: "FREE",
      monthlyLimit: 5,
      priorityQueue: false,
      adobeExpressAccess: false,
      googleDriveAutomation: false,
    },
  };

  private static usageStore = new Map<string, UserUsageRecord>();

  static getTierConfig(tier: UserTier): UserQuotaConfig {
    return this.tierConfigs[tier] || this.tierConfigs.FREE;
  }

  static getUserUsage(userId: string, tenantId: string, tier: UserTier): UserUsageRecord {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentDay = new Date().toISOString().slice(0, 10);
    const key = `${tenantId}:${userId}`;

    let record = this.usageStore.get(key);
    if (!record) {
      record = {
        userId,
        tenantId,
        tier,
        monthlyUsageCount: 0,
        dailyUsageCount: 0,
        lastResetMonth: currentMonth,
        lastResetDay: currentDay,
      };
      this.usageStore.set(key, record);
    }

    // Handle month reset
    if (record.lastResetMonth !== currentMonth) {
      record.monthlyUsageCount = 0;
      record.lastResetMonth = currentMonth;
    }

    // Handle day reset
    if (record.lastResetDay !== currentDay) {
      record.dailyUsageCount = 0;
      record.lastResetDay = currentDay;
    }

    record.tier = tier;
    return record;
  }

  static canExecuteJob(userId: string, tenantId: string, tier: UserTier): { allowed: boolean; reason?: string } {
    const config = this.getTierConfig(tier);
    const usage = this.getUserUsage(userId, tenantId, tier);

    if (config.dailyLimit !== undefined && usage.dailyUsageCount >= config.dailyLimit) {
      return { allowed: false, reason: `Daily quota limit reached (${usage.dailyUsageCount}/${config.dailyLimit})` };
    }

    if (usage.monthlyUsageCount >= config.monthlyLimit) {
      return { allowed: false, reason: `Monthly quota limit reached (${usage.monthlyUsageCount}/${config.monthlyLimit})` };
    }

    return { allowed: true };
  }

  static incrementUsage(userId: string, tenantId: string, tier: UserTier) {
    const usage = this.getUserUsage(userId, tenantId, tier);
    usage.monthlyUsageCount += 1;
    usage.dailyUsageCount += 1;
  }
}
