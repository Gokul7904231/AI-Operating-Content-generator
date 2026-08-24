"""Deterministic Reasoning Engine for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from typing import List

import structlog

from factoryos.guardian.capabilities.models import Capability
from factoryos.guardian.contracts.decision import DecisionActionType, GuardianDecisionProposal, ReasonCategory
from factoryos.guardian.contracts.guardian_state import GuardianState

logger = structlog.get_logger(__name__)


class DeterministicReasoningEngine:
    """Deterministic, rule-based decision proposal engine."""

    def propose(
        self,
        state: GuardianState,
        available_capabilities: List[Capability],
        context: dict,
    ) -> GuardianDecisionProposal:
        """Propose next sequential capability execution based on state completed_actions."""
        completed = set(state.completed_actions)

        for cap in available_capabilities:
            if cap.name not in completed:
                logger.info("deterministic_reasoning_proposed_worker", target=cap.name)
                return GuardianDecisionProposal(
                    action_type=DecisionActionType.RUN_WORKER,
                    target_capability=cap.name,
                    target_worker=cap.name,
                    reason_category=ReasonCategory.WORKER_DEPENDENCY,
                    reasoning_summary=f"Executing next required floor worker capability: '{cap.name}'.",
                    expected_outcome=f"Worker capability '{cap.name}' completes successfully.",
                    parameters=context.get("worker_params", {}),
                )

        logger.info("deterministic_reasoning_proposed_complete")
        return GuardianDecisionProposal(
            action_type=DecisionActionType.COMPLETE,
            reason_category=ReasonCategory.OBJECTIVE_SATISFIED,
            reasoning_summary="All registered floor worker capabilities executed successfully.",
            expected_outcome="Floor execution objective completed.",
        )
