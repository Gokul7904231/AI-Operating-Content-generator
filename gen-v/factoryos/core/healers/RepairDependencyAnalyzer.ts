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
    const target = caseItem.targetWorker || `floor_resource_${floorId}`;

    let blastRadius: RepairDependency["blastRadius"] = "LOCAL";
    const affectedFloorIds: string[] = [floorId];
    const dependentResourceIds: string[] = [`res:${target}`];

    if (
      caseItem.category === "RESOURCE_STARVATION" ||
      caseItem.category === "GPU_SATURATION" ||
      target.includes("host") ||
      target.includes("gpu")
    ) {
      blastRadius = "CROSS_FLOOR";
      affectedFloorIds.push("floor02_scripting", "floor03_asset_realization");
      dependentResourceIds.push("res:gpu_pool", "res:host_memory");
    } else if (
      caseItem.severity === "CRITICAL" ||
      caseItem.category === "PERMISSION_VIOLATION" ||
      caseItem.category === "POLICY_VIOLATION"
    ) {
      blastRadius = "GLOBAL";
      affectedFloorIds.push("floor01_strategy", "floor02_scripting", "floor03_asset_realization", "floor07_compliance");
      dependentResourceIds.push("res:kernel_lock");
    }

    return {
      primaryResourceId: `res:${target}`,
      dependentResourceIds: Array.from(new Set(dependentResourceIds)),
      affectedFloorIds: Array.from(new Set(affectedFloorIds)),
      blastRadius,
    };
  }

  /**
   * Evaluates if two repair dependencies share conflicting resources or floor locks.
   */
  hasConflict(depA: RepairDependency, depB: RepairDependency): boolean {
    // 1. Primary resource overlap
    if (depA.primaryResourceId === depB.primaryResourceId) {
      return true;
    }

    // 2. Dependent resource intersection
    const bDeps = new Set(depB.dependentResourceIds);
    for (const rA of depA.dependentResourceIds) {
      if (bDeps.has(rA)) return true;
    }

    // 3. Global blast radius blocks all other concurrent repairs
    if (depA.blastRadius === "GLOBAL" || depB.blastRadius === "GLOBAL") {
      return true;
    }

    return false;
  }

  /**
   * Determines whether two active cases can be dispatched concurrently without race conditions.
   */
  canRunConcurrently(caseA: Case, caseB: Case): boolean {
    const depA = this.analyzeDependency(caseA);
    const depB = this.analyzeDependency(caseB);
    return !this.hasConflict(depA, depB);
  }
}
