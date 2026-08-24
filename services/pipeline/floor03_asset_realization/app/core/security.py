"""Security controls for Floor 03 (Asset Specification & Realization Planning)."""

from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import Header, HTTPException

from floors.floor03_asset_realization.app.core.config import settings
from floors.floor03_asset_realization.app.core.exceptions import Floor03SecurityError


def sanitize_input_text(text: str) -> str:
    """Sanitize prompt text and metadata against HTML script tags, control chars, and direct injection phrases."""
    if not text:
        return ""

    # Remove script and style tags
    clean = re.sub(r"<(script|style|iframe)[^>]*>.*?</\1>", "", text, flags=re.IGNORECASE | re.DOTALL)
    clean = re.sub(r"<[^>]+>", "", clean)

    # Strip dangerous injection command patterns
    injection_patterns = [
        r"IGNORE ALL PREVIOUS INSTRUCTIONS",
        r"DISREGARD SYSTEM PROMPTS",
        r"EXECUTE COMMAND",
        r"DROP DATABASE",
    ]
    for pattern in injection_patterns:
        clean = re.sub(pattern, "", clean, flags=re.IGNORECASE)

    # Strip non-printable control characters
    clean = "".join(char for char in clean if ord(char) >= 32 or char in "\n\r\t")
    return clean.strip()


def validate_workspace_path(path_str: str, workspace_root: Path) -> Path:
    """Validate that local file path reference resolves safely within workspace root boundaries."""
    resolved = Path(path_str).resolve()
    resolved_root = workspace_root.resolve()
    if not resolved.is_relative_to(resolved_root):
        raise Floor03SecurityError(f"Path traversal security violation: {path_str} is outside workspace boundary.")
    return resolved


class TokenBucketRateLimiter:
    """In-process token bucket rate limiter per client key."""

    def __init__(self, rate_per_minute: int = 60, burst_capacity: int = 10):
        self.rate_per_second = rate_per_minute / 60.0
        self.burst_capacity = burst_capacity
        self.tokens: Dict[str, float] = {}
        self.last_update: Dict[str, float] = {}

    def is_allowed(self, client_id: str) -> bool:
        now = time.time()
        if client_id not in self.tokens:
            self.tokens[client_id] = float(self.burst_capacity)
            self.last_update[client_id] = now

        elapsed = now - self.last_update[client_id]
        self.tokens[client_id] = min(
            float(self.burst_capacity),
            self.tokens[client_id] + elapsed * self.rate_per_second,
        )
        self.last_update[client_id] = now

        if self.tokens[client_id] >= 1.0:
            self.tokens[client_id] -= 1.0
            return True
        return False


_global_limiter = TokenBucketRateLimiter(rate_per_minute=120, burst_capacity=20)


def verify_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """FastAPI dependency verifying API key and rate limiting."""
    if not x_api_key or x_api_key != settings.DEFAULT_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key authentication header.")
    if not _global_limiter.is_allowed(x_api_key):
        raise HTTPException(status_code=429, detail="Rate limit exceeded for Floor 03 microservice.")
    return x_api_key
