"""Integration tests for Floor 02 Scripting Brain Guardian Adapter."""

from uuid import uuid4
import pytest

from factoryos.guardian.contracts.guardian_state import GuardianLifecycleState
from factoryos.guardian.floors.floor02_guardian import Floor02Guardian
from floors.floor01_strategy.app.domain.handoff import (
    ContentPlanResult,
    CurriculumMapResult,
    Floor01HandoffPayload,
    StrategyResult,
    TopicIntelligenceResult,
)
from floors.floor02_scripting.app.domain.handoff import Floor02Input


def build_mock_floor01_payload() -> Floor01HandoffPayload:
    return Floor01HandoffPayload(
        request_id=f"req-f01-f02-{uuid4()}",
        topic=TopicIntelligenceResult(
            selected_topic="Python Decorators",
            normalized_topic="python_decorators",
            selection_reason="High demand",
        ),
        strategy=StrategyResult(
            target_audience="intermediate_developers",
            platform="youtube_shorts",
            content_angle="practical",
            target_duration_seconds=60,
        ),
        content_plan=ContentPlanResult(
            core_objective="Explain decorators",
            key_takeaways=["Functions are objects"],
            hook_direction="Did you know?",
            cta_direction="Follow for more",
            structural_outline=["Hook", "Body", "CTA"],
        ),
        curriculum=CurriculumMapResult(learning_objectives=["Understand decorators"]),
        decision_quality_score=0.9,
    )


def test_floor02_guardian_execution():
    f01_payload = build_mock_floor01_payload()
    req_id = f"req-f02-guard-{uuid4()}"
    inp = Floor02Input(floor01_payload=f01_payload, request_id=req_id)

    guardian = Floor02Guardian()
    report = guardian.execute(inp)

    assert report.floor_id == "floor02"
    assert report.request_id == req_id
    assert report.status == GuardianLifecycleState.COMPLETED
    assert report.handoff_payload is not None
    assert len(report.handoff_payload["scenes"]) >= 3
