"""SQLAlchemy declarative base and shared column helpers."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, mapped_column, MappedColumn


class Base(DeclarativeBase):
    """All ORM models inherit from this base."""
    pass


def utcnow() -> datetime:
    return datetime.now(UTC)


# Reusable typed column factories
def uuid_pk() -> MappedColumn[uuid.UUID]:
    """Primary key UUID column."""
    return mapped_column(primary_key=True, default=uuid.uuid4)


def created_at_col() -> MappedColumn[datetime]:
    return mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


def updated_at_col() -> MappedColumn[datetime]:
    return mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
