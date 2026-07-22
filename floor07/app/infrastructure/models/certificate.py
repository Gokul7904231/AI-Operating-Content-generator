"""ORM model: certificates table."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base, created_at_col, uuid_pk


class CertificateModel(Base):
    __tablename__ = "certificates"

    id: Mapped[uuid.UUID] = uuid_pk()
    artifact_id: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    pipeline_run_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)
    guardian_version: Mapped[str] = mapped_column(String(32), nullable=False)

    # Scores
    fact_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    policy_violations_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_rating: Mapped[str] = mapped_column(String(16), nullable=False)

    # Decision
    publishing_decision: Mapped[str] = mapped_column(String(32), nullable=False)
    certification_status: Mapped[str] = mapped_column(String(32), nullable=False)

    # Integrity
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    signature: Mapped[str] = mapped_column(String(64), nullable=False)

    # Timestamps
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = created_at_col()
