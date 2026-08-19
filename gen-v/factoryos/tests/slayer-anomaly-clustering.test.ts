import { describe, it, expect } from "vitest";
import { SlayerCorrelationEngine } from "../core/slayers/SlayerCorrelationEngine";
import type { Case } from "../core/contracts/CaseContracts";

describe("FactoryOS Frontier v2 — Phase 4: Slayer Anomaly Clustering Suite", () => {
  const correlationEngine = new SlayerCorrelationEngine();

  it("1. Upstream/Downstream Pipeline Correlation: Clusters dependent multi-floor pipeline anomalies", () => {
    const cases: Case[] = [
      {
        caseId: "case_f01_prompt_stall",
        title: "Floor 01 Strategy Queue Stall",
        floorId: "floor01_strategy",
        category: "WORKER_STALL",
        severity: "HIGH",
        status: "DETECTED",
        detectorId: "slayer_general_patrol",
        createdAt: new Date().toISOString(),
      },
      {
        caseId: "case_f02_input_starvation",
        title: "Floor 02 Scripting Input Starvation",
        floorId: "floor02_scripting",
        category: "PIPELINE_STALL",
        severity: "MEDIUM",
        status: "DETECTED",
        detectorId: "slayer_pipeline",
        createdAt: new Date().toISOString(),
      },
    ] as unknown as Case[];

    const clusters = correlationEngine.correlateCases(cases);
    expect(clusters.length).toBe(1);
    expect(clusters[0].correlationType).toBe("UPSTREAM_DOWNSTREAM");
    expect(clusters[0].affectedFloorIds).toContain("floor01_strategy");
    expect(clusters[0].affectedFloorIds).toContain("floor02_scripting");
    expect(clusters[0].memberCaseIds).toContain("case_f01_prompt_stall");
    expect(clusters[0].memberCaseIds).toContain("case_f02_input_starvation");
  });

  it("2. Shared Resource Saturation Correlation: Clusters resource contention across independent floors", () => {
    correlationEngine.clear();

    const cases: Case[] = [
      {
        caseId: "case_f02_gpu_mem",
        title: "Host Memory Saturation on Scripting Audio",
        floorId: "floor02_scripting",
        category: "RESOURCE_STARVATION",
        severity: "HIGH",
        status: "DETECTED",
        detectorId: "slayer_compute",
        createdAt: new Date().toISOString(),
      },
      {
        caseId: "case_f07_storage_full",
        title: "Host Storage Contention on Compliance Vault",
        floorId: "floor07_compliance",
        category: "STORAGE_DEGRADED",
        severity: "HIGH",
        status: "DETECTED",
        detectorId: "slayer_compute",
        createdAt: new Date().toISOString(),
      },
    ] as unknown as Case[];

    const clusters = correlationEngine.correlateCases(cases);
    expect(clusters.length).toBe(1);
    expect(clusters[0].correlationType).toBe("SHARED_RESOURCE");
    expect(clusters[0].affectedFloorIds).toContain("floor02_scripting");
    expect(clusters[0].affectedFloorIds).toContain("floor07_compliance");
  });
});
