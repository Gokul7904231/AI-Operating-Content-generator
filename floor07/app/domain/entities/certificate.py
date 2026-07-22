"""Domain entity: Certificate.

The Certificate is the authoritative output of Floor 07.
It is immutable once created.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass(frozen=True)
class Certificate:
    """Immutable domain entity representing a signed Content Certificate."""

    certificate_id: uuid.UUID
    artifact_id: str
    pipeline_run_id: uuid.UUID
    guardian_version: str

    # Scores from each worker
    fact_confidence: float
    policy_violations_count: int
    risk_score: float
    risk_rating: str  # RiskRating.label

    # Decision
    publishing_decision: str  # PublishingDecision value
    certification_status: str  # "CERTIFIED" | "REJECTED" | "PENDING_HUMAN_REVIEW"

    # Integrity
    payload_hash: str
    signature: str

    # Timestamps (UTC)
    issued_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    expires_at: datetime = field(
        default_factory=lambda: datetime.now(UTC).replace(
            year=datetime.now(UTC).year,
            day=datetime.now(UTC).day + 90,
        )
    )

    def is_certified(self) -> bool:
        return self.certification_status == "CERTIFIED"

    def is_expired(self) -> bool:
        return datetime.now(UTC) > self.expires_at

    def to_signing_payload(self) -> dict[str, object]:
        """Return the dict that was signed (excludes the signature itself)."""
        return {
            "certificate_id": str(self.certificate_id),
            "artifact_id": self.artifact_id,
            "pipeline_run_id": str(self.pipeline_run_id),
            "guardian_version": self.guardian_version,
            "fact_confidence": self.fact_confidence,
            "policy_violations_count": self.policy_violations_count,
            "risk_score": self.risk_score,
            "risk_rating": self.risk_rating,
            "publishing_decision": self.publishing_decision,
            "certification_status": self.certification_status,
            "payload_hash": self.payload_hash,
            "issued_at": self.issued_at.isoformat(),
        }
