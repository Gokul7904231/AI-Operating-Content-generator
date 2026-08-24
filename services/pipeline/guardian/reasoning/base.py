"""Reasoning engine protocol for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from typing import List, Protocol
from factoryos.guardian.capabilities.models import Capability
from factoryos.guardian.contracts.decision import GuardianDecisionProposal
from factoryos.guardian.contracts.guardian_state import GuardianState


class ReasoningEngine(Protocol):
    """Protocol for Guardian reasoning components (Deterministic, LLM, or Hybrid)."""

    def propose(
        self,
        state: GuardianState,
        available_capabilities: List[Capability],
        context: dict,
    ) -> GuardianDecisionProposal:
        """Propose next structured Guardian decision given state and capabilities."""
        ...
