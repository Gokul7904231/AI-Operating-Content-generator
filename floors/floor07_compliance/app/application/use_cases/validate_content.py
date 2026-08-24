"""Use Case: ValidateContentUseCase.

Orchestrates the full validation pipeline:
  1. Build WorkerInput from the command
  2. Execute the ValidationPipeline (Fact → Policy → Risk → Certificate)
  3. Map the raw pipeline result to a clean ValidationResult DTO

This is the primary entry point for content validation.
No HTTP, no SQLAlchemy, no FastAPI concerns belong here.
"""

from __future__ import annotations

import uuid

import structlog

from app.application.commands.validate_content_command import ValidateContentCommand
from app.application.dto.validation_result import CertificateInfo, ValidationResult
from app.core.exceptions import ApplicationException
from app.domain.repositories import (
    AbstractAuditLogRepository,
    AbstractCertificateRepository,
    AbstractValidationRunRepository,
)
from app.pipelines.validation_pipeline import ValidationPipeline
from app.workers.base import WorkerInput
from app.workers.certificate_worker import CertificateWorker
from app.workers.fact_worker import FactWorker
from app.workers.policy_worker import PolicyWorker
from app.workers.risk_worker import RiskWorker

logger = structlog.get_logger(__name__)


class ValidateContentUseCase:
    """Orchestrates the content validation pipeline.

    Dependencies are injected via __init__ to keep the use case testable
    without HTTP context.
    """

    def __init__(
        self,
        pipeline: ValidationPipeline,
    ) -> None:
        self._pipeline = pipeline

    async def execute(self, command: ValidateContentCommand) -> ValidationResult:
        """Run the full validation pipeline for the given command.

        Args:
            command: The validated, immutable input command.

        Returns:
            ValidationResult DTO containing all worker outputs and the certificate.

        Raises:
            ApplicationException: If the pipeline fails to complete.
        """
        log = logger.bind(
            requester_id=command.requester_id,
            platform=command.platform,
            idempotency_key=command.idempotency_key,
        )
        log.info("use_case_started", use_case="validate_content")

        artifact_id = str(uuid.uuid4())
        pipeline_run_id = str(uuid.uuid4())

        worker_input = WorkerInput(
            artifact_id=artifact_id,
            pipeline_run_id=pipeline_run_id,
            title=command.title,
            script=command.script,
            metadata=command.metadata,
            platform=command.platform,
            language=command.language,
            content_type=command.content_type,
        )

        try:
            raw = await self._pipeline.execute(worker_input)
        except Exception as exc:
            log.error("use_case_pipeline_failed", error=str(exc))
            raise ApplicationException(
                "Content validation pipeline failed.",
                detail=str(exc),
            ) from exc

        fact = raw["fact"]
        policy = raw["policy"]
        risk = raw["risk"]
        cert = raw["certificate"]

        cert_details = cert.details
        certification_status = cert_details.get("certification_status", "UNKNOWN")

        certificate_info: CertificateInfo | None = None
        if cert_details.get("certificate_id"):
            from datetime import datetime
            certificate_info = CertificateInfo(
                certificate_id=uuid.UUID(cert_details["certificate_id"]),
                publishing_decision=cert_details.get("publishing_decision", "UNKNOWN"),
                certification_status=certification_status,
                payload_hash=cert_details.get("payload_hash", ""),
                signature=cert_details.get("signature", ""),
                issued_at=datetime.fromisoformat(cert_details["issued_at"]),
                expires_at=datetime.fromisoformat(cert_details["expires_at"]),
            )

        result = ValidationResult(
            pipeline_run_id=pipeline_run_id,
            artifact_id=artifact_id,
            status="COMPLETED" if certification_status == "CERTIFIED" else "FAILED",
            decision=cert_details.get("publishing_decision", "UNKNOWN"),
            risk_rating=risk.details.get("risk_rating", "UNKNOWN"),
            risk_score=risk.details.get("risk_score", 0.0),
            fact_confidence=fact.score,
            policy_violations=policy.details.get("violation_count", 0),
            fact_details=fact.details,
            policy_details=policy.details,
            risk_details=risk.details,
            certificate=certificate_info,
            issues=fact.issues + policy.issues + risk.issues + cert.issues,
            recommendations=(
                fact.recommendations
                + policy.recommendations
                + risk.recommendations
                + cert.recommendations
            ),
        )

        log.info(
            "use_case_completed",
            use_case="validate_content",
            decision=result.decision,
            risk_rating=result.risk_rating,
        )
        return result


def build_validate_content_use_case(
    run_repo: AbstractValidationRunRepository,
    audit_repo: AbstractAuditLogRepository,
    cert_repo: AbstractCertificateRepository,
) -> ValidateContentUseCase:
    """Factory function — builds the fully-wired use case with all dependencies.

    Called by the FastAPI dependency injection system.
    """
    pipeline = ValidationPipeline(
        fact_worker=FactWorker(),
        policy_worker=PolicyWorker(),
        risk_worker=RiskWorker(),
        certificate_worker=CertificateWorker(cert_repo),
        run_repo=run_repo,
        audit_repo=audit_repo,
    )
    return ValidateContentUseCase(pipeline=pipeline)
