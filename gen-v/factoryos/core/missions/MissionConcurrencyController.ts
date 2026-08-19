/**
 * FactoryOS Frontier v2 — Mission Concurrency Controller
 * Manages atomic reads, updates, OCC conflict resolution, and merge/retry operations against the source-of-truth repository.
 */

import type { Mission } from "../contracts/MissionContracts";
import type { IMissionRepository } from "../database/DatabaseContracts";
import { MissionConcurrencyConflictError, MissionNotFoundError } from "./MissionErrors";

export type MissionUpdateFunction = (mission: Mission) => void | Promise<void>;

export class MissionConcurrencyController {
  constructor(private repository: IMissionRepository) {}

  async executeAtomicUpdate(
    missionId: string,
    updateFn: MissionUpdateFunction,
    maxRetries: number = 3
  ): Promise<Mission> {
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      // 1. Fetch fresh mission from persistent repository (source of truth)
      const current = await this.repository.getMissionById(missionId);
      if (!current) {
        throw new MissionNotFoundError(missionId);
      }

      const expectedVersion = current.version || 1;
      const clone = structuredClone(current);

      // 2. Apply target modification
      await updateFn(clone);

      try {
        // 3. Attempt atomic save with version check
        await this.repository.saveMission(clone, expectedVersion);

        // 4. Return updated mission from repository to ensure consistency
        const updated = await this.repository.getMissionById(missionId);
        return updated || clone;
      } catch (err) {
        if (err instanceof MissionConcurrencyConflictError && attempt < maxRetries) {
          console.warn(
            `[MissionConcurrencyController] OCC conflict on ${missionId} (attempt ${attempt}/${maxRetries}), retrying...`
          );
          // Wait brief jittered backoff before retry
          await new Promise((r) => setTimeout(r, Math.random() * 20 + 10));
          continue;
        }
        throw err;
      }
    }

    throw new Error(`Failed to update mission ${missionId} after ${maxRetries} OCC retries.`);
  }
}
