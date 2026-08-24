"""Application DTO: ValidationResult.

Clean output from ValidateContentUseCase — no HTTP, no SQLAlchemy.
The API route maps this to the Pydantic ValidationResponse schema.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class CertificateInfo:
    """Summary of the issued certificate, returned to the caller."""

    certificate_id: uuid.UUID
    publishing_decision: str
    certification_status: str
    payload_hash: str
    signature: str
    issued_at: datetime
    expires_at: datetime


@dataclass(frozen=True)
class ValidationResult:
    """The complete output of a validation pipeline execution.

    Produced by ValidateContentUseCase and consumed by the API route.
    Contains no infrastructure or HTTP-layer types.
    """

    pipeline_run_id: str
    artifact_id: str

    # Core decision
    status: str               # "COMPLETED" | "FAILED"
    decision: str             # PublishingDecision value
    risk_rating: str          # RiskRating.label
    risk_score: float
    fact_confidence: float
    policy_violations: int

    # Detailed worker outputs
    fact_details: dict[str, Any]
    policy_details: dict[str, Any]
    risk_details: dict[str, Any]

    # Certificate (None if pipeline failed before certificate stage)
    certificate: CertificateInfo | None

    # Human-readable issues and recommendations
    issues: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
