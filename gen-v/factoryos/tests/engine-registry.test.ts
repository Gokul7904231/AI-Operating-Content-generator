/**
 * FactoryOS Engine Registry & Validation Unit Tests
 */

import { describe, it, expect } from "vitest";
import { EngineRegistry } from "../../lib/core/EngineRegistry";
import { EngineDefinition } from "../../lib/core/EngineContracts";

describe("Engine Registry & Lifecycle Validation", () => {
  it("01: Lists active system engines for basic users", async () => {
    const basicUser = { uid: "user_basic_01", role: "USER" };
    const engines = await EngineRegistry.listAvailableEngines(basicUser);

    expect(engines.length).toBeGreaterThan(0);
    // All returned engines must be strictly ACTIVE and SYSTEM visibility
    for (const eng of engines) {
      expect(eng.status).toBe("ACTIVE");
      expect(eng.visibility).toBe("SYSTEM");
    }

    const quizEngine = engines.find((e) => e.engineId === "quiz");
    expect(quizEngine).toBeDefined();
    expect(quizEngine?.name).toBe("Quiz Engine");
    expect(quizEngine?.isDefault).toBe(true);
  });

  it("02: Validates engine definition and rejects missing name or unsupported render profile", () => {
    // Missing name
    const invalid1: Partial<EngineDefinition> = {
      generationConfig: { renderProfile: "FAST_QUIZ" },
    };
    const res1 = EngineRegistry.validateEngine(invalid1);
    expect(res1.valid).toBe(false);
    expect(res1.errors).toContain("Engine name is required.");

    // Unsupported render profile
    const invalid2: Partial<EngineDefinition> = {
      name: "Custom Experimental Engine",
      generationConfig: { renderProfile: "UNSUPPORTED_PROFILE_XYZ" },
    };
    const res2 = EngineRegistry.validateEngine(invalid2);
    expect(res2.valid).toBe(false);
    expect(res2.errors.some((e) => e.includes("Unsupported render profile"))).toBe(true);

    // Valid definition
    const valid: Partial<EngineDefinition> = {
      name: "Valid Psychology Engine",
      generationConfig: { renderProfile: "FAST_QUIZ" },
    };
    const res3 = EngineRegistry.validateEngine(valid);
    expect(res3.valid).toBe(true);
  });

  it("03: Pro/Admin users can register and see custom active user engines", async () => {
    const proUser = { uid: "pro_user_42", role: "PRO" };

    const created = await EngineRegistry.createEngine(
      {
        name: "My Quantum Trivia Engine",
        category: "QUIZ",
        generationConfig: { renderProfile: "FAST_QUIZ" },
        description: "Specialized in subatomic trivia",
      },
      proUser
    );

    expect(created.engineId).toBe("my-quantum-trivia-engine");
    expect(created.visibility).toBe("USER");
    expect(created.ownerId).toBe("pro_user_42");
    expect(created.status).toBe("ACTIVE");
  });
});
