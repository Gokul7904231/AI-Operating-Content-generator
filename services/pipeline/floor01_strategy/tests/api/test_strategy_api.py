"""API Integration tests for Floor 01 endpoints including Overseer execution report."""

import pytest
from httpx import ASGITransport, AsyncClient

from floors.floor01_strategy.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["floor_id"] == "floor01"
        assert "topics_in_memory" in data


@pytest.mark.asyncio
async def test_plan_strategy_endpoint_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "topic_query": "Python Memory Management & Garbage Collection",
            "target_audience": "intermediate_developers",
            "platform": "youtube_shorts",
            "content_format": "educational_short",
            "learning_level": "intermediate",
        }
        response = await ac.post("/v1/plan", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["handoff_status"] == "VALIDATED"
        assert data["topic"]["selected_topic"] == "Python Memory Management & Garbage Collection"
        assert data["topic"]["category"] == "computer_science"
        assert data["strategy"]["platform"] == "youtube_shorts"
        assert "curriculum" in data
        assert "content_plan" in data


@pytest.mark.asyncio
async def test_generate_execution_report_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "topic_query": "Python Decorators Concept Graph",
            "target_audience": "intermediate_developers",
            "platform": "youtube_shorts",
        }
        response = await ac.post("/v1/plan/execution-report", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["floor_id"] == "floor01"
        assert "execution_id" in data
        assert "duration_ms" in data
        assert "worker_results" in data
        assert len(data["worker_results"]) == 4
        assert "component_gates" in data
        assert data["status"] == "VALIDATED"


@pytest.mark.asyncio
async def test_evaluate_topic_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "topic_query": "Black Holes & Space Gravity",
        }
        response = await ac.post("/v1/evaluate-topic", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "science"
        assert data["uniqueness_verdict"] == "MEMORY_UNSEEN"


@pytest.mark.asyncio
async def test_memory_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/v1/memory")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "topics" in data
        assert isinstance(data["topics"], list)
