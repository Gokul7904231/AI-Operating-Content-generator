"""Unit tests: CertificateWorker.

Tests certificate generation, decision mapping, and signing.
Uses an in-memory mock repository.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

from app.workers.base import WorkerInput
from app.workers.certificate_worker import CertificateWorker
from app.domain.entities.certificate import Certificate
from app.domain.repositories import AbstractCertificateRepository


# ── Mock repository ───────────────────────────────────────────────────────────

class InMemoryCertificateRepository(AbstractCertificateRepository):
    def __init__(self) -> None:
        self._store: dict[uuid.UUID, Certificate] = {}

    async def save(self, certificate: Certificate) -> None:
        self._store[certificate.certificate_id] = certificate

    async def get_by_id(self, certificate_id: uuid.UUID) -> Certificate | None:
        return self._store.get(certificate_id)

    async def get_by_artifact_id(self, artifact_id: str) -> Certificate | None:
        for cert in self._store.values():
            if cert.artifact_id == artifact_id:
                return cert
        return None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_input(**overrides: Any) -> WorkerInput:
    defaults: dict[str, Any] = {
        "artifact_id": "artifact-test-001",
        "pipeline_run_id": "run-001",
        "title": "Python Variables",
        "script": "Today we learn about Python variables and how they work.",
        "metadata": {},
        "platform": "youtube",
        "language": "en",
        "content_type": "educational_short",
    }
    defaults.update(overrides)
    return WorkerInput(**defaults)


# ── Tests ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_certificate_worker_generates_valid_certificate() -> None:
    """Worker must produce a certificate and persist it in the repository."""
    repo = InMemoryCertificateRepository()
    worker = CertificateWorker(repo)

    with patch("app.workers.certificate_worker.get_redis_client") as mock_redis:
        mock_redis.return_value.set_json = AsyncMock()
        result = await worker.run(
            _make_input(),
            pipeline_run_id=uuid.uuid4(),
            fact_score=0.95,
            policy_violations_count=0,
            risk_score=0.05,
            risk_rating="LOW",
            policy_passed=True,
            fact_passed=True,
        )

    assert result.passed is True
    assert "certificate_id" in result.details
    cert_id = uuid.UUID(result.details["certificate_id"])
    assert cert_id in repo._store


@pytest.mark.asyncio
async def test_certificate_worker_pass_decision_on_clean_content() -> None:
    """Clean content (low risk, all passed) must yield PASS decision."""
    repo = InMemoryCertificateRepository()
    worker = CertificateWorker(repo)

    with patch("app.workers.certificate_worker.get_redis_client") as mock_redis:
        mock_redis.return_value.set_json = AsyncMock()
        result = await worker.run(
            _make_input(),
            pipeline_run_id=uuid.uuid4(),
            fact_score=0.95,
            policy_violations_count=0,
            risk_score=0.05,
            risk_rating="LOW",
            policy_passed=True,
            fact_passed=True,
        )

    assert result.details["publishing_decision"] == "PASS"
    assert result.details["certification_status"] == "CERTIFIED"


@pytest.mark.asyncio
async def test_certificate_worker_repair_on_policy_fail() -> None:
    """Policy failure must yield REPAIR decision (not PASS)."""
    repo = InMemoryCertificateRepository()
    worker = CertificateWorker(repo)

    with patch("app.workers.certificate_worker.get_redis_client") as mock_redis:
        mock_redis.return_value.set_json = AsyncMock()
        result = await worker.run(
            _make_input(),
            pipeline_run_id=uuid.uuid4(),
            fact_score=0.90,
            policy_violations_count=3,
            risk_score=0.30,
            risk_rating="MEDIUM",
            policy_passed=False,  # policy failed
            fact_passed=True,
        )

    assert result.details["publishing_decision"] == "REPAIR"
    assert result.passed is False


@pytest.mark.asyncio
async def test_certificate_worker_human_review_on_critical_risk() -> None:
    """CRITICAL risk rating must yield HUMAN_REVIEW decision."""
    repo = InMemoryCertificateRepository()
    worker = CertificateWorker(repo)

    with patch("app.workers.certificate_worker.get_redis_client") as mock_redis:
        mock_redis.return_value.set_json = AsyncMock()
        result = await worker.run(
            _make_input(),
            pipeline_run_id=uuid.uuid4(),
            fact_score=0.30,
            policy_violations_count=10,
            risk_score=0.90,
            risk_rating="CRITICAL",
            policy_passed=False,
            fact_passed=False,
        )

    assert result.details["publishing_decision"] == "HUMAN_REVIEW"


@pytest.mark.asyncio
async def test_certificate_worker_includes_signature() -> None:
    """Every certificate must have a non-empty HMAC signature."""
    repo = InMemoryCertificateRepository()
    worker = CertificateWorker(repo)

    with patch("app.workers.certificate_worker.get_redis_client") as mock_redis:
        mock_redis.return_value.set_json = AsyncMock()
        result = await worker.run(
            _make_input(),
            pipeline_run_id=uuid.uuid4(),
            fact_score=0.92,
            policy_violations_count=0,
            risk_score=0.08,
            risk_rating="LOW",
            policy_passed=True,
            fact_passed=True,
        )

    assert "signature" in result.details
    assert len(result.details["signature"]) == 64  # SHA-256 hex = 64 chars


@pytest.mark.asyncio
async def test_certificate_worker_includes_expiry() -> None:
    """Certificate must carry a future expiry timestamp."""
    repo = InMemoryCertificateRepository()
    worker = CertificateWorker(repo)

    with patch("app.workers.certificate_worker.get_redis_client") as mock_redis:
        mock_redis.return_value.set_json = AsyncMock()
        result = await worker.run(
            _make_input(),
            pipeline_run_id=uuid.uuid4(),
            fact_score=0.92,
            policy_violations_count=0,
            risk_score=0.08,
            risk_rating="LOW",
            policy_passed=True,
            fact_passed=True,
        )

    expires_at_str = result.details["expires_at"]
    from datetime import datetime
    expires_at = datetime.fromisoformat(expires_at_str)
    assert expires_at > datetime.now(UTC)
