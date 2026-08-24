/**
 * FactoryOS Frontier v2 — Guardian State Machine
 * Coordinates the autonomous execution cycle: BOOT -> RESTORE -> OBSERVE -> AUDIT -> CLASSIFY -> PLAN -> DISPATCH -> EXECUTE -> VERIFY -> REPORT -> IDLE
 */

import type { GuardianState } from "./GuardianContracts";

export class GuardianStateMachine {
  private currentState: GuardianState = "BOOT";
  private history: { from: GuardianState; to: GuardianState; timestamp: string; reason?: string }[] = [];

  constructor(initialState: GuardianState = "BOOT") {
    this.currentState = initialState;
  }

  getState(): GuardianState {
    return this.currentState;
  }

  transition(to: GuardianState, reason?: string): boolean {
    const from = this.currentState;
    if (from === to) return true;

    this.currentState = to;
    this.history.push({
      from,
      to,
      timestamp: new Date().toISOString(),
      reason,
    });

    if (this.history.length > 100) {
      this.history.shift();
    }

    return true;
  }

  getHistory(): { from: GuardianState; to: GuardianState; timestamp: string; reason?: string }[] {
    return [...this.history];
  }
}
