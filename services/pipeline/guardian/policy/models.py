"""Policy models for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PolicySeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    FATAL = "FATAL"


class PolicyResult(BaseModel):
    """Result of evaluating a single policy rule."""

    model_config = ConfigDict(extra="forbid")

    allowed: bool = Field(...)
    policy_id: str = Field(...)
    severity: PolicySeverity = Field(default=PolicySeverity.FATAL)
    reason: str = Field(...)
    details: Optional[str] = Field(default=None)
