"""API endpoint integration tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_api(api_client: AsyncClient):
    response = await api_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


@pytest.mark.asyncio
async def test_validate_api_success(api_client: AsyncClient):
    payload = {
        "title": "Introduction to Python Variables",
        "script": "Today we will learn how variables work in Python. A variable assigns memory to store data using an equals sign.",
        "metadata": {"tags": ["python"]},
        "platform": "youtube",
        "language": "en",
        "content_type": "educational_short",
    }
    response = await api_client.post("/v1/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["decision"] == "PASS"
    assert "certificate" in data
    assert data["certificate"] is not None
