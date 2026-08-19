"""Integration tests for Floor 01 Strategy Brain Guardian Adapter."""

from uuid import uuid4
import pytest

from factoryos.guardian.contracts.guardian_state import GuardianLifecycleState
from factoryos.guardian.floors.floor01_guardian import Floor01Guardian
from floors.floor01_strategy.app.domain.handoff import Floor01Input


def test_floor01_guardian_execution():
    guardian = Floor01Guardian()
    req_id = f"req-f01-guard-{uuid4()}"
    inp = Floor01Input(request_id=req_id, topic_query="Python Decorators")

    report = guardian.execute(inp)

    assert report.floor_id == "floor01"
    assert report.request_id == req_id
    assert report.status == GuardianLifecycleState.COMPLETED
    assert report.handoff_payload is not None
    assert report.handoff_payload["topic"]["selected_topic"] == "Python Decorators"
