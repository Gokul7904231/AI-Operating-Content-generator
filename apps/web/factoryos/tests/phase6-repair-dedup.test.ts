import { describe, it, expect } from "vitest";
import { RepairDeduplicator } from "../core/healers/RepairDeduplicator";

describe("FactoryOS Frontier v2 — Phase 6: Repair Deduplication Suite", () => {
  it("1. Duplicate Suppression: Identical repair plan in progress is suppressed", () => {
    const dedup = new RepairDeduplicator();

    const first = dedup.checkAndRegister("floor03_asset_realization", "render_farm", "RENDER_ARTIFACT", "RESTART_SOCKET", "case_01");
    expect(first.isDuplicate).toBe(false);

    // Second identical attempt while first is in progress
    const second = dedup.checkAndRegister("floor03_asset_realization", "render_farm", "RENDER_ARTIFACT", "RESTART_SOCKET", "case_02");
    expect(second.isDuplicate).toBe(true);

    // Complete first repair
    dedup.completeRepair(first.fingerprintId, true);

    // Now a new repair can register
    const third = dedup.checkAndRegister("floor03_asset_realization", "render_farm", "RENDER_ARTIFACT", "RESTART_SOCKET", "case_03");
    expect(third.isDuplicate).toBe(false);
  });
});
