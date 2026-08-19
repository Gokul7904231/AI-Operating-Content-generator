/**
 * FactoryOS Frontier v2 — Repair Dependency & Blast Radius Analyzer
 * Evaluates resource dependencies, affected floors, and blast radius before mutating repairs.
 */

import type { RepairDependency } from "../contracts/HealerContracts";
import type { Case } from "../contracts/CaseContracts";

export class RepairDependencyAnalyzer {
  /**
   * Analyzes the blast radius of a case and its target resource.
   */
  analyzeDependency(caseItem: Case): RepairDependency {
    const floorId = caseItem.floorId;
    const target = caseItem.targetWorker || "unknown_resource";

    let blastRadius: RepairDependency["blastRadius"] = "LOCAL";
    const affectedFloorIds: string[] = [floorId];
    const dependentResourceIds: string[] = [`res:${target}`];

    if (caseItem.category === "RESOURCE_STARVATION" || target.includes("host") || target.includes("gpu")) {
      blastRadius = "CROSS_FLOOR";
      affectedFloorIds.push("floor02_scripting", "floor03_asset_realization");
      dependentResourceIds.push("res:gpu_pool", "res:host_memory");
    } else if (caseItem.severity === "CRITICAL" || caseItem.category === "PERMISSION_VIOLATION") {
      blastRadius = "GLOBAL";
      affectedFloorIds.push("floor01_strategy", "floor02_scripting", "floor03_asset_realization", "floor07_compliance");
      dependentResourceIds.push("res:kernel_lock");
    }

    return {
      primaryResourceId: `res:${target}`,
      dependentResourceIds,
      affectedFloorIds: Array.from(new Set(affectedFloorIds)),
      blastRadius,
    };
  }
}
