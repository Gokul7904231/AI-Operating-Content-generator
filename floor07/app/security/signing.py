"""Certificate signing and verification using HMAC-SHA256.

The signing key never leaves the process.  All certificates produced by
Floor 07 carry a detached ``signature`` field that any consumer can verify
using the floor's public signing key endpoint (future work).
"""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from app.core.exceptions import SigningError


def _canonical_json(payload: dict[str, Any]) -> bytes:
    """Produce deterministic, sorted JSON bytes from a dict."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode()


def sign_certificate(payload: dict[str, Any], secret_key: str) -> str:
    """Return a hex-encoded HMAC-SHA256 signature over the canonical payload.

    Args:
        payload: The certificate payload dict (must be JSON-serialisable).
        secret_key: The signing secret from settings.

    Returns:
        Hex-encoded HMAC-SHA256 digest string.

    Raises:
        SigningError: If signing fails for any reason.
    """
    try:
        canonical = _canonical_json(payload)
        mac = hmac.new(secret_key.encode(), canonical, hashlib.sha256)
        return mac.hexdigest()
    except Exception as exc:
        raise SigningError(
            "Failed to sign certificate payload",
            detail=str(exc),
        ) from exc


def verify_certificate(payload: dict[str, Any], signature: str, secret_key: str) -> bool:
    """Verify a certificate signature.  Returns True if valid, False otherwise.

    This uses ``hmac.compare_digest`` to prevent timing attacks.
    """
    try:
        canonical = _canonical_json(payload)
        mac = hmac.new(secret_key.encode(), canonical, hashlib.sha256)
        expected = mac.hexdigest()
        return hmac.compare_digest(expected, signature)
    except Exception:
        return False


def hash_payload(payload: dict[str, Any]) -> str:
    """Return a SHA-256 hex digest of the canonical payload (for the cert hash field)."""
    canonical = _canonical_json(payload)
    return hashlib.sha256(canonical).hexdigest()
