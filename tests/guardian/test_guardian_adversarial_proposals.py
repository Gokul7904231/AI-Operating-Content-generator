"""Adversarial LLM proposal and prompt injection unit tests."""

import pytest

from factoryos.guardian.capabilities.models import Capability
from factoryos.guardian.capabilities.registry import CapabilityRegistry
from factoryos.guardian.contracts.decision import DecisionActionType, GuardianDecisionProposal, ReasonCategory
from factoryos.guardian.contracts.guardian_state import GuardianState
from factoryos.guardian.policy.engine import PolicyEngine


def test_adversarial_proposal_secret_exposure_rejection():
    registry = CapabilityRegistry()
    registry.register(Capability(name="test_worker", floor_id="floor01", description="Test worker"))

    state = GuardianState(
        request_id="req-adv-1",
        floor_id="floor01",
        objective="Test Secret Exposure",
        input_contract_hash="hash-12345678",
    )
    policy_engine = PolicyEngine(registry)

    # Proposal leaking an API key inside reasoning_summary
    proposal = GuardianDecisionProposal(
        action_type=DecisionActionType.RUN_WORKER,
        target_capability="test_worker",
        target_worker="test_worker",
        reason_category=ReasonCategory.WORKER_DEPENDENCY,
        reasoning_summary="Executing worker with api_key=sk-proj-secret123456",
        expected_outcome="Expect execution",
    )

    results = policy_engine.evaluate_proposal(state, proposal)
    disallowed = [r for r in results if not r.allowed]

    assert len(disallowed) > 0
    assert disallowed[0].policy_id == "POLICY_NO_SECRET_EXPOSURE"


def test_adversarial_proposal_budget_exceeded_rejection():
    registry = CapabilityRegistry()
    state = GuardianState(
        request_id="req-adv-2",
        floor_id="floor01",
        objective="Test Budget Limit",
        input_contract_hash="hash-12345678",
        llm_call_count=21,  # Exceeded budget of 20
    )
    policy_engine = PolicyEngine(registry)

    proposal = GuardianDecisionProposal(
        action_type=DecisionActionType.COMPLETE,
        reason_category=ReasonCategory.OBJECTIVE_SATISFIED,
        reasoning_summary="Complete execution",
        expected_outcome="Complete loop",
    )

    results = policy_engine.evaluate_proposal(state, proposal)
    disallowed = [r for r in results if not r.allowed]

    assert len(disallowed) > 0
    assert disallowed[0].policy_id == "POLICY_BUDGET_NOT_EXCEEDED"
