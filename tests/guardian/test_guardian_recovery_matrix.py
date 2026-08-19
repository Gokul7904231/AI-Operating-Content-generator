"""Unit tests for Recovery Engine strategy classification matrix."""

import pytest
from uuid import uuid4

from factoryos.guardian.contracts.guardian_state import GuardianState
from factoryos.guardian.contracts.worker_result import ExecutionStatus, WorkerResult
from factoryos.guardian.recovery.engine import RecoveryEngine, RecoveryStrategy


def test_recovery_matrix_circuit_broken_to_replan():
    engine = RecoveryEngine()
    state = GuardianState(
        request_id="req-rec-1",
        floor_id="floor01",
        objective="Test Recovery Matrix",
        input_contract_hash="hash-12345678",
        failure_count=1,
    )
    result = WorkerResult(
        action_id=uuid4(),
        execution_id=state.execution_id,
        capability_name="worker_a",
        target_worker="worker_a",
        status=ExecutionStatus.CIRCUIT_BROKEN,
        duration_ms=0.0,
    )

    strat = engine.classify_and_resolve(state, result)
    assert strat == RecoveryStrategy.REPLAN


def test_recovery_matrix_timeout_to_retry_with_backoff():
    engine = RecoveryEngine()
    state = GuardianState(
        request_id="req-rec-2",
        floor_id="floor01",
        objective="Test Timeout Recovery",
        input_contract_hash="hash-12345678",
        failure_count=1,
    )
    result = WorkerResult(
        action_id=uuid4(),
        execution_id=state.execution_id,
        capability_name="worker_a",
        target_worker="worker_a",
        status=ExecutionStatus.TIMEOUT,
        duration_ms=5000.0,
    )

    strat = engine.classify_and_resolve(state, result)
    assert strat == RecoveryStrategy.RETRY_WITH_BACKOFF


def test_recovery_matrix_max_retries_exceeded_to_escalate():
    engine = RecoveryEngine()
    state = GuardianState(
        request_id="req-rec-3",
        floor_id="floor01",
        objective="Test Escalation",
        input_contract_hash="hash-12345678",
        failure_count=3,
        max_retries=3,
    )
    result = WorkerResult(
        action_id=uuid4(),
        execution_id=state.execution_id,
        capability_name="worker_a",
        target_worker="worker_a",
        status=ExecutionStatus.FAILED,
        duration_ms=100.0,
    )

    strat = engine.classify_and_resolve(state, result)
    assert strat == RecoveryStrategy.ESCALATE
