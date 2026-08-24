"""Provenance Memory for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import uuid4
from pydantic import BaseModel, ConfigDict, Field


class ProvenanceRecord(BaseModel):
    """Structured audit trail record of a Guardian action or decision."""

    model_config = ConfigDict(extra="forbid")

    evidence_id: str = Field(default_factory=lambda: f"ev-{uuid4()}")
    evidence_type: str = Field(...)
    floor_id: str = Field(...)
    execution_id: str = Field(...)

    source_identifier: str = Field(...)
    method: str = Field(...)
    summary: str = Field(...)
    raw_data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProvenanceMemory:
    """Manages audit evidence collection and serialization."""

    def __init__(self):
        self._records: List[ProvenanceRecord] = []

    def add_record(self, record: ProvenanceRecord) -> None:
        self._records.append(record)

    def get_records(self) -> List[ProvenanceRecord]:
        return list(self._records)
