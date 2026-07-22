"""Certificate Worker.

Produces a signed Content Certificate and persists it via the
CertificateRepository.  Also stores a cache entry in Redis.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog

from app.core.config import get_settings
from app.core.constants import CACHE_KEY_CERTIFICATE, CERTIFICATE_WORKER_ID
from app.core.exceptions import WorkerError
from app.domain.entities.certificate import Certificate
from app.domain.repositories import AbstractCertificateRepository
from app.domain.value_objects.decision import PublishingDecision
from app.domain.value_objects.risk_rating import RiskRating
from app.infrastructure.cache.redis_client import get_redis_client
from app.security.signing import hash_payload, sign_certificate
from app.workers.base import BaseWorker, WorkerInput, WorkerResult

logger = structlog.get_logger(__name__)


def _decide(risk_rating: str, policy_passed: bool, fact_passed: bool) -> str:
    """Map worker outcomes to a PublishingDecision."""
    rating = RiskRating[risk_rating]
    if rating == RiskRating.CRITICAL:
        return PublishingDecision.HUMAN_REVIEW
    if rating == RiskRating.HIGH:
        return PublishingDecision.REPAIR
    if not policy_passed or not fact_passed:
        return PublishingDecision.REPAIR
    return PublishingDecision.PASS


def _cert_status(decision: str) -> str:
    if decision == PublishingDecision.PASS:
        return "CERTIFIED"
    if decision == PublishingDecision.HUMAN_REVIEW:
        return "PENDING_HUMAN_REVIEW"
    return "REJECTED"


def _uuid7() -> uuid.UUID:
    """Generate a time-ordered UUID v7."""
    import os
    import time

    ts_ms = int(time.time() * 1000)
    rand_a = int.from_bytes(os.urandom(2), "big") & 0x0FFF
    rand_b = int.from_bytes(os.urandom(8), "big") & 0x3FFFFFFFFFFFFFFF
    value = (
        (ts_ms & 0xFFFFFFFFFFFF) << 80
        | (0x7 << 76)
        | (rand_a << 64)
        | (0b10 << 62)
        | rand_b
    )
    return uuid.UUID(int=value)


class CertificateWorker(BaseWorker):
    """Generates, signs, and persists the Content Certificate."""

    worker_id = CERTIFICATE_WORKER_ID

    def __init__(self, certificate_repo: AbstractCertificateRepository) -> None:
        self._repo = certificate_repo

    async def run(
        self,
        inp: WorkerInput,
        *,
        pipeline_run_id: uuid.UUID,
        fact_score: float,
        policy_violations_count: int,
        risk_score: float,
        risk_rating: str,
        policy_passed: bool,
        fact_passed: bool,
    ) -> WorkerResult:
        log = logger.bind(
            worker=self.worker_id,
            artifact_id=inp.artifact_id,
        )
        log.info("certificate_worker_started")
        settings = get_settings()

        try:
            decision = _decide(risk_rating, policy_passed, fact_passed)
            cert_status = _cert_status(decision)

            certificate_id = _uuid7()
            now = datetime.now(UTC)

            # Build signing payload (excludes signature)
            payload_for_hash: dict[str, Any] = {
                "certificate_id": str(certificate_id),
                "artifact_id": inp.artifact_id,
                "pipeline_run_id": str(pipeline_run_id),
                "guardian_version": settings.guardian_version,
                "fact_confidence": fact_score,
                "policy_violations_count": policy_violations_count,
                "risk_score": risk_score,
                "risk_rating": risk_rating,
                "publishing_decision": decision,
                "certification_status": cert_status,
                "issued_at": now.isoformat(),
            }

            payload_hash = hash_payload(payload_for_hash)
            signature = sign_certificate(payload_for_hash, settings.signing_secret_key)

            certificate = Certificate(
                certificate_id=certificate_id,
                artifact_id=inp.artifact_id,
                pipeline_run_id=pipeline_run_id,
                guardian_version=settings.guardian_version,
                fact_confidence=fact_score,
                policy_violations_count=policy_violations_count,
                risk_score=risk_score,
                risk_rating=risk_rating,
                publishing_decision=decision,
                certification_status=cert_status,
                payload_hash=payload_hash,
                signature=signature,
                issued_at=now,
                expires_at=now + timedelta(days=90),
            )

            await self._repo.save(certificate)

            # Cache the certificate for fast retrieval
            cache = get_redis_client()
            cache_key = CACHE_KEY_CERTIFICATE.format(artifact_id=inp.artifact_id)
            await cache.set_json(
                cache_key,
                {
                    "certificate_id": str(certificate_id),
                    "publishing_decision": decision,
                    "risk_rating": risk_rating,
                    "certification_status": cert_status,
                    "issued_at": now.isoformat(),
                },
                ttl_seconds=settings.redis_certificate_ttl_seconds,
            )

            log.info(
                "certificate_worker_completed",
                certificate_id=str(certificate_id),
                decision=decision,
                status=cert_status,
            )

            return WorkerResult(
                worker_id=self.worker_id,
                passed=decision == PublishingDecision.PASS,
                score=1.0 if decision == PublishingDecision.PASS else 0.0,
                details={
                    "certificate_id": str(certificate_id),
                    "publishing_decision": decision,
                    "certification_status": cert_status,
                    "payload_hash": payload_hash,
                    "signature": signature,
                    "issued_at": now.isoformat(),
                    "expires_at": (now + timedelta(days=90)).isoformat(),
                },
            )

        except Exception as exc:
            log.error("certificate_worker_failed", error=str(exc))
            raise WorkerError(
                "Certificate generation failed",
                worker_id=self.worker_id,
                detail=str(exc),
            ) from exc
