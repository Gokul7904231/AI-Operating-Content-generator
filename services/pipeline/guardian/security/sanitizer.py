"""Security Sanitizer for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

import re

INJECTION_KEYWORDS = [
    r"IGNORE\s+ALL\s+PREVIOUS\s+INSTRUCTIONS",
    r"SYSTEM\s+PROMPT\s+OVERRIDE",
    r"GRANT\s+ADMIN",
    r"BYPASS\s+POLICY",
]


def sanitize_input_text(text: str) -> str:
    """Sanitize input string against script tags, HTML injection, and prompt injection attempt keywords."""
    if not text:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]*>", "", text)
    # Strip prompt injection keywords
    for pattern in INJECTION_KEYWORDS:
        cleaned = re.sub(pattern, "[FILTERED_SECURITY_PATTERN]", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()
