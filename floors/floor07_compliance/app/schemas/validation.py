"""Pydantic schemas for the Validation API input and output payloads."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.domain.value_objects.platform import Platform, ContentType


class ValidationRequest(BaseModel):
    """Input payload to validate an artifact."""

    title: str = Field(
        ..., min_length=1, max_length=256, description="Title of the content or video"
    )
    script: str = Field(
        ..., min_length=10, description="The full script content to analyze"
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Arbitrary metadata dictionary"
    )
    platform: Platform = Field(
        default=Platform.DEFAULT, description="The destination platform for the content"
    )
    language: str = Field(
        default="en", min_length=2, max_length=5, description="ISO-639-1 language code"
    )
    content_type: ContentType = Field(
        default=ContentType.OTHER, description="The content category/type"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Python Programming Variables",
                "script": "Today we will learn how variables work in Python. A variable assigns memory to store data using an equals sign.",
                "metadata": {"tags": ["python", "learning"]},
                "platform": "youtube",
                "language": "en",
                "content_type": "educational_short",
            }
        }
    }


class FactVerificationDetails(BaseModel):
    word_count: int
    unsourced_numeric_claims: int
    evidence: list[dict[str, Any]]


class PolicyDetails(BaseModel):
    platform: str
    policy_version: str
    total_rules: int
    passed_rules: int
    violation_count: int
    critical_violations: list[str]


class RiskDetails(BaseModel):
    risk_score: float
    risk_rating: str
    fact_score: float
    policy_score: float
    weight_fact: float
    weight_policy: float
    thresholds: dict[str, float]


class CertificateDetails(BaseModel):
    certificate_id: uuid.UUID
    publishing_decision: str
    certification_status: str
    payload_hash: str
    signature: str
    issued_at: datetime
    expires_at: datetime


class ValidationResponse(BaseModel):
    """Output payload representing the results of a validation run."""

    pipeline_run_id: uuid.UUID
    artifact_id: str
    status: str
    decision: str
    risk_rating: str
    risk_score: float
    fact_confidence: float
    policy_violations: int
    fact_details: FactVerificationDetails
    policy_details: PolicyDetails
    risk_details: RiskDetails
    certificate: CertificateDetails | None = None
    issues: list[str]
    recommendations: list[str]
