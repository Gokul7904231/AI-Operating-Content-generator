"""Overseer-compatible system interface.

Every Floor in the FactoryOS architecture exposes this interface so the Overseer
can query its operational status without knowing Floor internals.

Endpoints:
  GET /system/health    — liveness + readiness check (DB + Redis)
  GET /system/status    — operational metrics summary
  GET /system/workers   — list of registered workers with versions
  GET /system/version   — service, guardian, and engine version info

These endpoints do NOT require authentication (they are internal-only and
should be firewalled from public access at the infrastructure level).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import APIRouter
from fastapi.responses import ORJSONResponse

from app.core.config import get_settings
from app.core.constants import (
    CERTIFICATE_WORKER_VERSION,
    FACT_WORKER_VERSION,
    PIPELINE_VERSION,
    POLICY_WORKER_VERSION,
    RISK_WORKER_VERSION,
)
from app.infrastructure.cache.redis_client import get_redis_client

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/system", tags=["System"])

# ── Registered workers (Sprint 2: replace with WorkerRegistry singleton) ─────
_REGISTERED_WORKERS = [
    {"worker_id": "fact_worker",       "version": FACT_WORKER_VERSION,        "status": "active"},
    {"worker_id": "policy_worker",     "version": POLICY_WORKER_VERSION,      "status": "active"},
    {"worker_id": "risk_worker",       "version": RISK_WORKER_VERSION,        "status": "active"},
    {"worker_id": "certificate_worker","version": CERTIFICATE_WORKER_VERSION, "status": "active"},
]


@router.get(
    "/health",
    summary="Health check — liveness and readiness",
    response_class=ORJSONResponse,
)
async def health() -> dict[str, Any]:
    """Returns service health including DB and cache connectivity."""
    settings = get_settings()
    cache = get_redis_client()

    redis_ok = await cache.ping()

    # DB check — attempt a lightweight connection test
    db_ok = True
    try:
        from app.infrastructure.database.engine import engine
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception as exc:
        logger.warning("health_db_check_failed", error=str(exc))
        db_ok = False

    overall = "healthy" if (redis_ok and db_ok) else "degraded"

    return {
        "status": overall,
        "service": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.now(UTC).isoformat(),
        "checks": {
            "database": "ok" if db_ok else "fail",
            "cache": "ok" if redis_ok else "fail",
        },
    }


@router.get(
    "/status",
    summary="Operational status summary",
    response_class=ORJSONResponse,
)
async def status() -> dict[str, Any]:
    """Returns a real-time operational summary for the Overseer."""
    settings = get_settings()
    return {
        "service": settings.app_name,
        "environment": settings.app_env,
        "workers_registered": len(_REGISTERED_WORKERS),
        "workers_active": sum(1 for w in _REGISTERED_WORKERS if w["status"] == "active"),
        "pipeline_version": PIPELINE_VERSION,
        "auth_enabled": settings.auth_enabled,
        "rate_limit_enabled": settings.rate_limit_enabled,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get(
    "/workers",
    summary="List registered pipeline workers",
    response_class=ORJSONResponse,
)
async def workers() -> dict[str, Any]:
    """Returns all registered workers with their IDs and versions.

    Sprint 2: This will query the WorkerRegistry singleton instead.
    """
    return {
        "workers": _REGISTERED_WORKERS,
        "count": len(_REGISTERED_WORKERS),
    }


@router.get(
    "/version",
    summary="Service and component versions",
    response_class=ORJSONResponse,
)
async def version() -> dict[str, Any]:
    """Returns detailed version information for all components.

    The Overseer uses this to verify that all Floors run compatible versions.
    """
    settings = get_settings()
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "guardian_version": settings.guardian_version,
        "pipeline_version": PIPELINE_VERSION,
        "workers": {w["worker_id"]: w["version"] for w in _REGISTERED_WORKERS},
        "built_at": None,  # Sprint 2: inject BUILD_TIMESTAMP from CI
    }
