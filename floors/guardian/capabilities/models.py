"""Capability models for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from typing import Any, Callable, Dict, FrozenSet, Optional
from pydantic import BaseModel, ConfigDict, Field


class Capability(BaseModel):
    """Authoritative descriptor for a registered worker capability."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=2)
    version: str = Field(default="1.0.0")
    floor_id: str = Field(...)

    description: str = Field(..., min_length=5)
    permissions: FrozenSet[str] = Field(default_factory=frozenset)
    side_effects: FrozenSet[str] = Field(default_factory=frozenset)

    timeout_seconds: float = Field(default=30.0, gt=0.0)
    retryable: bool = Field(default=True)
    idempotent: bool = Field(default=True)

    handler: Optional[Any] = Field(default=None, exclude=True)
