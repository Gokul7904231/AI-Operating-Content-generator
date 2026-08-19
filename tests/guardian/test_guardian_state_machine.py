"""Unit tests for Guardian State Machine lifecycle transitions."""

import pytest
from pydantic import ValidationError

from factoryos.guardian.contracts.guardian_state import GuardianLifecycleState, GuardianState
from factoryos.guardian.core.exceptions import GuardianStateError
from factoryos.guardian.core.state_machine import GuardianStateMachine


def test_guardian_state_valid_transitions():
    state = GuardianState(
        request_id="req-sm-1",
        floor_id="floor01",
        objective="Test State Machine",
        input_contract_hash="hash-12345678",
    )
    sm = GuardianStateMachine(state)

    assert sm.state.lifecycle_state == GuardianLifecycleState.CREATED

    sm.transition_to(GuardianLifecycleState.VALIDATING)
    assert sm.state.lifecycle_state == GuardianLifecycleState.VALIDATING

    sm.transition_to(GuardianLifecycleState.READY)
    assert sm.state.lifecycle_state == GuardianLifecycleState.READY

    sm.transition_to(GuardianLifecycleState.PLANNING)
    assert sm.state.lifecycle_state == GuardianLifecycleState.PLANNING

    sm.transition_to(GuardianLifecycleState.DECISION_PENDING)
    assert sm.state.lifecycle_state == GuardianLifecycleState.DECISION_PENDING

    sm.transition_to(GuardianLifecycleState.ACTION_AUTHORIZED)
    assert sm.state.lifecycle_state == GuardianLifecycleState.ACTION_AUTHORIZED

    sm.transition_to(GuardianLifecycleState.EXECUTING)
    assert sm.state.lifecycle_state == GuardianLifecycleState.EXECUTING

    sm.transition_to(GuardianLifecycleState.OBSERVING)
    assert sm.state.lifecycle_state == GuardianLifecycleState.OBSERVING

    sm.transition_to(GuardianLifecycleState.VERIFYING)
    assert sm.state.lifecycle_state == GuardianLifecycleState.VERIFYING

    sm.transition_to(GuardianLifecycleState.COMPLETED)
    assert sm.state.lifecycle_state == GuardianLifecycleState.COMPLETED


def test_guardian_state_illegal_transition_rejection():
    state = GuardianState(
        request_id="req-sm-2",
        floor_id="floor01",
        objective="Test Illegal Transition",
        input_contract_hash="hash-12345678",
    )
    sm = GuardianStateMachine(state)

    # CREATED -> EXECUTING is illegal
    with pytest.raises(GuardianStateError) as exc_info:
        sm.transition_to(GuardianLifecycleState.EXECUTING)

    assert "Illegal Guardian state transition" in str(exc_info.value)


def test_guardian_state_extra_forbid():
    with pytest.raises(ValidationError):
        GuardianState(
            request_id="req-sm-3",
            floor_id="floor01",
            objective="Test Strict Validation",
            input_contract_hash="hash-12345678",
            unauthorized_field="invalid",
        )
