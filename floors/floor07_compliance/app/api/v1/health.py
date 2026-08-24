"""Health check router."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import get_settings
from app.infrastructure.database.session import get_async_session
from app.infrastructure.cache.redis_client import get_redis_client, RedisClient
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Diagnostics"])
async def health_check(
    db_session: AsyncSession = Depends(get_async_session),
) -> dict[str, str]:
    """Check connection status for Postgres Database and Redis Cache."""
    # ── Database Health ──
    try:
        await db_session.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    # ── Redis Health ──
    redis_client = get_redis_client()
    if await redis_client.ping():
        cache_status = "healthy"
    else:
        cache_status = "unhealthy"

    overall_status = "healthy" if db_status == "healthy" and cache_status == "healthy" else "unhealthy"
    settings = get_settings()

    return {
        "status": overall_status,
        "version": settings.app_version,
        "database": db_status,
        "cache": cache_status,
    }
