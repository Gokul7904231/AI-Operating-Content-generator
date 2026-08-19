/**
 * FactoryOS Frontier v2 — Repair Deduplicator
 * Generates deterministic repair fingerprints and prevents redundant simultaneous mutations.
 */

import { createHash } from "node:crypto";
import type { RepairFingerprint } from "../contracts/HealerContracts";

export class RepairDeduplicator {
  private activeFingerprints: Map<string, RepairFingerprint> = new Map();

  generateFingerprintId(floorId: string, target: string, category: string, actionType: string): string {
    const raw = `${floorId}:${target}:${category}:${actionType}`.toLowerCase();
    return createHash("sha256").update(raw).digest("hex").substring(0, 16);
  }

  checkAndRegister(
    floorId: string,
    target: string,
    category: string,
    actionType: string,
    caseId: string
  ): { isDuplicate: boolean; fingerprintId: string } {
    const fingerprintId = this.generateFingerprintId(floorId, target, category, actionType);

    const existing = this.activeFingerprints.get(fingerprintId);
    if (existing && existing.status === "IN_PROGRESS") {
      return { isDuplicate: true, fingerprintId };
    }

    this.activeFingerprints.set(fingerprintId, {
      fingerprintId,
      floorId,
      target,
      category,
      actionType,
      caseId,
      status: "IN_PROGRESS",
    });

    return { isDuplicate: false, fingerprintId };
  }

  completeRepair(fingerprintId: string, success: boolean): void {
    const existing = this.activeFingerprints.get(fingerprintId);
    if (existing) {
      this.activeFingerprints.set(fingerprintId, {
        ...existing,
        status: success ? "APPLIED" : "FAILED",
      });
    }
  }

  clear(): void {
    this.activeFingerprints.clear();
  }
}
