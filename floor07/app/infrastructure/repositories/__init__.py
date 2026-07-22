"""Concrete SQLAlchemy implementations of the domain repository interfaces."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DatabaseError
from app.domain.entities.audit_log import AuditLog
from app.domain.entities.certificate import Certificate
from app.domain.entities.validation_run import ValidationRun
from app.domain.repositories import (
    AbstractAuditLogRepository,
    AbstractCertificateRepository,
    AbstractValidationRunRepository,
)
from app.infrastructure.models.audit_log import AuditLogModel
from app.infrastructure.models.certificate import CertificateModel
from app.infrastructure.models.validation_run import ValidationRunModel


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cert_to_model(cert: Certificate) -> CertificateModel:
    return CertificateModel(
        id=cert.certificate_id,
        artifact_id=cert.artifact_id,
        pipeline_run_id=cert.pipeline_run_id,
        guardian_version=cert.guardian_version,
        fact_confidence=cert.fact_confidence,
        policy_violations_count=cert.policy_violations_count,
        risk_score=cert.risk_score,
        risk_rating=cert.risk_rating,
        publishing_decision=cert.publishing_decision,
        certification_status=cert.certification_status,
        payload_hash=cert.payload_hash,
        signature=cert.signature,
        issued_at=cert.issued_at,
        expires_at=cert.expires_at,
    )


def _model_to_cert(row: CertificateModel) -> Certificate:
    return Certificate(
        certificate_id=row.id,
        artifact_id=row.artifact_id,
        pipeline_run_id=row.pipeline_run_id,
        guardian_version=row.guardian_version,
        fact_confidence=row.fact_confidence,
        policy_violations_count=row.policy_violations_count,
        risk_score=row.risk_score,
        risk_rating=row.risk_rating,
        publishing_decision=row.publishing_decision,
        certification_status=row.certification_status,
        payload_hash=row.payload_hash,
        signature=row.signature,
        issued_at=row.issued_at,
        expires_at=row.expires_at,
    )


def _run_to_model(run: ValidationRun) -> ValidationRunModel:
    return ValidationRunModel(
        id=run.run_id,
        artifact_id=run.artifact_id,
        platform=run.platform,
        language=run.language,
        content_type=run.content_type,
        pipeline_version=run.pipeline_version,
        status=run.status,
        fact_result=run.fact_result,
        policy_result=run.policy_result,
        risk_result=run.risk_result,
        certificate_id=run.certificate_id,
        started_at=run.started_at,
        completed_at=run.completed_at,
    )


def _model_to_run(row: ValidationRunModel) -> ValidationRun:
    run = ValidationRun(
        run_id=row.id,
        artifact_id=row.artifact_id,
        platform=row.platform,
        language=row.language,
        content_type=row.content_type,
        pipeline_version=row.pipeline_version,
        started_at=row.started_at,
        status=row.status,
    )
    run.fact_result = row.fact_result or {}
    run.policy_result = row.policy_result or {}
    run.risk_result = row.risk_result or {}
    run.certificate_id = row.certificate_id
    run.completed_at = row.completed_at
    return run


# ── Certificate Repository ────────────────────────────────────────────────────

class CertificateRepository(AbstractCertificateRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, certificate: Certificate) -> None:
        try:
            model = _cert_to_model(certificate)
            self._session.add(model)
            await self._session.flush()
        except Exception as exc:
            raise DatabaseError(
                "Failed to persist certificate", detail=str(exc)
            ) from exc

    async def get_by_id(self, certificate_id: uuid.UUID) -> Certificate | None:
        try:
            result = await self._session.get(CertificateModel, certificate_id)
            return _model_to_cert(result) if result else None
        except Exception as exc:
            raise DatabaseError(
                "Failed to retrieve certificate by id", detail=str(exc)
            ) from exc

    async def get_by_artifact_id(self, artifact_id: str) -> Certificate | None:
        try:
            stmt = (
                select(CertificateModel)
                .where(CertificateModel.artifact_id == artifact_id)
                .order_by(CertificateModel.issued_at.desc())
                .limit(1)
            )
            row = (await self._session.execute(stmt)).scalar_one_or_none()
            return _model_to_cert(row) if row else None
        except Exception as exc:
            raise DatabaseError(
                "Failed to retrieve certificate by artifact_id", detail=str(exc)
            ) from exc


# ── ValidationRun Repository ──────────────────────────────────────────────────

class ValidationRunRepository(AbstractValidationRunRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, run: ValidationRun) -> None:
        try:
            existing = await self._session.get(ValidationRunModel, run.run_id)
            if existing is None:
                self._session.add(_run_to_model(run))
            else:
                existing.status = run.status
                existing.fact_result = run.fact_result
                existing.policy_result = run.policy_result
                existing.risk_result = run.risk_result
                existing.certificate_id = run.certificate_id
                existing.completed_at = run.completed_at
            await self._session.flush()
        except Exception as exc:
            raise DatabaseError(
                "Failed to persist validation run", detail=str(exc)
            ) from exc

    async def get_by_id(self, run_id: uuid.UUID) -> ValidationRun | None:
        try:
            row = await self._session.get(ValidationRunModel, run_id)
            return _model_to_run(row) if row else None
        except Exception as exc:
            raise DatabaseError(
                "Failed to retrieve validation run", detail=str(exc)
            ) from exc


# ── AuditLog Repository ───────────────────────────────────────────────────────

class AuditLogRepository(AbstractAuditLogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def append(self, entry: AuditLog) -> None:
        try:
            model = AuditLogModel(
                id=entry.log_id,
                entity_id=entry.entity_id,
                entity_type=entry.entity_type,
                action=entry.action,
                actor=entry.actor,
                timestamp=entry.timestamp,
                payload=entry.payload,
            )
            self._session.add(model)
            await self._session.flush()
        except Exception as exc:
            raise DatabaseError(
                "Failed to append audit log", detail=str(exc)
            ) from exc
