"""Worker execution result contracts for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class ExecutionStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"
    POLICY_VIOLATION = "POLICY_VIOLATION"
    CIRCUIT_BROKEN = "CIRCUIT_BROKEN"


class WorkerResult(BaseModel):
    """Immutable result returned from worker capability execution."""

    model_config = ConfigDict(extra="forbid")

    result_id: UUID = Field(default_factory=uuid4)
    action_id: UUID = Field(...)
    execution_id: UUID = Field(...)
    capability_name: str = Field(...)
    target_worker: str = Field(...)

    status: ExecutionStatus = Field(...)
    duration_ms: float = Field(..., ge=0.0)

    output_data: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = Field(default=None)
    error_code: Optional[str] = Field(default=None)

    provenance_entries: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
