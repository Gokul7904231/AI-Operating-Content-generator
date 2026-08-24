import { describe, it, expect } from "vitest";
import { OverseerAttentionController } from "../core/overseer/presence";

describe("FactoryOS Frontier v2 — Overseer Attention Controller Suite", () => {
  it("1. Spatial Gaze Coordinates: Computes deterministic coordinates for production floors", () => {
    const c1 = new OverseerAttentionController();
    const f01 = c1.setAttention("floor01_strategy", "Observing strategic planning", "NORMAL");
    expect(f01.gazeX).toBe(-0.4);
    expect(f01.gazeY).toBe(-0.3);

    const c2 = new OverseerAttentionController();
    const f03 = c2.setAttention("floor03_asset_realization", "Observing render pipeline", "HIGH");
    expect(f03.gazeX).toBe(0.5);
    expect(f03.gazeY).toBe(0.4);

    const c3 = new OverseerAttentionController();
    const f07 = c3.setAttention("floor07_compliance", "Checking compliance gates", "NORMAL");
    expect(f07.gazeX).toBe(0.5);
    expect(f07.gazeY).toBe(-0.4);
  });

  it("2. Attention Priority Arbitration: Higher priority targets cannot be overridden by lower priority targets", () => {
    const controller = new OverseerAttentionController();

    // Set CRITICAL incident attention
    controller.setAttention("floor03_asset_realization", "Critical render failure", "CRITICAL", { durationMs: 10000 });

    // Attempt to set LOW priority routine attention
    const result = controller.setAttention("factory", "Routine factory sweep", "LOW");

    expect(result.target).toBe("floor03_asset_realization");
    expect(result.priority).toBe("CRITICAL");
  });

  it("3. Attention Expiration: Reverts to factory/user baseline when duration expires", async () => {
    const controller = new OverseerAttentionController();

    controller.setAttention("floor02_scripting", "Temporary inspection", "LOW", { durationMs: 40 });

    await new Promise((r) => setTimeout(r, 60));

    const current = controller.getCurrentAttention();
    expect(current.target).toBe("factory");
  });
});
