"""Hybrid Reasoning Engine for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from typing import List, Optional

import structlog

from factoryos.guardian.capabilities.models import Capability
from factoryos.guardian.contracts.decision import GuardianDecisionProposal
from factoryos.guardian.contracts.guardian_state import GuardianState
from factoryos.guardian.reasoning.deterministic import DeterministicReasoningEngine
from factoryos.guardian.reasoning.llm import LLMReasoningEngine

logger = structlog.get_logger(__name__)


class HybridReasoningEngine:
    """Hybrid reasoning engine combining LLM proposals with deterministic fallback."""

    def __init__(
        self,
        llm_engine: Optional[LLMReasoningEngine] = None,
        deterministic_engine: Optional[DeterministicReasoningEngine] = None,
    ):
        self.llm_engine = llm_engine
        self.deterministic_engine = deterministic_engine or DeterministicReasoningEngine()

    def propose(
        self,
        state: GuardianState,
        available_capabilities: List[Capability],
        context: dict,
    ) -> GuardianDecisionProposal:
        """Attempt LLM proposal first if configured; fallback to Deterministic reasoning on any error."""
        if self.llm_engine and self.llm_engine.llm_provider_func:
            try:
                proposal = self.llm_engine.propose(state, available_capabilities, context)
                logger.info("hybrid_reasoning_llm_success")
                return proposal
            except Exception as exc:
                logger.warning("hybrid_reasoning_llm_failed_fallback_deterministic", error=str(exc))

        logger.info("hybrid_reasoning_executing_deterministic")
        return self.deterministic_engine.propose(state, available_capabilities, context)
