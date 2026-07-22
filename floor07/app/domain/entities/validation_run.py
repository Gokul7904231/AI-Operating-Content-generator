"""Domain entity: ValidationRun.

Represents one full execution of the certification pipeline for an artifact.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass
class ValidationRun:
    """Mutable entity — updated as the pipeline progresses through stages."""

    run_id: uuid.UUID
    artifact_id: str
    platform: str
    language: str
    content_type: str
    pipeline_version: str

    started_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None
    status: str = "RUNNING"  # RUNNING | COMPLETED | FAILED

    # Worker results stored as plain dicts (serialised to JSONB in DB)
    fact_result: dict[str, Any] = field(default_factory=dict)
    policy_result: dict[str, Any] = field(default_factory=dict)
    risk_result: dict[str, Any] = field(default_factory=dict)

    certificate_id: uuid.UUID | None = None

    def mark_completed(self, certificate_id: uuid.UUID) -> None:
        self.completed_at = datetime.now(UTC)
        self.status = "COMPLETED"
        self.certificate_id = certificate_id

    def mark_failed(self) -> None:
        self.completed_at = datetime.now(UTC)
        self.status = "FAILED"

    def duration_seconds(self) -> float | None:
        if self.completed_at is None:
            return None
        return (self.completed_at - self.started_at).total_seconds()
