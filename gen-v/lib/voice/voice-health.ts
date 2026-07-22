export interface ProviderHealth {
  providerId: string;
  online: boolean;
  latencyMs: number;
  failureCount: number;
  timeoutCount: number;
  circuitBreakerState: "CLOSED" | "HALF-OPEN" | "OPEN";
  lastFailureTime?: number;
}

class VoiceHealthTrackerClass {
  private healthStats = new Map<string, ProviderHealth>();

  constructor() {
    this.healthStats.set("supertonic", { providerId: "supertonic", online: true, latencyMs: 0, failureCount: 0, timeoutCount: 0, circuitBreakerState: "CLOSED" });
    this.healthStats.set("edge", { providerId: "edge", online: true, latencyMs: 0, failureCount: 0, timeoutCount: 0, circuitBreakerState: "CLOSED" });
    this.healthStats.set("elevenlabs", { providerId: "elevenlabs", online: true, latencyMs: 0, failureCount: 0, timeoutCount: 0, circuitBreakerState: "CLOSED" });
  }

  recordSuccess(providerId: string, latencyMs: number) {
    const stats = this.healthStats.get(providerId);
    if (stats) {
      stats.online = true;
      stats.latencyMs = latencyMs;
      stats.failureCount = 0;
      stats.timeoutCount = 0;
      stats.circuitBreakerState = "CLOSED";
    }
  }

  recordFailure(providerId: string, isTimeout = false) {
    const stats = this.healthStats.get(providerId);
    if (stats) {
      stats.failureCount++;
      if (isTimeout) stats.timeoutCount++;
      stats.lastFailureTime = Date.now();

      if (stats.failureCount >= 3) {
        stats.circuitBreakerState = "OPEN";
        stats.online = false;
        console.warn(`[VoiceHealth] Circuit breaker for provider "${providerId}" is now OPEN.`);
      }
    }
  }

  getStats(providerId: string): ProviderHealth | null {
    const stats = this.healthStats.get(providerId);
    if (!stats) return null;

    // Reset circuit breaker from OPEN to HALF-OPEN after 30 seconds
    if (stats.circuitBreakerState === "OPEN" && stats.lastFailureTime && Date.now() - stats.lastFailureTime > 30000) {
      stats.circuitBreakerState = "HALF-OPEN";
      stats.online = true;
      console.log(`[VoiceHealth] Circuit breaker for provider "${providerId}" reset to HALF-OPEN.`);
    }

    return stats;
  }

  getAllStats(): ProviderHealth[] {
    return Array.from(this.healthStats.values());
  }
}

export const VoiceHealthTracker = new VoiceHealthTrackerClass();
export default VoiceHealthTracker;
