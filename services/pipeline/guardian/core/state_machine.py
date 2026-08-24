"""State Machine engine for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Set

import structlog

from factoryos.guardian.contracts.guardian_state import GuardianLifecycleState, GuardianState
from factoryos.guardian.core.exceptions import GuardianStateError

logger = structlog.get_logger(__name__)

# Authoritative Allowed Transition Table
VALID_TRANSITIONS: Dict[GuardianLifecycleState, Set[GuardianLifecycleState]] = {
    GuardianLifecycleState.CREATED: {
        GuardianLifecycleState.VALIDATING,
        GuardianLifecycleState.CANCELLED,
    },
    GuardianLifecycleState.VALIDATING: {
        GuardianLifecycleState.READY,
        GuardianLifecycleState.FAILED,
    },
    GuardianLifecycleState.READY: {
        GuardianLifecycleState.PLANNING,
        GuardianLifecycleState.CANCELLED,
    },
    GuardianLifecycleState.PLANNING: {
        GuardianLifecycleState.DECISION_PENDING,
        GuardianLifecycleState.RECOVERING,
        GuardianLifecycleState.FAILED,
    },
    GuardianLifecycleState.DECISION_PENDING: {
        GuardianLifecycleState.ACTION_AUTHORIZED,
        GuardianLifecycleState.RECOVERING,
        GuardianLifecycleState.ESCALATED,
        GuardianLifecycleState.FAILED,
    },
    GuardianLifecycleState.ACTION_AUTHORIZED: {
        GuardianLifecycleState.EXECUTING,
        GuardianLifecycleState.FAILED,
    },
    GuardianLifecycleState.EXECUTING: {
        GuardianLifecycleState.OBSERVING,
        GuardianLifecycleState.RECOVERING,
        GuardianLifecycleState.FAILED,
    },
    GuardianLifecycleState.OBSERVING: {
        GuardianLifecycleState.VERIFYING,
        GuardianLifecycleState.FAILED,
    },
    GuardianLifecycleState.VERIFYING: {
        GuardianLifecycleState.READY,
        GuardianLifecycleState.COMPLETED,
        GuardianLifecycleState.RECOVERING,
        GuardianLifecycleState.ESCALATED,
        GuardianLifecycleState.FAILED,
    },
    GuardianLifecycleState.RECOVERING: {
        GuardianLifecycleState.PLANNING,
        GuardianLifecycleState.READY,
        GuardianLifecycleState.ESCALATED,
        GuardianLifecycleState.FAILED,
    },
    GuardianLifecycleState.ESCALATED: {
        GuardianLifecycleState.CANCELLED,
        GuardianLifecycleState.FAILED,
    },
    GuardianLifecycleState.COMPLETED: set(),
    GuardianLifecycleState.FAILED: set(),
    GuardianLifecycleState.CANCELLED: set(),
}


class GuardianStateMachine:
    """Authoritative state machine encapsulating GuardianState lifecycle transitions."""

    def __init__(self, state: GuardianState):
        self._state = state

    @property
    def state(self) -> GuardianState:
        return self._state

    def transition_to(self, target_state: GuardianLifecycleState, reason: str = "") -> GuardianState:
        """Validate and execute state transition."""
        current = self._state.lifecycle_state
        allowed = VALID_TRANSITIONS.get(current, set())

        if target_state not in allowed:
            error_msg = f"Illegal Guardian state transition from '{current.value}' to '{target_state.value}'. Reason: {reason}"
            logger.error("illegal_state_transition", current=current.value, target=target_state.value, reason=reason)
            raise GuardianStateError(error_msg)

        logger.info(
            "guardian_state_transition",
            execution_id=str(self._state.execution_id),
            from_state=current.value,
            to_state=target_state.value,
            reason=reason,
        )

        self._state.lifecycle_state = target_state
        self._state.updated_at = datetime.now(timezone.utc)
        return self._state
