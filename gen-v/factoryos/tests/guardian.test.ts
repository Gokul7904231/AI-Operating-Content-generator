/**
 * FactoryOS v0.1 — Step 6 Evaluation Guardian Tests
 *
 * Verifies output completeness, schema validation, grounding checks, and
 * consolidated consensus PASS/REPAIR/FAIL decision logic.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { EvaluationGuardianImpl } from "../core/guardian/EvaluationGuardianImpl";
import {
  SchemaValidityEvaluator,
  CompletenessEvaluator,
  GroundingEvaluator,
} from "../core/guardian/DeterministicEvaluators";

describe("FactoryOS v0.1 — Evaluation Guardian", () => {
  let guardian: EvaluationGuardianImpl;

  beforeEach(() => {
    guardian = new EvaluationGuardianImpl();
    guardian.registerEvaluator(new SchemaValidityEvaluator(["title", "body"]));
    guardian.registerEvaluator(new CompletenessEvaluator(["title", "body"]));
    guardian.registerEvaluator(new GroundingEvaluator(["body"]));
  });

  it("decision is PASS when output satisfies all deterministic metrics", async () => {
    const output = {
      title: "FactoryOS core runtime",
      body: "Core runtime executes deterministic step workflows.",
    };
    const reference = "FactoryOS core runtime executes deterministic steps.";

    const report = await guardian.evaluateOutput(output, reference);

    expect(report.success).toBe(true);
    expect(report.decision).toBe("PASS");
    expect(report.metrics.every((m) => m.passed)).toBe(true);
  });

  it("decision is REPAIR when output has minor gaps (e.g. short text or low grounding)", async () => {
    const output = {
      title: "FactoryOS",
      body: "Short body", // Less than 10 chars -> fails completeness metric (score = 0.5)
    };
    const reference = "FactoryOS core runtime executes steps. Short body."; // Grounding passes

    const report = await guardian.evaluateOutput(output, reference);

    expect(report.success).toBe(false);
    expect(report.decision).toBe("REPAIR"); // Triggers REPAIR engine instead of terminal FAIL
  });

  it("decision is FAIL when output lacks required schema keys", async () => {
    const output = {
      title: "Missing body key",
    };

    const report = await guardian.evaluateOutput(output, "reference text");

    expect(report.success).toBe(false);
    expect(report.decision).toBe("FAIL"); // Critical schema failure -> terminal FAIL
  });

  it("decision is REPAIR when grounding density is weak but present", async () => {
    const output = {
      title: "FactoryOS core runtime",
      body: "Core runtime executes steps with sqlite.", // sqlite not in evidence: 4 matches / 6 terms = 0.66 (REPAIR)
    };
    const reference = "FactoryOS core runtime executes steps.";

    const report = await guardian.evaluateOutput(output, reference);

    expect(report.success).toBe(false);
    expect(report.decision).toBe("REPAIR");
  });
});
