import { describe, it, expect } from "vitest";
import { OverseerEffectController } from "../core/overseer/presence";

describe("FactoryOS Frontier v2 — Overseer Performance & Reduced-Motion Suite", () => {
  it("1. Reduced Motion: Clamps effect level to Level 1 and disables particles when prefers-reduced-motion is true", () => {
    const controller = new OverseerEffectController({
      effectLevel: 4,
      prefersReducedMotion: true,
    });

    const level = controller.getEffectiveLevel("SUCCESS");
    expect(level).toBe(1);

    const particles = controller.getParticleConfig("SUCCESS", {
      valence: 0.8,
      arousal: 0.5,
      confidence: 0.9,
      uncertainty: 0.1,
      curiosity: 0.1,
      urgency: 0.0,
      satisfaction: 0.95,
      concern: 0.0,
      frustration: 0.0,
    }, "#00e676");

    expect(particles.count).toBe(0);
  });

  it("2. Low Power Mode: Restricts high GPU workloads to Level 2", () => {
    const controller = new OverseerEffectController({ effectLevel: 4 });
    controller.setLowPowerMode(true);

    const level = controller.getEffectiveLevel("IDLE");
    expect(level).toBeLessThanOrEqual(2);
  });

  it("3. Dynamic Cinematic Elevation: Elevates effect level to Level 5 for SUCCESS milestones", () => {
    const controller = new OverseerEffectController({ effectLevel: 3 });
    const level = controller.getEffectiveLevel("SUCCESS");
    expect(level).toBeGreaterThanOrEqual(4);
  });
});
