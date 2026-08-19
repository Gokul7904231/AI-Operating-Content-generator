/**
 * FactoryOS Frontier v2 — Slayer Anomaly Correlation & Cross-Floor Clustering Engine
 * Groups causally-linked, upstream/downstream, or shared-resource floor anomalies into composite clusters.
 */

import { randomUUID } from "node:crypto";
import type { SlayerCluster, AnomalyCorrelation } from "../contracts/SlayerContracts";
import type { Case } from "../contracts/CaseContracts";

export class SlayerCorrelationEngine {
  private clusters: Map<string, SlayerCluster> = new Map();
  private correlations: AnomalyCorrelation[] = [];

  // Known topological floor dependencies
  private static readonly FLOOR_PIPELINE_ORDER = [
    "floor01_strategy",
    "floor02_scripting",
    "floor03_asset_realization",
    "floor07_compliance",
  ];

  /**
   * Correlates active cases across floors based on topological dependency and shared resources.
   */
  correlateCases(cases: Case[]): SlayerCluster[] {
    if (cases.length < 2) return [];
    const activeCases = cases;

    const newClusters: SlayerCluster[] = [];

    // 1. Check for Upstream / Downstream Pipeline Dependency
    const floorCasesMap = new Map<string, Case[]>();
    for (const c of activeCases) {
      const list = floorCasesMap.get(c.floorId) || [];
      list.push(c);
      floorCasesMap.set(c.floorId, list);
    }

    const affectedFloors = Array.from(floorCasesMap.keys());

    // Check topological pipeline chain
    const hasPipelineChain =
      (affectedFloors.includes("floor01_strategy") && affectedFloors.includes("floor02_scripting")) ||
      (affectedFloors.includes("floor02_scripting") && affectedFloors.includes("floor03_asset_realization")) ||
      (affectedFloors.includes("floor01_strategy") && affectedFloors.includes("floor03_asset_realization"));

    if (hasPipelineChain) {
      const clusterId = `cluster_pipeline_${randomUUID().substring(0, 8)}`;
      const memberCaseIds = activeCases
        .filter((c) => affectedFloors.includes(c.floorId))
        .map((c) => c.caseId);

      const cluster: SlayerCluster = {
        clusterId,
        memberCaseIds,
        affectedFloorIds: affectedFloors,
        correlationType: "UPSTREAM_DOWNSTREAM",
        confidence: 0.9,
        evidenceIds: memberCaseIds.map((id) => `ev_case_${id}`),
        rootCauseHypothesis: `Upstream pipeline starvation/stall detected originating from ${affectedFloors[0]}.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.clusters.set(clusterId, cluster);
      newClusters.push(cluster);

      // Record pairwise correlations
      for (let i = 0; i < activeCases.length - 1; i++) {
        for (let j = i + 1; j < activeCases.length; j++) {
          this.correlations.push({
            sourceAnomalyId: activeCases[i].caseId,
            targetAnomalyId: activeCases[j].caseId,
            relationship: "CAUSES",
            confidence: 0.88,
            evidenceIds: [activeCases[i].caseId, activeCases[j].caseId],
          });
        }
      }
    }

    // 2. Check for Shared Resource Contention (GPU / Storage / Database)
    const resourceCategories = ["RESOURCE_STARVATION", "WORKER_STALL", "STORAGE_DEGRADED"];
    const resourceCases = activeCases.filter((c) => resourceCategories.includes(c.category));

    if (resourceCases.length >= 2 && !hasPipelineChain) {
      const clusterId = `cluster_resource_${randomUUID().substring(0, 8)}`;
      const memberCaseIds = resourceCases.map((c) => c.caseId);
      const resFloors = Array.from(new Set(resourceCases.map((c) => c.floorId)));

      const cluster: SlayerCluster = {
        clusterId,
        memberCaseIds,
        affectedFloorIds: resFloors,
        correlationType: "SHARED_RESOURCE",
        confidence: 0.85,
        evidenceIds: memberCaseIds,
        rootCauseHypothesis: `Shared host resource saturation causing multi-floor degradation across [${resFloors.join(", ")}].`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.clusters.set(clusterId, cluster);
      newClusters.push(cluster);
    }

    return newClusters;
  }

  getClusters(): SlayerCluster[] {
    return Array.from(this.clusters.values()).map((c) => structuredClone(c));
  }

  getCorrelations(): AnomalyCorrelation[] {
    return structuredClone(this.correlations);
  }

  clear(): void {
    this.clusters.clear();
    this.correlations = [];
  }
}
