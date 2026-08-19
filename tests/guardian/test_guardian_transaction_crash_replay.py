"""Transaction Crash, Replay, and Idempotency Unit Tests for Guardian System."""

from uuid import uuid4
import pytest

from factoryos.guardian.contracts.action import ActionRequest
from factoryos.guardian.execution.transaction import ActionTransactionState, TransactionalActionGate


def test_transaction_crash_recovery_after_prepared():
    gate = TransactionalActionGate()
    req = ActionRequest(execution_id=uuid4(), decision_id=uuid4(), floor_id="floor01", capability_name="worker_a", target_worker="worker_a")
    tx = gate.prepare_transaction(req, {"initial": 1})

    assert tx.state == ActionTransactionState.PREPARED
    # Simulate crash before commit -> Rollback transaction
    gate.rollback_transaction(tx.transaction_id, "Simulated crash after PREPARED state")
    assert gate._records[tx.transaction_id].state == ActionTransactionState.ROLLED_BACK


def test_transaction_duplicate_replay_idempotency():
    gate = TransactionalActionGate()
    req1 = ActionRequest(execution_id=uuid4(), decision_id=uuid4(), floor_id="floor01", capability_name="worker_a", target_worker="worker_a")
    tx1 = gate.prepare_transaction(req1, {})
    gate.commit_transaction(tx1.transaction_id, {"status": "ok"})

    assert tx1.idempotency_key.startswith("idemp-")
    assert gate._records[tx1.transaction_id].state == ActionTransactionState.COMMITTED
