/**
 * FactoryOS Frontier v2 — Mission System Domain Errors
 */

import type { MissionState } from "../contracts/MissionContracts";

export class MissionConcurrencyConflictError extends Error {
  constructor(
    public readonly missionId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Optimistic concurrency conflict for mission ${missionId}: expected version ${expectedVersion}, but found version ${actualVersion}.`
    );
    this.name = "MissionConcurrencyConflictError";
  }
}

export class MissionNotFoundError extends Error {
  constructor(public readonly missionId: string) {
    super(`Mission ${missionId} not found.`);
    this.name = "MissionNotFoundError";
  }
}
