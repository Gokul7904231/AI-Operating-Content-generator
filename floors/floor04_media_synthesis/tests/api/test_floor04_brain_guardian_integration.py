"""Integration tests for Floor 04 Media Brain, Guardian Engine, capability registry, and transaction authorization."""

import pytest

from factoryos.guardian.capabilities.models import Capability
from factoryos.guardian.contracts.decision import DecisionActionType, GuardianDecisionProposal, ReasonCategory
from factoryos.guardian.contracts.guardian_state import GuardianLifecycleState, GuardianState
from factoryos.guardian.core.exceptions import GuardianCapabilityError
from factoryos.guardian.floors.floor04_guardian import Floor04Guardian
from floors.floor04_media_synthesis.app.brain.media_brain import MediaBrain
from floors.floor04_media_synthesis.app.domain.handoff import Floor04Input
from floors.floor04_media_synthesis.app.services.pipeline import Floor04PipelineService
from floors.floor04_media_synthesis.tests.test_floor04_handoff import build_mock_floor03_payload


def test_brain_proposal_generation():
    f03 = build_mock_floor03_payload()
    inp = Floor04Input(floor03_payload=f03, request_id="req-brain-test")

    brain = MediaBrain()
    proposal = brain.propose_synthesis_plan(inp)

    assert proposal.selected_capability == "media_synthesis_pipeline_worker"
    assert proposal.parameters["visual_count"] == len(f03.visual_asset_requirements)
    assert proposal.parameters["audio_count"] == len(f03.audio_asset_requirements)


def test_guardian_authorizes_registered_capability(tmp_path):
    f03 = build_mock_floor03_payload()
    inp = Floor04Input(floor03_payload=f03, request_id="req-g-auth-test")

    pipeline_service = Floor04PipelineService(storage_root=str(tmp_path))
    guardian = Floor04Guardian(pipeline_service=pipeline_service)

    report = guardian.execute(inp)

    assert report.status == GuardianLifecycleState.COMPLETED
    assert report.floor_id == "floor04"
    assert len(report.decisions) >= 1

    first_dec = report.decisions[0]
    action = first_dec.get("selected_action") if isinstance(first_dec, dict) else first_dec.selected_action
    assert action == "media_synthesis_pipeline_worker"


def test_guardian_denies_unregistered_capability(tmp_path):
    pipeline_service = Floor04PipelineService(storage_root=str(tmp_path))
    guardian = Floor04Guardian(pipeline_service=pipeline_service)

    state = GuardianState(
        floor_id="floor04", request_id="req-unreg-test", objective="Test objective", input_contract_hash="hash-123"
    )
    proposal = GuardianDecisionProposal(
        action_type=DecisionActionType.RUN_WORKER,
        target_capability="unauthorized_hacker_capability",
        reasoning_summary="Attempt unregistered execution",
        reason_category=ReasonCategory.POLICY_COMPLIANCE,
        expected_outcome="Execute worker",
    )

    policy_results = guardian.engine.policy_engine.evaluate_proposal(state, proposal)
    fatal_denials = [r for r in policy_results if not r.allowed]

    assert len(fatal_denials) >= 1
    assert "not registered in the allowlist registry" in fatal_denials[0].reason


def test_guardian_denies_wrong_floor_capability(tmp_path):
    pipeline_service = Floor04PipelineService(storage_root=str(tmp_path))
    guardian = Floor04Guardian(pipeline_service=pipeline_service)

    # Attempt to register a Floor 01 capability into Floor 04 registry -> rejected immediately by Registry Policy
    with pytest.raises(GuardianCapabilityError) as exc:
        guardian.registry.register(
            Capability(name="strategy_pipeline_worker", floor_id="floor01", description="Floor 01 Capability")
        )

    assert "does not match registry floor_id" in str(exc.value)
