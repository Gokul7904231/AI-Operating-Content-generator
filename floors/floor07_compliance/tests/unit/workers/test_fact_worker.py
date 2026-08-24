"""Fact Worker Unit Tests."""

from __future__ import annotations

import pytest

from app.workers.fact_worker import FactWorker
from app.workers.base import WorkerInput


@pytest.mark.asyncio
async def test_fact_worker_perfect_score():
    worker = FactWorker()
    inp = WorkerInput(
        artifact_id="1",
        pipeline_run_id="run_1",
        title="Valid Title",
        script="This is a very clean script with absolutely no controversial facts, numeric claims, or assertions of absolute certitude. We are describing variables clearly and concisely.",
        metadata={},
        platform="youtube",
        language="en",
        content_type="educational_short",
    )
    result = await worker.run(inp)
    assert result.passed is True
    assert result.score > 0.85


@pytest.mark.asyncio
async def test_fact_worker_low_confidence():
    worker = FactWorker()
    # Includes absolute language ('always', 'never') and hallucination patterns ('research shows')
    inp = WorkerInput(
        artifact_id="2",
        pipeline_run_id="run_2",
        title="Controversial Claims",
        script="Research shows that Python is always 100% better than JavaScript and there is absolutely never any reason to use anything else.",
        metadata={},
        platform="youtube",
        language="en",
        content_type="educational_short",
    )
    result = await worker.run(inp)
    assert result.passed is False
    assert result.score < 0.85
    assert len(result.issues) > 0
