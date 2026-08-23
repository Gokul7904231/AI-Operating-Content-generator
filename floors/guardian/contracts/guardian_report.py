"""Guardian execution report contracts for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from factoryos.guardian.contracts.guardian_state import ExecutionMode, GuardianLifecycleState


class GuardianReport(BaseModel):
    """Authoritative execution report produced by a Floor Guardian."""

    model_config = ConfigDict(extra="forbid")

    report_id: UUID = Field(default_factory=uuid4)
    execution_id: UUID = Field(...)
    request_id: str = Field(...)
    floor_id: str = Field(...)
    floor_version: str = Field(default="1.0.0")
    guardian_version: str = Field(default="1.0.0")

    started_at: datetime = Field(...)
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_ms: float = Field(..., ge=0.0)

    status: GuardianLifecycleState = Field(...)
    execution_mode: ExecutionMode = Field(...)

    configured_provider: Optional[str] = Field(default="deterministic")
    configured_model: Optional[str] = Field(default="none")
    selected_provider: Optional[str] = Field(default="deterministic")
    selected_model: Optional[str] = Field(default="none")

    step_count: int = Field(..., ge=0)
    decision_count: int = Field(..., ge=0)
    action_count: int = Field(..., ge=0)
    retry_count: int = Field(..., ge=0)
    recovery_count: int = Field(..., ge=0)

    worker_results: List[Dict[str, Any]] = Field(default_factory=list)
    decisions: List[Dict[str, Any]] = Field(default_factory=list)
    provenance_audit: List[Dict[str, Any]] = Field(default_factory=list)

    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)

    handoff_payload: Optional[Dict[str, Any]] = Field(default=None)
    handoff_reference: Optional[Dict[str, Any]] = Field(default=None)
