"""Domain entity: AuditLog.

Every significant action in Floor 07 is recorded as an immutable audit entry.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass(frozen=True)
class AuditLog:
    """Immutable audit log entry."""

    log_id: uuid.UUID
    entity_id: str
    entity_type: str  # "certificate" | "validation_run" | "pipeline"
    action: str       # "created" | "completed" | "failed" | "signed"
    actor: str        # e.g. "pipeline", "system", "human:<reviewer_id>"
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    payload: dict[str, Any] = field(default_factory=dict)
