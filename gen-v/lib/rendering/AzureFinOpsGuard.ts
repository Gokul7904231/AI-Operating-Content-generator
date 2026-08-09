export interface AzureFinOpsConfig {
  monthlyBudgetUsd: number;
  currentSpendUsd: number;
  spendingLimitActive: boolean;
  emergencyLockdownActive: boolean;
  allowedVmSkus: string[];
  maxIdleMinutes: number;
  maxRenderDurationSeconds: number;
}

export interface BudgetAlert {
  percentage: number;
  triggered: boolean;
  message: string;
}

export class AzureFinOpsGuardClass {
  private config: AzureFinOpsConfig = {
    monthlyBudgetUsd: 50.0, // $50/mo budget baseline target
    currentSpendUsd: 0.0,
    spendingLimitActive: true,
    emergencyLockdownActive: false,
    allowedVmSkus: ["Standard_B2s_v2", "Standard_B4ls_v2", "Standard_B4s_v2"],
    maxIdleMinutes: 10,
    maxRenderDurationSeconds: 300,
  };

  private alerts: BudgetAlert[] = [
    { percentage: 25, triggered: false, message: "Budget usage reached 25%" },
    { percentage: 50, triggered: false, message: "Budget usage reached 50%" },
    { percentage: 75, triggered: false, message: "Budget usage reached 75%" },
    { percentage: 90, triggered: false, message: "Budget usage reached 90% - Non-critical renders throttled" },
    { percentage: 100, triggered: false, message: "Budget usage reached 100% - Emergency render pause activated" },
  ];

  /**
   * Set emergency cost lockdown switch (Layer 6 Kill Switch).
   */
  public setEmergencyLockdown(active: boolean): void {
    this.config.emergencyLockdownActive = active;
    console.warn(`[AzureFinOpsGuard] AZURE_RENDERING_LOCKDOWN set to ${active}`);
  }

  public isLockdownActive(): boolean {
    return this.config.emergencyLockdownActive;
  }

  /**
   * Check if a VM SKU complies with Azure Policy constraints (Layer 3).
   */
  public isSkuAllowed(sku: string): boolean {
    return this.config.allowedVmSkus.includes(sku);
  }

  /**
   * Record updated spend and check budget alerts (Layer 2 & Layer 4).
   */
  public updateSpend(currentSpendUsd: number): void {
    this.config.currentSpendUsd = currentSpendUsd;
    const ratio = (this.config.currentSpendUsd / this.config.monthlyBudgetUsd) * 100;

    for (const alert of this.alerts) {
      if (ratio >= alert.percentage && !alert.triggered) {
        alert.triggered = true;
        console.warn(`[AzureFinOpsGuard] ALERT: ${alert.message} (${currentSpendUsd.toFixed(2)} USD / ${this.config.monthlyBudgetUsd.toFixed(2)} USD)`);
      }
    }

    if (ratio >= 100) {
      this.config.emergencyLockdownActive = true;
    }
  }

  /**
   * Check if rendering is permitted for a given user tier based on budget guard state.
   */
  public canAcceptRenderJob(userTier: string): { allowed: boolean; reason?: string } {
    if (this.config.emergencyLockdownActive) {
      return { allowed: false, reason: "AZURE_RENDERING_LOCKDOWN: Cost lock is active. No new VM renders permitted." };
    }

    const ratio = (this.config.currentSpendUsd / this.config.monthlyBudgetUsd) * 100;
    if (ratio >= 90 && userTier === "FREE") {
      return { allowed: false, reason: "BUDGET_CAP_EXCEEDED: Free tier rendering paused to preserve budget for Pro/Admin." };
    }

    if (ratio >= 100 && userTier !== "ADMIN") {
      return { allowed: false, reason: "BUDGET_EXHAUSTED: Azure budget limit reached." };
    }

    return { allowed: true };
  }

  public getConfig(): AzureFinOpsConfig {
    return { ...this.config };
  }

  public getAlerts(): BudgetAlert[] {
    return [...this.alerts];
  }

  public reset(): void {
    this.config.currentSpendUsd = 0.0;
    this.config.emergencyLockdownActive = false;
    for (const alert of this.alerts) {
      alert.triggered = false;
    }
  }
}

export const AzureFinOpsGuard = new AzureFinOpsGuardClass();
