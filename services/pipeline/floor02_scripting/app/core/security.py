"""Security and sanitization utilities for Floor 02 (Scripting & Narrative).

Implements input text sanitization, API key authentication, and token bucket rate limiting.
Note: Input sanitization and XML data framing form input hygiene, NOT complete prompt injection prevention.
Full prompt injection resilience requires defense in depth (input validation, strict output schema parsing, least privilege, zero tools).
"""

from __future__ import annotations

import re
import time
from typing import Dict

from fastapi import Header, HTTPException, status

from floors.floor02_scripting.app.core.config import settings


def sanitize_input_text(text: str) -> str:
    """Sanitize raw input text by stripping HTML tags, control characters, and common injection patterns."""
    if not text:
        return ""

    # Strip HTML tags
    cleaned = re.sub(r"<[^>]*>", "", text)

    # Strip non-printable ASCII control characters (keep standard newlines and tabs)
    cleaned = "".join(ch for ch in cleaned if ord(ch) >= 32 or ch in ("\n", "\r", "\t"))

    # Strip direct prompt injection keywords
    injection_patterns = [
        r"(?i)ignore\s+all\s+previous\s+instructions",
        r"(?i)disregard\s+the\s+previous\s+message",
        r"(?i)you\s+are\s+now\s+operating\s+in\s+developer\s+mode",
        r"(?i)system\s+prompt\s+override",
    ]
    for pattern in injection_patterns:
        cleaned = re.sub(pattern, "[SANITIZED_PROMPT_INJECTION_ATTEMPT]", cleaned)

    return cleaned.strip()


class TokenBucketRateLimiter:
    """Single-node in-process token bucket rate limiter."""

    def __init__(self, rate_per_minute: int = settings.RATE_LIMIT_REQUESTS_PER_MINUTE) -> None:
        self.capacity = rate_per_minute
        self.fill_rate = rate_per_minute / 60.0
        self._buckets: Dict[str, float] = {}
        self._last_update: Dict[str, float] = {}

    def is_allowed(self, client_id: str) -> bool:
        now = time.time()
        last_time = self._last_update.get(client_id, now)
        tokens = self._buckets.get(client_id, float(self.capacity))

        # Replenish tokens based on elapsed time
        elapsed = now - last_time
        tokens = min(float(self.capacity), tokens + elapsed * self.fill_rate)
        self._last_update[client_id] = now

        if tokens >= 1.0:
            self._buckets[client_id] = tokens - 1.0
            return True
        else:
            self._buckets[client_id] = tokens
            return False


rate_limiter = TokenBucketRateLimiter()


def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")) -> str:
    """Dependency to verify X-API-Key header against configured settings."""
    if x_api_key != settings.DEFAULT_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header",
        )
    return x_api_key
