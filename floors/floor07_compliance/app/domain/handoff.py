"""Domain models and handoff contracts for Floor 07 Compliance & Quality Gate."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from factoryos.guardian.contracts.guardian_state import ExecutionMode
from floors.floor06_rendering.app.domain.handoff import Floor06HandoffPayload


class ComplianceStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    CONDITIONAL_PASS = "CONDITIONAL_PASS"
    REJECTED = "REJECTED"


class RiskRating(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FactCheckResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_claims: int = Field(default=0)
    verified_claims: int = Field(default=0)
    hallucination_score: float = Field(default=0.0, ge=0.0, le=1.0)
    unsupported_statements: List[str] = Field(default_factory=list)


class PolicyCheckResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    platform: str = Field(...)
    policy_violations: List[str] = Field(default_factory=list)
    age_restricted: bool = Field(default=False)
    copyright_flags: List[str] = Field(default_factory=list)


class ComplianceCertificate(BaseModel):
    """Cryptographically signed compliance certificate emitted by Floor 07."""

    model_config = ConfigDict(extra="forbid")

    certificate_id: UUID = Field(default_factory=uuid4)
    run_id: str = Field(...)
    artifact_hash_sha256: str = Field(...)
    risk_level: RiskRating = Field(default=RiskRating.LOW)
    fact_check: FactCheckResult = Field(default_factory=FactCheckResult)
    policy_check: PolicyCheckResult = Field(...)
    signed_by: str = Field(default="CertificateWorker_v1")
    issued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Floor07Input(BaseModel):
    """Input parameters for Floor 07 Compliance Gate."""

    model_config = ConfigDict(extra="forbid")

    execution_id: UUID = Field(default_factory=uuid4)
    run_id: str = Field(...)
    render_payload: Floor06HandoffPayload = Field(...)
    target_platform: str = Field(default="YOUTUBE_SHORTS")


class Floor07HandoffPayload(BaseModel):
    """Final authoritative handoff payload produced by Floor 07 Quality Gate."""

    model_config = ConfigDict(extra="forbid")

    handoff_id: UUID = Field(default_factory=uuid4)
    execution_id: UUID = Field(...)
    run_id: str = Field(...)
    status: ComplianceStatus = Field(default=ComplianceStatus.PASSED)
    certificate: ComplianceCertificate = Field(...)
    render_handoff: Floor06HandoffPayload = Field(...)
    approved_for_publishing: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
