"""Exceptions for FactoryOS Autonomous Guardian System."""

from __future__ import annotations


class GuardianError(Exception):
    """Base exception for all Guardian errors."""


class GuardianStateError(GuardianError):
    """Raised on illegal state transitions or state corruption."""


class GuardianPolicyError(GuardianError):
    """Raised when an action violates deterministic policy."""


class GuardianCapabilityError(GuardianError):
    """Raised on capability registration or authorization failures."""


class GuardianSecurityError(GuardianError):
    """Raised on security boundary violations or prompt injection attempts."""


class GuardianCircuitError(GuardianError):
    """Raised when circuit breaker prevents execution."""


class GuardianTimeoutError(GuardianError):
    """Raised when action execution exceeds time limit."""


class GuardianRecoveryError(GuardianError):
    """Raised when recovery limit is exceeded or recovery fails."""


class GuardianValidationError(GuardianError):
    """Raised on schema or contract validation failure."""
