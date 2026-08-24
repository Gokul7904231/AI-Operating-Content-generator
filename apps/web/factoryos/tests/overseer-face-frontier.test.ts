import { describe, it, expect } from "vitest";
import {
  deriveOverseerExpression,
  EXPRESSION_MAP,
  type OverseerExpression,
} from "../../components/overseer/presence/OverseerStateMachine";

describe("Frontier Overseer EMO Face & State Machine Suite", () => {
  describe("State Machine & Expression Derivation", () => {
    it("maps all 11 core emotional/operational states to coherent visual configurations", () => {
      const expressions: OverseerExpression[] = [
        "idle",
        "observing",
        "listening",
        "thinking",
        "responding",
        "speaking",
        "rendering",
        "success",
        "warning",
        "error",
        "done",
      ];

      for (const expr of expressions) {
        const config = EXPRESSION_MAP[expr];
        expect(config).toBeDefined();
        expect(config.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(config.eyeScale).toBeGreaterThan(0.8);
        expect(config.pupilScale).toBeGreaterThan(0.7);
        expect(config.ringMode).toBeDefined();
        expect(config.label).toBeDefined();
      }
    });

    it("prioritizes voice states (SPEAKING / LISTENING) over ambient intent", () => {
      expect(deriveOverseerExpression("OBSERVING", "SPEAKING", 0, false)).toBe("speaking");
      expect(deriveOverseerExpression("OBSERVING", "LISTENING", 0, false)).toBe("listening");
    });

    it("transitions to rendering expression when active video rendering jobs exist", () => {
      expect(deriveOverseerExpression("OBSERVING", "IDLE", 2, false)).toBe("rendering");
    });

    it("triggers critical error expression when system has errors or CRITICAL intent", () => {
      expect(deriveOverseerExpression("OBSERVING", "IDLE", 0, true)).toBe("error");
      expect(deriveOverseerExpression("CRITICAL", "IDLE", 0, false)).toBe("error");
    });

    it("maps thinking, warning, and success intents accurately", () => {
      expect(deriveOverseerExpression("THINKING", "IDLE", 0, false)).toBe("thinking");
      expect(deriveOverseerExpression("WARNING", "IDLE", 0, false)).toBe("warning");
      expect(deriveOverseerExpression("SUCCESS", "IDLE", 0, false)).toBe("success");
    });
  });

  describe("Facial Geometry & Micro-Expressions Safety", () => {
    it("ensures eye squints and brow tilts stay within safe non-distorted bounds", () => {
      for (const key of Object.keys(EXPRESSION_MAP) as OverseerExpression[]) {
        const config = EXPRESSION_MAP[key];
        // Squint must not exceed 0.5 (which would invert eyes)
        expect(config.eyeSquint).toBeLessThan(0.5);
        expect(config.eyeSquint).toBeGreaterThanOrEqual(-0.2);

        // Brow tilt must stay within subtle natural angles (-10 to +10 degrees)
        expect(Math.abs(config.browTilt)).toBeLessThanOrEqual(10);

        // Ring speed must be positive and non-zero
        expect(config.ringSpeed).toBeGreaterThan(0);
      }
    });
  });
});
