"""API Key authentication for Floor07.

Supports two header formats:
  - X-Factory-Key: <api_key>
  - Authorization: Bearer <api_key>

Initial implementation uses a static list of valid keys from settings
(FACTORY_API_KEYS env var, comma-separated).

Future Sprint 2 extension point: swap _lookup_key() for a DB-backed
org/project/quota-aware key store without touching the FastAPI dependency.
"""

from __future__ import annotations

from dataclasses import dataclass

import structlog
from fastapi import Request
from fastapi.security import APIKeyHeader, HTTPBearer

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError

logger = structlog.get_logger(__name__)

_X_FACTORY_KEY_HEADER = "X-Factory-Key"
_BEARER_SCHEME = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    """Resolved identity from a validated API key.

    Sprint 2 will extend this with organization_id, project_id,
    quota_remaining, and audit metadata.
    """

    requester_id: str
    api_key_prefix: str  # First 8 chars of key — safe to log
    organization_id: str | None = None
    project_id: str | None = None


def _extract_key(request: Request) -> str | None:
    """Extract API key from X-Factory-Key or Authorization: Bearer headers."""
    # Primary: X-Factory-Key
    key = request.headers.get(_X_FACTORY_KEY_HEADER)
    if key:
        return key.strip()

    # Secondary: Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    return None


def _lookup_key(api_key: str) -> AuthContext | None:
    """Validate the key against configured valid keys.

    Returns AuthContext on success, None on failure.
    Sprint 2 hook: replace this with async DB lookup.
    """
    settings = get_settings()

    if not settings.auth_enabled:
        # Auth disabled (testing / internal deployments)
        return AuthContext(
            requester_id="anonymous",
            api_key_prefix="disabled",
        )

    valid_keys: list[str] = settings.factory_api_keys
    if api_key in valid_keys:
        return AuthContext(
            requester_id=f"key:{api_key[:8]}",
            api_key_prefix=api_key[:8],
        )

    return None


async def verify_api_key(request: Request) -> AuthContext:
    """FastAPI dependency — validates the API key and returns AuthContext.

    Raises:
        AuthenticationError: If no key is present or the key is invalid.
    """
    settings = get_settings()

    # Short-circuit if auth is globally disabled
    if not settings.auth_enabled:
        return AuthContext(requester_id="anonymous", api_key_prefix="disabled")

    api_key = _extract_key(request)

    if api_key is None:
        logger.warning(
            "auth_missing_key",
            path=request.url.path,
            client=request.client.host if request.client else "unknown",
        )
        raise AuthenticationError(
            "Missing API key. Provide X-Factory-Key header or Authorization: Bearer token.",
            detail="No API key was supplied with the request.",
        )

    auth_context = _lookup_key(api_key)

    if auth_context is None:
        logger.warning(
            "auth_invalid_key",
            path=request.url.path,
            key_prefix=api_key[:8] if len(api_key) >= 8 else "***",
        )
        raise AuthenticationError(
            "Invalid API key.",
            detail="The provided API key was not recognised.",
        )

    logger.info(
        "auth_success",
        requester_id=auth_context.requester_id,
        path=request.url.path,
    )
    return auth_context
