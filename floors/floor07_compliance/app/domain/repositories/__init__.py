"""Abstract repository interfaces for the domain layer.

The domain knows nothing about SQLAlchemy or Redis.
Concrete implementations live in app/infrastructure/repositories/.
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod

from app.domain.entities.audit_log import AuditLog
from app.domain.entities.certificate import Certificate
from app.domain.entities.validation_run import ValidationRun


class AbstractCertificateRepository(ABC):
    """Port: persists and retrieves Certificate entities."""

    @abstractmethod
    async def save(self, certificate: Certificate) -> None:
        """Persist a Certificate.  Raises DatabaseError on failure."""

    @abstractmethod
    async def get_by_id(self, certificate_id: uuid.UUID) -> Certificate | None:
        """Return the Certificate with the given id, or None."""

    @abstractmethod
    async def get_by_artifact_id(self, artifact_id: str) -> Certificate | None:
        """Return the latest Certificate for the given artifact_id, or None."""


class AbstractValidationRunRepository(ABC):
    """Port: persists or updates ValidationRun entities."""

    @abstractmethod
    async def save(self, run: ValidationRun) -> None:
        """Persist or update a ValidationRun."""

    @abstractmethod
    async def get_by_id(self, run_id: uuid.UUID) -> ValidationRun | None:
        """Return the ValidationRun with the given id, or None."""


class AbstractAuditLogRepository(ABC):
    """Port: appends AuditLog entries (never updates or deletes)."""

    @abstractmethod
    async def append(self, entry: AuditLog) -> None:
        """Append an AuditLog entry."""
