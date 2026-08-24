"""ORM model: validation_runs table."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base, created_at_col, uuid_pk


class ValidationRunModel(Base):
    __tablename__ = "validation_runs"

    id: Mapped[uuid.UUID] = uuid_pk()
    artifact_id: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(64), nullable=False)
    language: Mapped[str] = mapped_column(String(16), nullable=False)
    content_type: Mapped[str] = mapped_column(String(64), nullable=False)
    pipeline_version: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="RUNNING")

    # Worker results stored as JSONB
    fact_result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    policy_result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    risk_result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    certificate_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = created_at_col()
