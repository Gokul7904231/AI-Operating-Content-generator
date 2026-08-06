export type ProductionQuotaLimit = 4 | 5 | 6;

export interface DailyProductionPolicyConfig {
  enabled: boolean;
  maxPerDay: ProductionQuotaLimit;
  timezone: string;
  minimumSpacingMinutes: number;
  maxConcurrentJobs: number;
  maxRetriesPerJob: number;
}

export class DailyProductionPolicy {
  private config: DailyProductionPolicyConfig;

  constructor(config?: Partial<DailyProductionPolicyConfig>) {
    this.config = {
      enabled: true,
      maxPerDay: config?.maxPerDay ?? 6,
      timezone: config?.timezone ?? "UTC",
      minimumSpacingMinutes: config?.minimumSpacingMinutes ?? 60,
      maxConcurrentJobs: config?.maxConcurrentJobs ?? 1,
      maxRetriesPerJob: config?.maxRetriesPerJob ?? 3,
    };
  }

  setQuota(limit: ProductionQuotaLimit): void {
    this.config.maxPerDay = limit;
  }

  getConfig(): DailyProductionPolicyConfig {
    return { ...this.config };
  }

  canScheduleMore(completedCount: number, activeCount: number): boolean {
    if (!this.config.enabled) return false;
    return (completedCount + activeCount) < this.config.maxPerDay;
  }
}
