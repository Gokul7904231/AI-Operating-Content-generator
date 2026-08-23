"""Action contracts for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class ActionRequest(BaseModel):
    """Authorized action request passed through the Action Gate to the Worker Runner."""

    model_config = ConfigDict(extra="forbid")

    action_id: UUID = Field(default_factory=uuid4)
    execution_id: UUID = Field(...)
    decision_id: UUID = Field(...)
    floor_id: str = Field(...)

    capability_name: str = Field(...)
    target_worker: str = Field(...)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    timeout_seconds: float = Field(default=30.0, gt=0.0)

    authorized_by: str = Field(default="GUARDIAN_ACTION_GATE")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
