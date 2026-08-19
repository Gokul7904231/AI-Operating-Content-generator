"""Integration tests for Floor 04 Guardian API and execution loop."""

import pytest

from factoryos.guardian.contracts.guardian_state import GuardianLifecycleState
from factoryos.guardian.floors.floor04_guardian import Floor04Guardian
from floors.floor04_media_synthesis.app.domain.handoff import Floor04Input
from floors.floor04_media_synthesis.app.services.pipeline import Floor04PipelineService
from floors.floor04_media_synthesis.tests.test_floor04_handoff import build_mock_floor03_payload


def test_floor04_guardian_execution(tmp_path):
    f03_payload = build_mock_floor03_payload()
    inp = Floor04Input(floor03_payload=f03_payload, request_id="req-f04-g-test")

    pipeline_service = Floor04PipelineService(storage_root=str(tmp_path))
    guardian = Floor04Guardian(pipeline_service=pipeline_service)

    report = guardian.execute(inp)

    assert report.status == GuardianLifecycleState.COMPLETED
    assert report.floor_id == "floor04"
    assert report.action_count >= 1
    assert "handoff_payload" in report.model_dump()
    assert len(report.decisions) >= 1
