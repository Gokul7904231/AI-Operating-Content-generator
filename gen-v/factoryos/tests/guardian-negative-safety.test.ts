import { describe, it, expect } from "vitest";
import { GuardianPolicy } from "../core/guardian/GuardianPolicy";

describe("FactoryOS Frontier v2 — Floor Guardian Negative Safety & Policy Suite", () => {
  const policy = new GuardianPolicy("floor02_scripting");

  it("1. Cross-Floor Prohibition: Blocks attempts to mutate foreign floor", () => {
    const verdict = policy.canExecuteLocally("RECOVER_WORKER", {
      floorId: "floor02_scripting",
      targetFloorId: "floor03_asset_realization", // Foreign floor!
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("foreign floor");
  });

  it("2. Mandatory Escalation on Critical Severity: Blocks direct local action on CRITICAL incident", () => {
    const verdict = policy.canExecuteLocally("RECOVER_WORKER", {
      floorId: "floor02_scripting",
      severity: "CRITICAL",
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("CRITICAL severity");
  });

  it("3. Irreversible Action Gate: Blocks irreversible local mutation without Overseer confirmation", () => {
    const verdict = policy.canExecuteLocally("CACHE_RESET", {
      floorId: "floor02_scripting",
      isIrreversible: true,
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("Irreversible");
  });
});
