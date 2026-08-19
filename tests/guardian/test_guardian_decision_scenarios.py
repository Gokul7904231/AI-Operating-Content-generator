"""Autonomous Decision Selection Scenario Tests for Floor Guardians."""

from uuid import uuid4
import pytest

from factoryos.guardian.contracts.guardian_state import GuardianLifecycleState
from factoryos.guardian.floors.floor01_guardian import Floor01Guardian
from factoryos.guardian.floors.floor02_guardian import Floor02Guardian
from factoryos.guardian.floors.floor03_guardian import Floor03Guardian
from floors.floor01_strategy.app.domain.handoff import Floor01Input, Floor01HandoffPayload, StrategyResult, TopicIntelligenceResult, ContentPlanResult, CurriculumMapResult
from floors.floor02_scripting.app.domain.handoff import Floor02Input
from floors.floor03_asset_realization.app.domain.handoff import Floor03Input
from floors.floor03_asset_realization.tests.test_floor03_handoff import build_mock_floor02_payload


def test_scenario_a_floor02_pacing_recovery_decision():
    """Scenario A: Verify Floor 02 Guardian observes pacing state and executes complete script generation workflow."""
    f01_payload = Floor01HandoffPayload(
        request_id=f"req-f01-scen-a-{uuid4()}",
        topic=TopicIntelligenceResult(selected_topic="Python Decorators", normalized_topic="python_decorators", selection_reason="High demand"),
        strategy=StrategyResult(target_audience="intermediate_developers", platform="youtube_shorts", content_angle="practical", target_duration_seconds=60),
        content_plan=ContentPlanResult(core_objective="Explain decorators", key_takeaways=["Functions are objects"], hook_direction="Did you know?", cta_direction="Follow for more", structural_outline=["Hook", "Body", "CTA"]),
        curriculum=CurriculumMapResult(learning_objectives=["Understand decorators"]),
        decision_quality_score=0.9,
    )
    inp = Floor02Input(floor01_payload=f01_payload, request_id=f"req-scen-a-{uuid4()}")

    guardian = Floor02Guardian()
    report = guardian.execute(inp)

    assert report.status == GuardianLifecycleState.COMPLETED
    assert len(report.decisions) >= 1
    assert report.decisions[0]["selected_action"] == "scripting_pipeline_worker"


def test_scenario_b_floor03_asset_continuity_decision():
    """Scenario B: Verify Floor 03 Guardian observes scene requirements and executes asset planning workflow."""
    f02_payload = build_mock_floor02_payload()
    inp = Floor03Input(floor02_payload=f02_payload, request_id=f"req-scen-b-{uuid4()}")

    guardian = Floor03Guardian()
    report = guardian.execute(inp)

    assert report.status == GuardianLifecycleState.COMPLETED
    assert len(report.decisions) >= 1
    assert report.decisions[0]["selected_action"] == "asset_pipeline_worker"


def test_scenario_c_floor01_topic_duplication_decision():
    """Scenario C: Verify Floor 01 Guardian handles topic query and completes strategy workflow."""
    inp = Floor01Input(request_id=f"req-scen-c-{uuid4()}", topic_query="Python Decorators")

    guardian = Floor01Guardian()
    report = guardian.execute(inp)

    assert report.status == GuardianLifecycleState.COMPLETED
    assert report.handoff_payload["topic"]["selected_topic"] == "Python Decorators"
