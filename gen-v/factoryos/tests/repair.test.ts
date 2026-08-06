/**
 * FactoryOS v0.1 — Step 7 Repair Engine Tests
 *
 * Verifies the evaluation-repair correction loop, attempt bounding, and
 * recovery of incomplete/ungrounded outputs.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { EvaluationGuardianImpl } from "../core/guardian/EvaluationGuardianImpl";
import { LocalRepairEngine } from "../core/repair/LocalRepairEngine";
import { RepairRunner } from "../core/repair/RepairRunner";
import { RepairExecutionError } from "../core/errors/Errors";
import {
  SchemaValidityEvaluator,
  CompletenessEvaluator,
  GroundingEvaluator,
} from "../core/guardian/DeterministicEvaluators";

describe("FactoryOS v0.1 — Repair Engine Loop", () => {
  let guardian: EvaluationGuardianImpl;
  let engine: LocalRepairEngine;
  let runner: RepairRunner;

  beforeEach(() => {
    guardian = new EvaluationGuardianImpl();
    guardian.registerEvaluator(new SchemaValidityEvaluator(["title", "body"]));
    guardian.registerEvaluator(new CompletenessEvaluator(["title", "body"]));
    guardian.registerEvaluator(new GroundingEvaluator(["body"]));

    engine = new LocalRepairEngine();
    runner = new RepairRunner({
      guardian,
      repairEngine: engine,
      maxAttempts: 3,
    });
  });

  it("successfully repairs completeness gaps in 1 attempt", async () => {
    // Body is too short (completeness fail), but grounding passes because it contains "FactoryOS"
    const incompleteGenerator = async () => ({
      title: "FactoryOS core runtime",
      body: "Short", // 5 chars -> fails completeness (score = 0.5)
    });

    const reference = "FactoryOS core runtime executes deterministic steps. Short body.";

    const result = await runner.runWithRepair(incompleteGenerator, reference);

    expect(result.attempts).toBe(2); // Initial check + 1 repair attempt
    expect(result.output.body.length).toBeGreaterThanOrEqual(10);
    expect(result.output.title).toBe("FactoryOS core runtime");
  });

  it("throws RepairExecutionError if repair attempts exceed maxAttempts limit", async () => {
    // Body is too short
    const incompleteGenerator = async () => ({
      title: "FactoryOS core",
      body: "Short",
    });

    const shortRunner = new RepairRunner({
      guardian,
      repairEngine: engine,
      maxAttempts: 1, // Only 1 attempt allowed (fails immediately after first check)
    });

    await expect(
      shortRunner.runWithRepair(incompleteGenerator, "FactoryOS reference")
    ).rejects.toThrowError(RepairExecutionError);
  });

  it("successfully repairs grounding deficiencies by extracting from reference evidence", async () => {
    const ungroundedGenerator = async () => ({
      title: "FactoryOS core runtime",
      body: "FactoryOS executes redis database.", // 2 matches / 4 terms = 0.5 (triggers REPAIR)
    });

    const reference = "FactoryOS core runtime executes deterministic steps.";

    const result = await runner.runWithRepair(ungroundedGenerator, reference);

    expect(result.attempts).toBeGreaterThanOrEqual(2);
    // Verified that it contains some of the reference words appended
    expect(result.output.body.toLowerCase()).toContain("deterministic");
    expect(result.output.body.toLowerCase()).toContain("executes");
  });
});
