import { describe, it, expect } from "vitest";
import { GuardianStateMachine } from "../core/guardian/GuardianStateMachine";

describe("FactoryOS Frontier v2 — Floor Guardian State Machine Suite", () => {
  it("1. State Transition Lifecycle: Transitions through full execution loop", () => {
    const sm = new GuardianStateMachine("BOOT");
    expect(sm.getState()).toBe("BOOT");

    sm.transition("RESTORE", "Restoring state from WorldState");
    expect(sm.getState()).toBe("RESTORE");

    sm.transition("OBSERVE", "Gathering floor telemetry");
    expect(sm.getState()).toBe("OBSERVE");

    sm.transition("AUDIT", "Running audit algorithms");
    expect(sm.getState()).toBe("AUDIT");

    sm.transition("CLASSIFY", "Classifying health score");
    expect(sm.getState()).toBe("CLASSIFY");

    sm.transition("PLAN", "Generating autonomous decision plan");
    expect(sm.getState()).toBe("PLAN");

    sm.transition("DISPATCH", "Dispatching local actions");
    expect(sm.getState()).toBe("DISPATCH");

    sm.transition("EXECUTE", "Executing recovery");
    expect(sm.getState()).toBe("EXECUTE");

    sm.transition("VERIFY", "Verifying recovery outcome");
    expect(sm.getState()).toBe("VERIFY");

    sm.transition("REPORT", "Publishing audit report");
    expect(sm.getState()).toBe("REPORT");

    sm.transition("IDLE", "Cycle completed");
    expect(sm.getState()).toBe("IDLE");

    const history = sm.getHistory();
    expect(history.length).toBe(10);
    expect(history[0].from).toBe("BOOT");
    expect(history[0].to).toBe("RESTORE");
  });
});
