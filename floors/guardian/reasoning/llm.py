"""LLM Reasoning Engine with bounded prompt isolation for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

import json
from typing import Any, Callable, List, Optional

import structlog

from factoryos.guardian.capabilities.models import Capability
from factoryos.guardian.contracts.decision import DecisionActionType, GuardianDecisionProposal, ReasonCategory
from factoryos.guardian.contracts.guardian_state import GuardianState
from factoryos.guardian.core.exceptions import GuardianValidationError

logger = structlog.get_logger(__name__)


class LLMReasoningEngine:
    """Bounded LLM reasoning engine operating on constrained, minimal JSON context."""

    def __init__(self, llm_provider_func: Optional[Callable[[str], str]] = None):
        self.llm_provider_func = llm_provider_func

    def build_bounded_prompt(
        self,
        state: GuardianState,
        available_capabilities: List[Capability],
        context: dict,
    ) -> str:
        """Construct constrained minimal context prompt for LLM proposal."""
        cap_summaries = [
            {"name": c.name, "floor": c.floor_id, "description": c.description}
            for c in available_capabilities
        ]
        constrained_payload = {
            "floor_id": state.floor_id,
            "objective": state.objective,
            "lifecycle_state": state.lifecycle_state.value,
            "completed_actions": state.completed_actions,
            "pending_actions": state.pending_actions,
            "available_capabilities": cap_summaries,
            "step_count": state.step_count,
        }
        return json.dumps(constrained_payload, indent=2)

    def propose(
        self,
        state: GuardianState,
        available_capabilities: List[Capability],
        context: dict,
    ) -> GuardianDecisionProposal:
        """Query LLM provider and validate response into structured GuardianDecisionProposal."""
        if not self.llm_provider_func:
            raise GuardianValidationError("LLM provider function not configured.")

        prompt = self.build_bounded_prompt(state, available_capabilities, context)
        raw_response = self.llm_provider_func(prompt)

        try:
            parsed_json = json.loads(raw_response)
            proposal = GuardianDecisionProposal.model_validate(parsed_json)
            logger.info("llm_reasoning_proposed", action_type=proposal.action_type.value)
            return proposal
        except Exception as exc:
            logger.error("llm_reasoning_parse_failed", error=str(exc))
            raise GuardianValidationError(f"Invalid LLM proposal response structure: {exc}") from exc
