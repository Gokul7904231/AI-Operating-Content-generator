"""Validation API router — Sprint 2-ready thin route layer.

This file contains ONLY HTTP concerns:
  - Parse the incoming request body (Pydantic)
  - Extract authentication context (Depends)
  - Check idempotency cache (pre-execution)
  - Delegate to ValidateContentUseCase
  - Cache result for idempotency (post-execution)
  - Map ValidationResult DTO → ValidationResponse schema

No business logic, no worker instantiation, no pipeline calls belong here.
"""

from __future__ import annotations

import hashlib
import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.commands.validate_content_command import ValidateContentCommand
from app.application.dto.validation_result import ValidationResult
from app.application.use_cases.validate_content import build_validate_content_use_case
from app.core.constants import IDEMPOTENCY_HEADER, IDEMPOTENCY_TTL_SECONDS
from app.core.exceptions import AuthenticationError, ValidationError
from app.infrastructure.database.session import get_async_session
from app.infrastructure.repositories import (
    AuditLogRepository,
    CertificateRepository,
    ValidationRunRepository,
)
from app.infrastructure.cache.redis_client import get_redis_client
from app.schemas.validation import ValidationRequest, ValidationResponse
from app.security.auth import AuthContext, verify_api_key

# Idempotency-Key must be 1-128 chars of letters/digits/hyphen/underscore (UUID-safe).
_IDEMPOTENCY_KEY_RE = re.compile(r"^[A-Za-z0-9\-_]{1,128}$")


def _scoped_idempotency_key(auth: AuthContext, raw_key: str) -> str:
    """Build a per-principal idempotency cache key.

    Scopes to (requester_id, organization_id) to prevent cross-user cache
    poisoning, validates format/length, and hashes the raw key to avoid
    Redis key injection and unbounded key length.
    """
    stripped = raw_key.strip()
    if not _IDEMPOTENCY_KEY_RE.match(stripped):
        raise ValidationError(
            "Invalid Idempotency-Key format.",
            detail="Idempotency-Key must be 1-128 chars: letters, digits, hyphen, underscore.",
        )
    hashed = hashlib.sha256(stripped.encode("utf-8")).hexdigest()[:32]
    # Sanitize principal components for the Redis key namespace
    req = (auth.requester_id or "anon").replace(":", "_")
    org = (auth.organization_id or "no-org").replace(":", "_")
    return f"floor07:idempotency:{req}:{org}:{hashed}"

router = APIRouter()


def _result_to_response(result: ValidationResult) -> dict[str, Any]:
    """Map application DTO → JSON-serialisable dict for the response model."""
    cert = result.certificate
    return {
        "pipeline_run_id": uuid.UUID(result.pipeline_run_id),
        "artifact_id": result.artifact_id,
        "status": result.status,
        "decision": result.decision,
        "risk_rating": result.risk_rating,
        "risk_score": result.risk_score,
        "fact_confidence": result.fact_confidence,
        "policy_violations": result.policy_violations,
        "fact_details": result.fact_details,
        "policy_details": result.policy_details,
        "risk_details": result.risk_details,
        "certificate": {
            "certificate_id": cert.certificate_id,
            "publishing_decision": cert.publishing_decision,
            "certification_status": cert.certification_status,
            "payload_hash": cert.payload_hash,
            "signature": cert.signature,
            "issued_at": cert.issued_at,
            "expires_at": cert.expires_at,
        } if cert else None,
        "issues": result.issues,
        "recommendations": result.recommendations,
    }


@router.post(
    "/validate",
    response_model=ValidationResponse,
    tags=["Validation"],
    summary="Validate content and issue a compliance certificate",
    description=(
        "Runs the full Floor07 validation pipeline (Fact → Policy → Risk → Certificate) "
        "against the supplied content. Returns a signed certificate and a publishing decision.\n\n"
        "**Authentication**: Requires `X-Factory-Key` header or `Authorization: Bearer <token>`.\n\n"
        "**Idempotency**: Supply an `Idempotency-Key` header to receive the same result on repeated calls."
    ),
    responses={
        200: {"description": "Validation completed — certificate issued"},
        401: {"description": "Missing or invalid API key"},
        422: {"description": "Request body validation failed"},
        429: {"description": "Rate limit exceeded"},
        500: {"description": "Internal pipeline failure"},
    },
)
async def validate_content(
    payload: ValidationRequest,
    request: Request,
    db_session: AsyncSession = Depends(get_async_session),
    auth: AuthContext = Depends(verify_api_key),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> dict[str, Any]:
    """Submit content for validation and receive a signed compliance certificate."""

    # ── Idempotency check ──────────────────────────────────────────────────────
    cache = get_redis_client()
    cache_key: str | None = None
    if idempotency_key:
        cache_key = _scoped_idempotency_key(auth, idempotency_key)
        cached = await cache.get_json(cache_key)
        if cached is not None:
            # Return the cached response immediately — no DB write
            return cached  # type: ignore[return-value]

    # ── Build command ──────────────────────────────────────────────────────────
    command = ValidateContentCommand(
        title=payload.title,
        script=payload.script,
        platform=payload.platform.value,
        language=payload.language,
        content_type=payload.content_type.value,
        metadata=payload.metadata,
        requester_id=auth.requester_id,
        organization_id=auth.organization_id,
        project_id=auth.project_id,
        idempotency_key=idempotency_key,
    )

    # ── Execute use case ───────────────────────────────────────────────────────
    cert_repo = CertificateRepository(db_session)
    run_repo = ValidationRunRepository(db_session)
    audit_repo = AuditLogRepository(db_session)

    use_case = build_validate_content_use_case(
        run_repo=run_repo,
        audit_repo=audit_repo,
        cert_repo=cert_repo,
    )
    result = await use_case.execute(command)

    # ── Map to response ────────────────────────────────────────────────────────
    response_data = _result_to_response(result)

    # ── Cache for idempotency ──────────────────────────────────────────────────
    if idempotency_key and cache_key is not None:
        await cache.set_json(cache_key, response_data, ttl_seconds=IDEMPOTENCY_TTL_SECONDS)

    return response_data
