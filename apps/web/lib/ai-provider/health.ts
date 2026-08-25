/**
 * FactoryOS AI Provider Health & Cooldown Tracker
 * ===============================================
 * Maintains in-memory operational health metrics and dynamic cooldown timers
 * for all configured provider slots without leaking credentials.
 */

import { ProviderHealthInfo } from "./types";

interface InternalHealthState {
  consecutiveFailures: number;
  totalRequests: number;
  totalSuccesses: number;
  totalFailures: number;
  lastFailureAt?: number;
  cooldownUntil?: number;
  lastErrorReason?: string;
}

export class ProviderHealthTracker {
  private static instance: ProviderHealthTracker;
  private states = new Map<string, InternalHealthState>();

  private constructor() {}

  public static getInstance(): ProviderHealthTracker {
    if (!ProviderHealthTracker.instance) {
      ProviderHealthTracker.instance = new ProviderHealthTracker();
    }
    return ProviderHealthTracker.instance;
  }

  private getState(providerId: string): InternalHealthState {
    let state = this.states.get(providerId);
    if (!state) {
      state = {
        consecutiveFailures: 0,
        totalRequests: 0,
        totalSuccesses: 0,
        totalFailures: 0,
      };
      this.states.set(providerId, state);
    }
    return state;
  }

  public isAvailable(providerId: string): { available: boolean; reason?: string } {
    const state = this.getState(providerId);
    const now = Date.now();

    if (state.cooldownUntil && state.cooldownUntil > now) {
      const remainingSec = Math.ceil((state.cooldownUntil - now) / 1000);
      return {
        available: false,
        reason: `Provider ${providerId} is in cooldown for ${remainingSec}s due to consecutive failures.`,
      };
    }

    return { available: true };
  }

  public recordSuccess(providerId: string): void {
    const state = this.getState(providerId);
    state.totalRequests += 1;
    state.totalSuccesses += 1;
    state.consecutiveFailures = 0;
    state.cooldownUntil = undefined;
    state.lastErrorReason = undefined;
  }

  public recordFailure(
    providerId: string,
    reason: string,
    cooldownSeconds: number = 60,
    consecutiveFailureThreshold: number = 2
  ): void {
    const state = this.getState(providerId);
    state.totalRequests += 1;
    state.totalFailures += 1;
    state.consecutiveFailures += 1;
    state.lastFailureAt = Date.now();
    state.lastErrorReason = reason;

    if (state.consecutiveFailures >= consecutiveFailureThreshold) {
      state.cooldownUntil = Date.now() + cooldownSeconds * 1000;
    }
  }

  public getHealth(providerId: string, isConfigured: boolean): ProviderHealthInfo {
    const state = this.getState(providerId);
    const now = Date.now();
    const inCooldown = !!(state.cooldownUntil && state.cooldownUntil > now);

    let status: ProviderHealthInfo["status"] = "healthy";
    if (!isConfigured) {
      status = "unconfigured";
    } else if (inCooldown) {
      status = "cooldown";
    } else if (state.consecutiveFailures > 0) {
      status = "degraded";
    }

    return {
      name: providerId,
      configured: isConfigured,
      status,
      consecutiveFailures: state.consecutiveFailures,
      totalRequests: state.totalRequests,
      totalSuccesses: state.totalSuccesses,
      totalFailures: state.totalFailures,
      lastFailureAt: state.lastFailureAt ? new Date(state.lastFailureAt).toISOString() : undefined,
      cooldownUntil: inCooldown && state.cooldownUntil ? new Date(state.cooldownUntil).toISOString() : undefined,
    };
  }

  public resetAll(): void {
    this.states.clear();
  }
}

export const healthTracker = ProviderHealthTracker.getInstance();
