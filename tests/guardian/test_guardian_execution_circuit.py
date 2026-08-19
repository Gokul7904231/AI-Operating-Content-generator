"""Unit tests for Circuit Breaker and Worker Runner."""

import pytest

from factoryos.guardian.capabilities.models import Capability
from factoryos.guardian.capabilities.registry import CapabilityRegistry
from factoryos.guardian.contracts.action import ActionRequest
from factoryos.guardian.contracts.worker_result import ExecutionStatus
from factoryos.guardian.execution.circuit_breaker import CircuitBreaker, CircuitState
from factoryos.guardian.execution.runner import WorkerRunner
from uuid import uuid4


def test_circuit_breaker_transitions():
    cb = CircuitBreaker(failure_threshold=2, recovery_cooldown_seconds=0.1)
    assert cb.state == CircuitState.CLOSED
    assert cb.allow_execution() is True

    cb.record_failure()
    assert cb.state == CircuitState.CLOSED

    cb.record_failure()
    assert cb.state == CircuitState.OPEN
    assert cb.allow_execution() is False


def test_worker_runner_execution_success():
    registry = CapabilityRegistry()
    registry.register(
        Capability(
            name="mock_worker",
            floor_id="floor01",
            description="Mock capability",
            handler=lambda params, context: {"status": "ok"},
        )
    )
    cb = CircuitBreaker()
    runner = WorkerRunner(registry, cb)

    req = ActionRequest(
        execution_id=uuid4(),
        decision_id=uuid4(),
        floor_id="floor01",
        capability_name="mock_worker",
        target_worker="mock_worker",
    )
    res = runner.execute_action(req, {})

    assert res.status == ExecutionStatus.SUCCESS
    assert res.output_data["status"] == "ok"
