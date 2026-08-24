"""Validation Pipeline.

Orchestrates the sequential execution of all workers:
  1. FactWorker
  2. PolicyWorker
  3. RiskWorker
  4. CertificateWorker

Each stage is checkpointed — results are written to the ValidationRun
entity after each worker completes.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import structlog

from app.core.constants import PIPELINE_VERSION
from app.core.exceptions import PipelineError
from app.domain.entities.audit_log import AuditLog
from app.domain.entities.validation_run import ValidationRun
from app.domain.repositories import (
    AbstractAuditLogRepository,
    AbstractCertificateRepository,
    AbstractValidationRunRepository,
)
from app.workers.base import WorkerInput, WorkerResult
from app.workers.certificate_worker import CertificateWorker
from app.workers.fact_worker import FactWorker
from app.workers.policy_worker import PolicyWorker
from app.workers.risk_worker import RiskWorker

logger = structlog.get_logger(__name__)


class ValidationPipeline:
    """Coordinates all pipeline workers and persists intermediate state."""

    def __init__(
        self,
        fact_worker: FactWorker,
        policy_worker: PolicyWorker,
        risk_worker: RiskWorker,
        certificate_worker: CertificateWorker,
        run_repo: AbstractValidationRunRepository,
        audit_repo: AbstractAuditLogRepository,
    ) -> None:
        self._fact = fact_worker
        self._policy = policy_worker
        self._risk = risk_worker
        self._cert = certificate_worker
        self._run_repo = run_repo
        self._audit_repo = audit_repo

    async def execute(self, inp: WorkerInput) -> dict[str, object]:
        """Run the full certification pipeline.

        Returns a dict containing all worker results and the final certificate.

        Raises:
            PipelineError: if any unrecoverable failure occurs.
        """
        run_id = uuid.UUID(inp.pipeline_run_id)
        log = logger.bind(
            pipeline_run_id=inp.pipeline_run_id,
            artifact_id=inp.artifact_id,
        )
        log.info("pipeline_started")

        run = ValidationRun(
            run_id=run_id,
            artifact_id=inp.artifact_id,
            platform=inp.platform,
            language=inp.language,
            content_type=inp.content_type,
            pipeline_version=PIPELINE_VERSION,
            started_at=datetime.now(UTC),
        )
        await self._run_repo.save(run)
        await self._audit_repo.append(
            AuditLog(
                log_id=uuid.uuid4(),
                entity_id=inp.pipeline_run_id,
                entity_type="pipeline",
                action="started",
                actor="system",
                payload={"artifact_id": inp.artifact_id},
            )
        )

        try:
            # ── Stage 1: Fact Verification ────────────────────────────────────
            log.info("pipeline_stage", stage="fact_verification")
            fact_result: WorkerResult = await self._fact.run(inp)
            run.fact_result = {
                "passed": fact_result.passed,
                "score": fact_result.score,
                "issues": fact_result.issues,
                "details": fact_result.details,
            }
            await self._run_repo.save(run)

            # ── Stage 2: Policy Compliance ────────────────────────────────────
            log.info("pipeline_stage", stage="policy_compliance")
            policy_result: WorkerResult = await self._policy.run(inp)
            run.policy_result = {
                "passed": policy_result.passed,
                "score": policy_result.score,
                "issues": policy_result.issues,
                "details": policy_result.details,
            }
            await self._run_repo.save(run)

            # ── Stage 3: Risk Assessment ──────────────────────────────────────
            log.info("pipeline_stage", stage="risk_assessment")
            risk_result: WorkerResult = await self._risk.run(
                inp,
                fact_score=fact_result.score,
                policy_score=policy_result.score,
            )
            run.risk_result = {
                "passed": risk_result.passed,
                "score": risk_result.score,
                "issues": risk_result.issues,
                "details": risk_result.details,
            }
            await self._run_repo.save(run)

            # ── Stage 4: Certificate Generation ──────────────────────────────
            log.info("pipeline_stage", stage="certificate_generation")
            violations_count: int = policy_result.details.get("violation_count", 0)  # type: ignore[assignment]
            cert_result: WorkerResult = await self._cert.run(
                inp,
                pipeline_run_id=run_id,
                fact_score=fact_result.score,
                policy_violations_count=violations_count,
                risk_score=risk_result.score,
                risk_rating=risk_result.details["risk_rating"],
                policy_passed=policy_result.passed,
                fact_passed=fact_result.passed,
            )

            cert_id = uuid.UUID(cert_result.details["certificate_id"])  # type: ignore[arg-type]
            run.mark_completed(cert_id)
            await self._run_repo.save(run)

            await self._audit_repo.append(
                AuditLog(
                    log_id=uuid.uuid4(),
                    entity_id=inp.pipeline_run_id,
                    entity_type="pipeline",
                    action="completed",
                    actor="system",
                    payload={
                        "certificate_id": str(cert_id),
                        "decision": cert_result.details.get("publishing_decision"),
                        "duration_seconds": run.duration_seconds(),
                    },
                )
            )

            log.info(
                "pipeline_completed",
                certificate_id=str(cert_id),
                decision=cert_result.details.get("publishing_decision"),
                duration=run.duration_seconds(),
            )

            return {
                "pipeline_run_id": inp.pipeline_run_id,
                "artifact_id": inp.artifact_id,
                "fact": fact_result,
                "policy": policy_result,
                "risk": risk_result,
                "certificate": cert_result,
            }

        except Exception as exc:
            run.mark_failed()
            await self._run_repo.save(run)
            await self._audit_repo.append(
                AuditLog(
                    log_id=uuid.uuid4(),
                    entity_id=inp.pipeline_run_id,
                    entity_type="pipeline",
                    action="failed",
                    actor="system",
                    payload={"error": str(exc)},
                )
            )
            log.error("pipeline_failed", error=str(exc), exc_info=True)
            raise PipelineError(
                f"Pipeline failed for artifact '{inp.artifact_id}'",
                detail=str(exc),
            ) from exc
