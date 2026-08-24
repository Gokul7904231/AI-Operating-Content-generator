"""Guardian State contracts and lifecycle states for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class GuardianLifecycleState(str, Enum):
    CREATED = "CREATED"
    VALIDATING = "VALIDATING"
    READY = "READY"
    PLANNING = "PLANNING"
    DECISION_PENDING = "DECISION_PENDING"
    ACTION_AUTHORIZED = "ACTION_AUTHORIZED"
    EXECUTING = "EXECUTING"
    OBSERVING = "OBSERVING"
    VERIFYING = "VERIFYING"
    RECOVERING = "RECOVERING"
    ESCALATED = "ESCALATED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ExecutionMode(str, Enum):
    DETERMINISTIC = "DETERMINISTIC"
    LLM_ASSISTED = "LLM_ASSISTED"
    HYBRID = "HYBRID"
    DETERMINISTIC_FALLBACK = "DETERMINISTIC_FALLBACK"


class GuardianState(BaseModel):
    """Authoritative, typed state model for a Guardian execution loop."""

    model_config = ConfigDict(extra="forbid", strict=True)

    execution_id: UUID = Field(default_factory=uuid4)
    request_id: str = Field(...)
    floor_id: str = Field(...)
    floor_version: str = Field(default="1.0.0")

    lifecycle_state: GuardianLifecycleState = Field(default=GuardianLifecycleState.CREATED)
    objective: str = Field(..., min_length=3)
    input_contract_hash: str = Field(..., min_length=8)

    completed_actions: List[str] = Field(default_factory=list)
    pending_actions: List[str] = Field(default_factory=list)

    failure_count: int = Field(default=0, ge=0)
    recovery_count: int = Field(default=0, ge=0)
    step_count: int = Field(default=0, ge=0)
    llm_call_count: int = Field(default=0, ge=0)

    max_steps: int = Field(default=10, ge=1, le=50)
    max_retries: int = Field(default=3, ge=0, le=10)

    execution_mode: ExecutionMode = Field(default=ExecutionMode.HYBRID)
    active_worker: Optional[str] = Field(default=None)

    metadata: Dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
