"""Domain tests: ValidationRun entity.

Tests the mutable ValidationRun entity for:
- initial state
- mark_completed / mark_failed state transitions
- duration_seconds computation
- default worker result fields
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from time import sleep

import pytest

from app.domain.entities.validation_run import ValidationRun


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_run(**overrides: object) -> ValidationRun:
    defaults: dict[str, object] = {
        "run_id": uuid.uuid4(),
        "artifact_id": "artifact-001",
        "platform": "youtube",
        "language": "en",
        "content_type": "educational_short",
        "pipeline_version": "1.0",
    }
    defaults.update(overrides)
    return ValidationRun(**defaults)  # type: ignore[arg-type]


# ── Tests ────────────────────────────────────────────────────────────────────

def test_validation_run_initial_status() -> None:
    run = _make_run()
    assert run.status == "RUNNING"


def test_validation_run_initial_completed_at_none() -> None:
    run = _make_run()
    assert run.completed_at is None


def test_validation_run_initial_certificate_id_none() -> None:
    run = _make_run()
    assert run.certificate_id is None


def test_validation_run_mark_completed_sets_status() -> None:
    run = _make_run()
    cert_id = uuid.uuid4()
    run.mark_completed(cert_id)
    assert run.status == "COMPLETED"


def test_validation_run_mark_completed_sets_certificate_id() -> None:
    run = _make_run()
    cert_id = uuid.uuid4()
    run.mark_completed(cert_id)
    assert run.certificate_id == cert_id


def test_validation_run_mark_completed_sets_completed_at() -> None:
    run = _make_run()
    run.mark_completed(uuid.uuid4())
    assert run.completed_at is not None
    assert run.completed_at.tzinfo is not None  # UTC-aware


def test_validation_run_mark_failed_sets_status() -> None:
    run = _make_run()
    run.mark_failed()
    assert run.status == "FAILED"


def test_validation_run_mark_failed_sets_completed_at() -> None:
    run = _make_run()
    run.mark_failed()
    assert run.completed_at is not None


def test_validation_run_mark_failed_leaves_certificate_id_none() -> None:
    run = _make_run()
    run.mark_failed()
    assert run.certificate_id is None


def test_validation_run_duration_seconds_none_when_running() -> None:
    run = _make_run()
    assert run.duration_seconds() is None


def test_validation_run_duration_seconds_positive_after_completion() -> None:
    run = _make_run()
    run.mark_completed(uuid.uuid4())
    duration = run.duration_seconds()
    assert duration is not None
    assert duration >= 0.0


def test_validation_run_duration_seconds_positive_after_failure() -> None:
    run = _make_run()
    run.mark_failed()
    duration = run.duration_seconds()
    assert duration is not None
    assert duration >= 0.0


def test_validation_run_worker_results_default_empty_dict() -> None:
    run = _make_run()
    assert run.fact_result == {}
    assert run.policy_result == {}
    assert run.risk_result == {}


def test_validation_run_worker_results_can_be_set() -> None:
    run = _make_run()
    run.fact_result = {"passed": True, "score": 0.95}
    assert run.fact_result["score"] == 0.95


def test_validation_run_started_at_is_utc() -> None:
    run = _make_run()
    assert run.started_at.tzinfo is not None


def test_validation_run_fields_stored_correctly() -> None:
    run_id = uuid.uuid4()
    run = _make_run(run_id=run_id, platform="tiktok", language="es")
    assert run.run_id == run_id
    assert run.platform == "tiktok"
    assert run.language == "es"
