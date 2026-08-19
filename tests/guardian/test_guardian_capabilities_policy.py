"""Unit tests for Capability Registry and Policy Engine."""

import pytest

from factoryos.guardian.capabilities.models import Capability
from factoryos.guardian.capabilities.registry import CapabilityRegistry
from factoryos.guardian.contracts.decision import DecisionActionType, GuardianDecisionProposal, ReasonCategory
from factoryos.guardian.contracts.guardian_state import GuardianState
from factoryos.guardian.core.exceptions import GuardianCapabilityError
from factoryos.guardian.policy.engine import PolicyEngine


def test_capability_registry_registration_and_lookup():
    registry = CapabilityRegistry(floor_id="floor01")
    cap = Capability(
        name="test_worker",
        floor_id="floor01",
        description="Test capability description",
    )
    registry.register(cap)

    assert registry.is_registered("test_worker") is True
    assert registry.get("test_worker").name == "test_worker"


def test_capability_registry_unregistered_rejection():
    registry = CapabilityRegistry(floor_id="floor01")
    with pytest.raises(GuardianCapabilityError) as exc_info:
        registry.get("unknown_worker")

    assert "Unregistered capability requested" in str(exc_info.value)


def test_policy_engine_cross_floor_mutation_rejection():
    registry = CapabilityRegistry()
    registry.register(Capability(name="f02_worker", floor_id="floor02", description="Floor 02 worker"))

    state = GuardianState(
        request_id="req-pol-1",
        floor_id="floor01",  # Active floor is floor01
        objective="Cross floor mutation test",
        input_contract_hash="hash-12345678",
    )
    policy_engine = PolicyEngine(registry)

    # Proposal attempting to run Floor 02 worker from Floor 01 Guardian
    proposal = GuardianDecisionProposal(
        action_type=DecisionActionType.RUN_WORKER,
        target_capability="f02_worker",
        target_worker="f02_worker",
        reason_category=ReasonCategory.WORKER_DEPENDENCY,
        reasoning_summary="Attempt cross floor mutation",
        expected_outcome="Fail execution",
    )

    results = policy_engine.evaluate_proposal(state, proposal)
    disallowed = [r for r in results if not r.allowed]

    assert len(disallowed) > 0
    assert disallowed[0].policy_id == "POLICY_NO_CROSS_FLOOR_MUTATION"
