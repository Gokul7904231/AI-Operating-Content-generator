"""Unit tests: PolicyWorker.

Tests rule evaluation strategies, severity handling, and cache fallback.
Uses fakeredis to avoid real Redis dependency.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

from app.workers.base import WorkerInput
from app.workers.policy_worker import PolicyWorker


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_input(**overrides: Any) -> WorkerInput:
    defaults: dict[str, Any] = {
        "artifact_id": "test-artifact",
        "pipeline_run_id": "test-run",
        "title": "Introduction to Python Variables",
        "script": (
            "Today we learn about Python variables. "
            "A variable stores data using an equals sign. "
            "Variables can hold numbers, strings, and booleans."
        ),
        "metadata": {},
        "platform": "youtube",
        "language": "en",
        "content_type": "educational_short",
    }
    defaults.update(overrides)
    return WorkerInput(**defaults)


def _make_policy(rules: list[dict[str, Any]], version: str = "1.0.0") -> dict[str, Any]:
    return {
        "platform": "youtube",
        "version": version,
        "rules": rules,
        "recommendations": ["Keep content clean and factual."],
    }


# ── Tests ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_policy_worker_pass_clean_content(fake_redis: Any) -> None:
    """Clean content with no violations should pass."""
    policy = _make_policy([
        {
            "id": "RULE-YT-001",
            "strategy": "MIN_LENGTH",
            "field": "title",
            "min_length": 5,
            "severity": "MEDIUM",
        }
    ])

    with patch("app.workers.policy_worker.get_redis_client", return_value=fake_redis), \
         patch("app.workers.policy_worker._load_policy_file", return_value=policy):
        worker = PolicyWorker()
        result = await worker.run(_make_input())

    assert result.passed is True
    assert result.score == 1.0
    assert len(result.issues) == 0


@pytest.mark.asyncio
async def test_policy_worker_fail_critical_violation(fake_redis: Any) -> None:
    """A CRITICAL rule violation must block publishing regardless of other scores."""
    policy = _make_policy([
        {
            "id": "RULE-YT-CRIT",
            "strategy": "PROHIBITED_WORDS",
            "field": "script",
            "words": ["variables"],  # will match our default script
            "severity": "CRITICAL",
        }
    ])

    with patch("app.workers.policy_worker.get_redis_client", return_value=fake_redis), \
         patch("app.workers.policy_worker._load_policy_file", return_value=policy):
        worker = PolicyWorker()
        result = await worker.run(_make_input())

    assert result.passed is False
    assert len(result.issues) > 0
    critical = result.details.get("critical_violations", [])
    assert len(critical) > 0


@pytest.mark.asyncio
async def test_policy_worker_prohibited_words_medium_severity(fake_redis: Any) -> None:
    """A MEDIUM prohibited word violation reduces score but may not block."""
    policy = _make_policy([
        {
            "id": "RULE-YT-002",
            "strategy": "PROHIBITED_WORDS",
            "field": "script",
            "words": ["booleans"],
            "severity": "MEDIUM",
        },
        {
            "id": "RULE-YT-003",
            "strategy": "MIN_LENGTH",
            "field": "title",
            "min_length": 5,
            "severity": "LOW",
        },
    ])

    with patch("app.workers.policy_worker.get_redis_client", return_value=fake_redis), \
         patch("app.workers.policy_worker._load_policy_file", return_value=policy):
        worker = PolicyWorker()
        result = await worker.run(_make_input())

    # 1 of 2 rules violated — 50% score
    assert result.score == pytest.approx(0.5)
    assert len(result.issues) == 1


@pytest.mark.asyncio
async def test_policy_worker_regex_strategy(fake_redis: Any) -> None:
    """REGEX strategy must catch the pattern in the specified field."""
    policy = _make_policy([
        {
            "id": "RULE-YT-REGEX",
            "strategy": "REGEX",
            "field": "script",
            "pattern": r"\d{4}",  # matches 4-digit numbers
            "severity": "HIGH",
        }
    ])
    inp = _make_input(script="In 2024, we launched a new product line.")

    with patch("app.workers.policy_worker.get_redis_client", return_value=fake_redis), \
         patch("app.workers.policy_worker._load_policy_file", return_value=policy):
        worker = PolicyWorker()
        result = await worker.run(inp)

    assert result.passed is False
    assert len(result.issues) == 1


@pytest.mark.asyncio
async def test_policy_worker_max_length_strategy(fake_redis: Any) -> None:
    """MAX_LENGTH strategy must flag titles exceeding the limit."""
    policy = _make_policy([
        {
            "id": "RULE-YT-LEN",
            "strategy": "MAX_LENGTH",
            "field": "title",
            "max_length": 10,
            "severity": "MEDIUM",
        }
    ])
    # Title is 40 chars — should violate
    inp = _make_input(title="Introduction to Python Variables Tutorial")

    with patch("app.workers.policy_worker.get_redis_client", return_value=fake_redis), \
         patch("app.workers.policy_worker._load_policy_file", return_value=policy):
        worker = PolicyWorker()
        result = await worker.run(inp)

    assert result.passed is False
    assert len(result.issues) == 1


@pytest.mark.asyncio
async def test_policy_worker_required_field_present(fake_redis: Any) -> None:
    """REQUIRED_FIELD passes when the metadata key exists."""
    policy = _make_policy([
        {
            "id": "RULE-YT-META",
            "strategy": "REQUIRED_FIELD",
            "field": "metadata.tags",
            "key": "tags",
            "severity": "HIGH",
        }
    ])
    inp = _make_input(metadata={"tags": ["python", "tutorial"]})

    with patch("app.workers.policy_worker.get_redis_client", return_value=fake_redis), \
         patch("app.workers.policy_worker._load_policy_file", return_value=policy):
        worker = PolicyWorker()
        result = await worker.run(inp)

    assert result.passed is True


@pytest.mark.asyncio
async def test_policy_worker_required_field_missing(fake_redis: Any) -> None:
    """REQUIRED_FIELD fails when the metadata key is absent."""
    policy = _make_policy([
        {
            "id": "RULE-YT-META",
            "strategy": "REQUIRED_FIELD",
            "field": "metadata.tags",
            "key": "tags",
            "severity": "HIGH",
        }
    ])
    inp = _make_input(metadata={})

    with patch("app.workers.policy_worker.get_redis_client", return_value=fake_redis), \
         patch("app.workers.policy_worker._load_policy_file", return_value=policy):
        worker = PolicyWorker()
        result = await worker.run(inp)

    assert result.passed is False


@pytest.mark.asyncio
async def test_policy_worker_empty_rules_always_passes(fake_redis: Any) -> None:
    """A policy with no rules should give score=1.0 and pass."""
    policy = _make_policy([])

    with patch("app.workers.policy_worker.get_redis_client", return_value=fake_redis), \
         patch("app.workers.policy_worker._load_policy_file", return_value=policy):
        worker = PolicyWorker()
        result = await worker.run(_make_input())

    assert result.passed is True
    assert result.score == 1.0
