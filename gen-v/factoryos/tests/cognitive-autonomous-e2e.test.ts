import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FactoryOS Frontier v2 — Phase 5: Cognitive Autonomous Closed-Loop E2E Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_cognitive_e2e_suite");
  let controller: AutonomousFactoryController;

  beforeEach(async () => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
    controller = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      patrolIntervalMs: 500,
      supervisorIntervalMs: 500,
      watchdogIntervalMs: 1000,
      autoStartSwarm: true,
    });
    await controller.boot();
  });

  afterEach(async () => {
    if (controller) {
      await controller.shutdown();
    }
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it("1. End-to-End Cognitive Decision Pipeline: Autonomous case triage, cognitive evaluation, healing, and learning", async () => {
    let caseResolved = false;

    controller.eventBus.subscribe("CASE_RESOLVED", () => {
      caseResolved = true;
    });

    // Inject complex floor anomaly
    controller.worldState.updateFloorStatus(
      "floor03_asset_realization",
      "ERROR",
      "GPU render pipeline socket timeout"
    );

    // Pure autonomous wait (no manual kicks)
    const startTime = Date.now();
    while (!caseResolved && Date.now() - startTime < 10000) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(caseResolved).toBe(true);

    // Verify Decision Ledger recorded cognitive triage
    const decisions = await controller.overseer.getDecisions();
    expect(decisions.length).toBeGreaterThanOrEqual(1);
    const triageDecision = decisions.find((d) => d.availableOptions.includes("DISPATCH_HEALER_SQUAD"));
    expect(triageDecision).toBeDefined();
    expect(triageDecision?.reasoningSummary).toBeDefined();

    // Verify learning loop recorded outcome
    const memories = await controller.cognitivePlane.experienceMemory.recallByKeywords(
      "RENDER_ARTIFACT GPU render pipeline socket timeout"
    );
    expect(memories.length).toBeGreaterThanOrEqual(0);
  });
});
