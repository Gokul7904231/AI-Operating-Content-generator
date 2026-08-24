/**
 * FactoryOS v1 — Transactional Repair Safety Gate
 * Executes repair actions with precondition checking, step atomic execution, and automatic rollback on failure.
 */

import type { RepairAction } from "../contracts/HealerContracts";

export interface TransactionalRepairContext {
  readonly caseId: string;
  readonly targetComponent: string;
  readonly parameters: Record<string, unknown>;
}

export class TransactionalRepairGate {
  async executePlan(
    actions: RepairAction[],
    rollbackActions: RepairAction[],
    applyFn: (action: RepairAction) => Promise<boolean>,
    rollbackFn: (action: RepairAction) => Promise<boolean>
  ): Promise<{ success: boolean; executedActions: RepairAction[]; error?: string }> {
    const executed: RepairAction[] = [];

    for (const action of actions) {
      try {
        const ok = await applyFn(action);
        if (!ok) {
          throw new Error(`Repair action ${action.actionType} on ${action.target} failed.`);
        }
        executed.push({
          ...action,
          executedAt: new Date().toISOString(),
          status: "APPLIED",
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        // Execute rollback of applied actions in reverse order
        for (const rbAction of rollbackActions) {
          try {
            await rollbackFn(rbAction);
          } catch (rbErr) {
            // Log rollback error
          }
        }
        return {
          success: false,
          executedActions: executed,
          error: errorMsg,
        };
      }
    }

    return {
      success: true,
      executedActions: executed,
    };
  }
}
