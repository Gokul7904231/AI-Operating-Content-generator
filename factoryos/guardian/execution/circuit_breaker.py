"""Circuit Breaker for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

import time
from enum import Enum
from typing import Optional

import structlog

from factoryos.guardian.core.exceptions import GuardianCircuitError

logger = structlog.get_logger(__name__)


class CircuitState(str, Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreaker:
    """Circuit Breaker to prevent cascade failures against external providers or capabilities."""

    def __init__(self, failure_threshold: int = 3, recovery_cooldown_seconds: float = 10.0):
        self.failure_threshold = failure_threshold
        self.recovery_cooldown_seconds = recovery_cooldown_seconds

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None

    def allow_execution(self) -> bool:
        """Check if execution is permitted under current circuit state."""
        now = time.time()
        if self.state == CircuitState.OPEN:
            if self.last_failure_time and (now - self.last_failure_time) > self.recovery_cooldown_seconds:
                logger.info("circuit_breaker_transition_half_open")
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        return True

    def record_success(self) -> None:
        """Record successful execution."""
        if self.state in (CircuitState.HALF_OPEN, CircuitState.OPEN):
            logger.info("circuit_breaker_transition_closed")
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            self.last_failure_time = None

    def record_failure(self) -> None:
        """Record failed execution."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            logger.warning("circuit_breaker_transition_open", failure_count=self.failure_count)
            self.state = CircuitState.OPEN
