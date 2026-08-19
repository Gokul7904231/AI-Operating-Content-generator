"""Transactional Action Safety for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field
import structlog

from factoryos.guardian.contracts.action import ActionRequest
from factoryos.guardian.contracts.worker_result import ExecutionStatus, WorkerResult
from factoryos.guardian.core.exceptions import GuardianError

logger = structlog.get_logger(__name__)


class ActionTransactionState(str, Enum):
    PROPOSED = "PROPOSED"
    AUTHORIZED = "AUTHORIZED"
    PREPARED = "PREPARED"
    EXECUTING = "EXECUTING"
    COMMITTED = "COMMITTED"
    ROLLED_BACK = "ROLLED_BACK"


class TransactionalActionRecord(BaseModel):
    """Authoritative record tracking single action transactional lifecycle."""

    model_config = ConfigDict(extra="forbid")

    transaction_id: UUID = Field(default_factory=uuid4)
    attempt_id: UUID = Field(default_factory=uuid4)
    execution_id: UUID = Field(...)
    decision_id: UUID = Field(...)

    capability_name: str = Field(...)
    idempotency_key: str = Field(...)
    state: ActionTransactionState = Field(default=ActionTransactionState.PROPOSED)

    preconditions: Dict[str, Any] = Field(default_factory=dict)
    postconditions: Dict[str, Any] = Field(default_factory=dict)
    rollback_strategy: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransactionalActionGate:
    """Manages transactional safety state transitions for action execution."""

    def __init__(self):
        self._records: Dict[UUID, TransactionalActionRecord] = {}

    def prepare_transaction(self, request: ActionRequest, preconditions: Dict[str, Any]) -> TransactionalActionRecord:
        """Create transaction in PREPARED state with idempotency key."""
        idempotency_key = f"idemp-{request.execution_id}-{request.capability_name}-{request.action_id}"
        tx = TransactionalActionRecord(
            execution_id=request.execution_id,
            decision_id=request.decision_id,
            capability_name=request.capability_name,
            idempotency_key=idempotency_key,
            state=ActionTransactionState.PREPARED,
            preconditions=preconditions,
        )
        self._records[tx.transaction_id] = tx
        logger.info("action_transaction_prepared", transaction_id=str(tx.transaction_id), capability=request.capability_name)
        return tx

    def commit_transaction(self, transaction_id: UUID, postconditions: Dict[str, Any]) -> None:
        """Transition transaction to COMMITTED state upon verified success."""
        if transaction_id in self._records:
            tx = self._records[transaction_id]
            tx.state = ActionTransactionState.COMMITTED
            tx.postconditions = postconditions
            tx.updated_at = datetime.now(timezone.utc)
            logger.info("action_transaction_committed", transaction_id=str(transaction_id))

    def rollback_transaction(self, transaction_id: UUID, error_reason: str) -> None:
        """Rollback transaction state on failure."""
        if transaction_id in self._records:
            tx = self._records[transaction_id]
            tx.state = ActionTransactionState.ROLLED_BACK
            tx.rollback_strategy = f"NO_SIDE_EFFECT_ROLLBACK: {error_reason}"
            tx.updated_at = datetime.now(timezone.utc)
            logger.warning("action_transaction_rolled_back", transaction_id=str(transaction_id), reason=error_reason)
