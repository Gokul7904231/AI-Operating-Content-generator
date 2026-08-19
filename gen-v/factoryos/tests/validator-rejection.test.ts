import { describe, it, expect, beforeEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";

describe("FactoryOS Frontier v2 — Validator Invariant Enforcement & Rejection Suite", () => {
  let controller: AutonomousFactoryController;

  beforeEach(async () => {
    controller = new AutonomousFactoryController({ autoStartSwarm: false });
    await controller.boot();
  });

  it("01: Validator passes and transitions Case to RESOLVED when all invariants are satisfied", async () => {
    // 1. Create a degraded case
    const testCase = await controller.caseManager.createCase({
      title: "Floor 02 Pipeline Stutter",
      description: "Minor frame delay on Floor 02",
      floorId: "floor02_scripting",
      category: "FLOOR_EXECUTION_ERROR",
      severity: "LOW",
      detectorId: "slayer_pipeline",
      symptoms: ["Frame jitter"],
      observedState: { jitterMs: 120 },
    });

    // 2. Set floor to healthy ONLINE and transition case to VERIFYING
    controller.worldState.updateFloorStatus("floor02_scripting", "ONLINE", "Nominal state");
    await controller.caseManager.transitionStatus(testCase.caseId, "HEALING", "Healer", "Applied fix");
    const verifyingCase = await controller.caseManager.transitionStatus(testCase.caseId, "VERIFYING", "Healer", "Ready for validation");

    // 3. Run Validator verification
    const report = await controller.validatorAgent.verifyCaseResolution(verifyingCase);
    expect(report.overallPassed).toBe(true);
    expect(report.invariantsChecked.every((c: any) => c.passed)).toBe(true);

    const updatedCase = await controller.caseManager.getCase(testCase.caseId);
    expect(updatedCase?.status).toBe("RESOLVED");
  });

  it("02: Validator rejects resolution and transitions Case to FAILED when world state remains degraded", async () => {
    // 1. Create a degraded case
    const testCase = await controller.caseManager.createCase({
      title: "Floor 03 Unresolved Crash",
      description: "Renderer failed to boot",
      floorId: "floor03_asset_realization",
      category: "RESOURCE_EXHAUSTION",
      severity: "HIGH",
      detectorId: "slayer_rendering",
      symptoms: ["Kernel crash"],
      observedState: { crashCode: 139 },
    });

    // 2. Ground truth world state is still ERROR/DEGRADED (Healer claimed success but repair failed)
    controller.worldState.updateFloorStatus("floor03_asset_realization", "ERROR", "Persistent GPU crash");
    await controller.caseManager.transitionStatus(testCase.caseId, "HEALING", "Healer", "Attempted fix");
    const verifyingCase = await controller.caseManager.transitionStatus(testCase.caseId, "VERIFYING", "Healer", "Ready for validation");

    // 3. Run Validator verification
    const report = await controller.validatorAgent.verifyCaseResolution(verifyingCase);
    expect(report.overallPassed).toBe(false);

    // Verify invariant failure details
    const floorCheck = report.invariantsChecked.find((c: any) => c.invariantId === "inv_floor_online");
    expect(floorCheck?.passed).toBe(false);
    expect(floorCheck?.actualValue).toBe("ERROR");

    // Case must NOT be marked RESOLVED; it must be marked FAILED or ESCALATED
    const updatedCase = await controller.caseManager.getCase(testCase.caseId);
    expect(updatedCase?.status).not.toBe("RESOLVED");
    expect(updatedCase?.status).toBe("FAILED");
  });
});
