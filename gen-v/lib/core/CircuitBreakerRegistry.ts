import { RuntimeComponent, ComponentHealth, ComponentMetrics } from "./RuntimeComponent";

export type CircuitState = "CLOSED" | "OPEN" | "HALF-OPEN";

interface BreakerState {
  id: string;
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  cooldownMs: number;
}

class CircuitBreakerRegistryClass implements RuntimeComponent {
  id = "CircuitBreakerRegistry";
  version = "1.0.0";

  private breakers = new Map<string, BreakerState>();

  getBreaker(targetId: string): BreakerState {
    let breaker = this.breakers.get(targetId);
    if (!breaker) {
      breaker = {
        id: targetId,
        state: "CLOSED",
        failures: 0,
        lastFailureTime: 0,
        cooldownMs: 15000, // 15 seconds initial cooldown
      };
      this.breakers.set(targetId, breaker);
    }
    return breaker;
  }

  isOpen(targetId: string): boolean {
    const breaker = this.getBreaker(targetId);
    if (breaker.state === "OPEN") {
      if (Date.now() - breaker.lastFailureTime > breaker.cooldownMs) {
        // Transition to HALF-OPEN
        breaker.state = "HALF-OPEN";
        console.log(`[CircuitBreakerRegistry] Breaker for ${targetId} transitioned to HALF-OPEN.`);
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(targetId: string) {
    const breaker = this.getBreaker(targetId);
    if (breaker.state !== "CLOSED") {
      console.log(`[CircuitBreakerRegistry] Breaker for ${targetId} transitioned to CLOSED.`);
    }
    breaker.state = "CLOSED";
    breaker.failures = 0;
  }

  recordFailure(targetId: string) {
    const breaker = this.getBreaker(targetId);
    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= 5) {
      breaker.state = "OPEN";
      breaker.cooldownMs = Math.min(breaker.cooldownMs * 2, 300000); // Max 5 mins cooldown
      console.warn(`[CircuitBreakerRegistry] Breaker for ${targetId} tripped to OPEN. Cooldown: ${breaker.cooldownMs}ms`);
    }
  }

  async health(): Promise<ComponentHealth> {
    return {
      status: "healthy",
      lastChecked: new Date().toISOString(),
    };
  }

  async metrics(): Promise<ComponentMetrics> {
    const report: any = {};
    for (const breaker of this.breakers.values()) {
      report[breaker.id] = {
        state: breaker.state,
        failures: breaker.failures,
        cooldownMs: breaker.cooldownMs,
      };
    }
    return report;
  }

  async shutdown(): Promise<void> {
    this.breakers.clear();
  }
}

export const CircuitBreakerRegistry = new CircuitBreakerRegistryClass();
