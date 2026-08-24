"""Privilege Limiter for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from typing import Any, Dict
from factoryos.guardian.core.exceptions import GuardianSecurityError


class PrivilegeLimiter:
    """Enforces zero-tool privilege boundary outside the LLM."""

    FORBIDDEN_CAPABILITIES = {"shell", "system", "exec", "eval", "sudo", "file_delete", "network_raw"}

    @classmethod
    def validate_capability_privilege(cls, capability_name: str) -> None:
        """Reject execution if capability name attempts forbidden system privileges."""
        if capability_name.lower() in cls.FORBIDDEN_CAPABILITIES:
            raise GuardianSecurityError(
                f"Forbidden capability '{capability_name}' rejected by PrivilegeLimiter. Zero system privileges granted."
            )
