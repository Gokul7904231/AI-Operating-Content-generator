"""Async Redis client with typed helpers and circuit-breaker-lite error handling."""

from __future__ import annotations

import json
from typing import Any

import redis.asyncio as aioredis
import structlog

from app.core.config import get_settings
from app.core.exceptions import CacheError

logger = structlog.get_logger(__name__)


class RedisClient:
    """Thin wrapper around redis.asyncio.Redis with typed get/set/delete."""

    def __init__(self, client: aioredis.Redis) -> None:  # type: ignore[type-arg]
        self._client = client

    @classmethod
    def from_settings(cls) -> "RedisClient":
        settings = get_settings()
        client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        return cls(client)

    async def get_json(self, key: str) -> Any | None:
        """Retrieve a JSON value.  Returns None on cache miss or error."""
        try:
            raw = await self._client.get(key)
            return json.loads(raw) if raw is not None else None
        except Exception as exc:
            logger.warning("redis_get_failed", key=key, error=str(exc))
            return None  # Cache miss — non-fatal

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Store a JSON-serialisable value with a TTL.  Swallows errors."""
        try:
            await self._client.setex(key, ttl_seconds, json.dumps(value, default=str))
        except Exception as exc:
            logger.warning("redis_set_failed", key=key, error=str(exc))

    async def delete(self, key: str) -> None:
        try:
            await self._client.delete(key)
        except Exception as exc:
            logger.warning("redis_delete_failed", key=key, error=str(exc))

    async def ping(self) -> bool:
        try:
            return await self._client.ping()  # type: ignore[return-value]
        except Exception:
            return False

    async def close(self) -> None:
        await self._client.aclose()


# Module-level client — created once.
_redis_client: RedisClient | None = None


def get_redis_client() -> RedisClient:
    global _redis_client
    if _redis_client is None:
        _redis_client = RedisClient.from_settings()
    return _redis_client
