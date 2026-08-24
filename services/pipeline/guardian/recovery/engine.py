"""Recovery Engine for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from enum import Enum
from typing import Optional

import structlog

from factoryos.guardian.contracts.guardian_state import GuardianState
from factoryos.guardian.contracts.worker_result import ExecutionStatus, WorkerResult

logger = structlog.get_logger(__name__)


class RecoveryStrategy(str, Enum):
    RETRY_SAME_ACTION = "RETRY_SAME_ACTION"
    RETRY_WITH_BACKOFF = "RETRY_WITH_BACKOFF"
    CHOOSE_ALTERNATE_CAPABILITY = "CHOOSE_ALTERNATE_CAPABILITY"
    REGENERATE_TARGET = "REGENERATE_TARGET"
    REPLAN = "REPLAN"
    ESCALATE = "ESCALATE"
    FAIL = "FAIL"


class RecoveryEngine:
    """Classifies failures and selects authoritative recovery strategy."""

    def classify_and_resolve(self, state: GuardianState, last_result: Optional[WorkerResult]) -> RecoveryStrategy:
        """Classify failure and return appropriate RecoveryStrategy."""
        if state.failure_count >= state.max_retries:
            logger.warning("recovery_limit_exceeded_escalating", failure_count=state.failure_count)
            return RecoveryStrategy.ESCALATE

        if last_result:
            if last_result.status == ExecutionStatus.CIRCUIT_BROKEN:
                return RecoveryStrategy.REPLAN

            if last_result.status == ExecutionStatus.TIMEOUT:
                return RecoveryStrategy.RETRY_WITH_BACKOFF

            if last_result.status == ExecutionStatus.POLICY_VIOLATION:
                return RecoveryStrategy.REPLAN

        return RecoveryStrategy.RETRY_SAME_ACTION
