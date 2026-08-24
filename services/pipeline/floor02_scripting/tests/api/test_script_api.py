"""API integration tests for Floor 02 endpoints."""

from fastapi.testclient import TestClient
import pytest

from floors.floor02_scripting.main import app
from floors.floor02_scripting.app.core.config import settings

client = TestClient(app)
HEADERS = {"X-API-Key": settings.DEFAULT_API_KEY}


def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["floor_id"] == "floor02"


def test_plan_script_endpoint_success():
    payload = {
        "request_id": "req-api-plan-1",
        "topic_query": "Python Decorators",
        "target_duration_seconds": 60,
    }
    response = client.post("/v1/script/plan", json=payload, headers=HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["request_id"] == "req-api-plan-1"
    assert data["floor_id"] == "floor02"
    assert len(data["scenes"]) >= 3


def test_execution_report_endpoint():
    payload = {
        "request_id": "req-api-report-1",
        "topic_query": "Python Asyncio",
        "target_duration_seconds": 60,
    }
    response = client.post("/v1/script/execution-report", json=payload, headers=HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "handoff_payload" in data
    assert "execution_report" in data
    assert data["execution_report"]["floor_id"] == "floor02"


def test_regenerate_scene_endpoint_success():
    """Verify POST /v1/script/regenerate-scene endpoint successfully updates single scene."""
    # First plan a script
    plan_req = {"request_id": "req-api-regen-1", "topic_query": "Python Generators"}
    plan_resp = client.post("/v1/script/plan", json=plan_req, headers=HEADERS)
    initial_payload = plan_resp.json()

    target_scene_id = initial_payload["scenes"][0]["scene_id"]

    regen_req = {
        "current_payload": initial_payload,
        "target_scene_id": target_scene_id,
        "regeneration_instruction": "Tighten hook text",
    }
    regen_resp = client.post("/v1/script/regenerate-scene", json=regen_req, headers=HEADERS)
    assert regen_resp.status_code == 200

    updated_payload = regen_resp.json()
    assert updated_payload["script_version"] == initial_payload["script_version"] + 1
    assert updated_payload["scenes"][0]["scene_version"] == 2
    assert "Tighten hook text" in updated_payload["scenes"][0]["narration_text"]


def test_regenerate_scene_endpoint_invalid_scene():
    """Verify POST /v1/script/regenerate-scene rejects invalid scene_id with 400 error."""
    plan_req = {"request_id": "req-api-regen-invalid-1", "topic_query": "Python Classes"}
    plan_resp = client.post("/v1/script/plan", json=plan_req, headers=HEADERS)
    initial_payload = plan_resp.json()

    regen_req = {
        "current_payload": initial_payload,
        "target_scene_id": "non-existent-scene-id-999",
        "regeneration_instruction": "Should fail",
    }
    regen_resp = client.post("/v1/script/regenerate-scene", json=regen_req, headers=HEADERS)
    assert regen_resp.status_code == 400
