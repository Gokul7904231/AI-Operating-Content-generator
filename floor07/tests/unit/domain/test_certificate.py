"""Domain tests: Certificate entity.

Tests the frozen Certificate dataclass for:
- creation and field population
- is_certified / is_expired predicates
- to_signing_payload key set
- immutability (FrozenInstanceError)
- equality semantics
"""

from __future__ import annotations

import uuid
from dataclasses import FrozenInstanceError
from datetime import UTC, datetime, timedelta

import pytest

from app.domain.entities.certificate import Certificate


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_certificate(**overrides: object) -> Certificate:
    """Return a valid Certificate with sensible defaults."""
    now = datetime.now(UTC)
    defaults: dict[str, object] = {
        "certificate_id": uuid.uuid4(),
        "artifact_id": "artifact-001",
        "pipeline_run_id": uuid.uuid4(),
        "guardian_version": "1.0.0",
        "fact_confidence": 0.95,
        "policy_violations_count": 0,
        "risk_score": 0.05,
        "risk_rating": "LOW",
        "publishing_decision": "PASS",
        "certification_status": "CERTIFIED",
        "payload_hash": "abc123",
        "signature": "sig456",
        "issued_at": now,
        "expires_at": now + timedelta(days=90),
    }
    defaults.update(overrides)
    return Certificate(**defaults)  # type: ignore[arg-type]


# ── Tests ────────────────────────────────────────────────────────────────────

def test_certificate_creation_valid() -> None:
    """Fields are stored exactly as provided."""
    cert_id = uuid.uuid4()
    run_id = uuid.uuid4()
    now = datetime.now(UTC)
    cert = _make_certificate(
        certificate_id=cert_id,
        pipeline_run_id=run_id,
        fact_confidence=0.92,
        issued_at=now,
    )
    assert cert.certificate_id == cert_id
    assert cert.pipeline_run_id == run_id
    assert cert.fact_confidence == 0.92
    assert cert.artifact_id == "artifact-001"


def test_certificate_is_certified_true() -> None:
    cert = _make_certificate(certification_status="CERTIFIED")
    assert cert.is_certified() is True


def test_certificate_is_not_certified_when_rejected() -> None:
    cert = _make_certificate(certification_status="REJECTED")
    assert cert.is_certified() is False


def test_certificate_is_not_certified_when_pending() -> None:
    cert = _make_certificate(certification_status="PENDING_HUMAN_REVIEW")
    assert cert.is_certified() is False


def test_certificate_is_not_expired_when_fresh() -> None:
    now = datetime.now(UTC)
    cert = _make_certificate(
        issued_at=now,
        expires_at=now + timedelta(days=90),
    )
    assert cert.is_expired() is False


def test_certificate_is_expired_when_past_expiry() -> None:
    past = datetime.now(UTC) - timedelta(days=1)
    cert = _make_certificate(expires_at=past)
    assert cert.is_expired() is True


def test_certificate_to_signing_payload_has_required_keys() -> None:
    cert = _make_certificate()
    payload = cert.to_signing_payload()
    expected_keys = {
        "certificate_id",
        "artifact_id",
        "pipeline_run_id",
        "guardian_version",
        "fact_confidence",
        "policy_violations_count",
        "risk_score",
        "risk_rating",
        "publishing_decision",
        "certification_status",
        "issued_at",
    }
    assert expected_keys.issubset(payload.keys())


def test_certificate_to_signing_payload_values_are_serializable() -> None:
    """All values in the signing payload must be JSON-safe (str, int, float)."""
    import json
    cert = _make_certificate()
    payload = cert.to_signing_payload()
    # Should not raise
    json.dumps(payload)


def test_certificate_immutability() -> None:
    """Frozen dataclass must raise FrozenInstanceError on mutation attempt."""
    cert = _make_certificate()
    with pytest.raises(FrozenInstanceError):
        cert.fact_confidence = 0.5  # type: ignore[misc]


def test_certificate_equality_same_fields() -> None:
    """Two certificates built with identical fields must be equal."""
    cert_id = uuid.uuid4()
    run_id = uuid.uuid4()
    now = datetime.now(UTC)
    expires = now + timedelta(days=90)
    kwargs = {
        "certificate_id": cert_id,
        "pipeline_run_id": run_id,
        "issued_at": now,
        "expires_at": expires,
    }
    cert_a = _make_certificate(**kwargs)
    cert_b = _make_certificate(**kwargs)
    assert cert_a == cert_b


def test_certificate_inequality_different_ids() -> None:
    cert_a = _make_certificate(certificate_id=uuid.uuid4())
    cert_b = _make_certificate(certificate_id=uuid.uuid4())
    assert cert_a != cert_b


def test_certificate_payload_hash_not_in_signing_payload() -> None:
    """payload_hash should NOT appear in to_signing_payload to avoid circular hashing."""
    cert = _make_certificate(payload_hash="deadbeef")
    payload = cert.to_signing_payload()
    # payload_hash is the hash OF the payload — it must not be inside it
    assert "payload_hash" not in payload


def test_certificate_signature_not_in_signing_payload() -> None:
    """signature must not be inside the payload that is being signed."""
    cert = _make_certificate(signature="sig-xyz")
    payload = cert.to_signing_payload()
    assert "signature" not in payload
