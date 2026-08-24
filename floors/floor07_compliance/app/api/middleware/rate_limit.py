"""Rate limiting middleware — Redis sliding window.

Applies to POST /v1/validate only.

Two windows:
  - 100 requests/minute  (per client IP)
  - 1000 requests/hour   (per client IP)

Returns HTTP 429 with Retry-After header when either limit is exceeded.
Both limits are configurable via settings (RATE_LIMIT_PER_MINUTE / RATE_LIMIT_PER_HOUR).
Set RATE_LIMIT_ENABLED=false to bypass in development/testing.
"""

from __future__ import annotations

import time

import structlog
from fastapi import Request
from fastapi.responses import ORJSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.config import get_settings
from app.infrastructure.cache.redis_client import get_redis_client
from app.metrics.registry import rate_limit_blocked_total

logger = structlog.get_logger(__name__)

# Only rate-limit this path
_RATE_LIMITED_PATHS = {"/v1/validate"}


def _is_trusted_proxy(client_host: str | None) -> bool:
    """Return True only if client_host is in the configured trusted proxy set."""
    if not client_host:
        return False
    trusted = set(get_settings().trusted_proxy_ips)
    # Empty list means no proxy is trusted — never trust X-Forwarded-For.
    return client_host in trusted


def _is_valid_ip(value: str) -> bool:
    import ipaddress

    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def _get_client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For only from trusted proxies."""
    client_host = request.client.host if request.client else None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded and _is_trusted_proxy(client_host):
        candidate = forwarded.split(",")[0].strip()
        if candidate and _is_valid_ip(candidate):
            return candidate
        logger.warning("rate_limit_spoofed_xff", raw_xff=forwarded, client_host=client_host)
    return client_host or "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Redis-based sliding window rate limiter."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        settings = get_settings()

        # Only apply to configured paths
        if not settings.rate_limit_enabled or request.url.path not in _RATE_LIMITED_PATHS:
            return await call_next(request)

        client_ip = _get_client_ip(request)
        cache = get_redis_client()

        now = int(time.time())
        ts_minute = now // 60
        ts_hour = now // 3600

        minute_key = f"floor07:ratelimit:{client_ip}:min:{ts_minute}"
        hour_key = f"floor07:ratelimit:{client_ip}:hour:{ts_hour}"

        # Increment both counters atomically
        try:
            # Minute window
            minute_count_raw = await cache._client.incr(minute_key)
            if minute_count_raw == 1:
                await cache._client.expire(minute_key, 120)  # 2× window for safety
            minute_count = int(minute_count_raw)

            # Hour window
            hour_count_raw = await cache._client.incr(hour_key)
            if hour_count_raw == 1:
                await cache._client.expire(hour_key, 7200)
            hour_count = int(hour_count_raw)

        except Exception as exc:
            # Redis unavailable — fail open (don't block legitimate traffic)
            logger.warning("rate_limit_redis_error", error=str(exc), client_ip=client_ip)
            return await call_next(request)

        # Check minute limit
        if minute_count > settings.rate_limit_per_minute:
            rate_limit_blocked_total.labels(window="minute").inc()
            logger.warning(
                "rate_limit_exceeded",
                client_ip=client_ip,
                window="minute",
                count=minute_count,
                limit=settings.rate_limit_per_minute,
            )
            return ORJSONResponse(
                status_code=429,
                headers={"Retry-After": "60"},
                content={
                    "success": False,
                    "error": {
                        "code": "rate_limit_exceeded",
                        "message": f"Rate limit exceeded: {settings.rate_limit_per_minute} requests/minute.",
                        "retry_after_seconds": 60,
                    },
                },
            )

        # Check hour limit
        if hour_count > settings.rate_limit_per_hour:
            rate_limit_blocked_total.labels(window="hour").inc()
            logger.warning(
                "rate_limit_exceeded",
                client_ip=client_ip,
                window="hour",
                count=hour_count,
                limit=settings.rate_limit_per_hour,
            )
            return ORJSONResponse(
                status_code=429,
                headers={"Retry-After": "3600"},
                content={
                    "success": False,
                    "error": {
                        "code": "rate_limit_exceeded",
                        "message": f"Rate limit exceeded: {settings.rate_limit_per_hour} requests/hour.",
                        "retry_after_seconds": 3600,
                    },
                },
            )

        return await call_next(request)
