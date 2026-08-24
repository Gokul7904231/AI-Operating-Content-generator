"""Abstract port: EventBus.

Defines the internal event bus interface for Floor07.
Sprint 1: Events are logged only (structlog).
Sprint 2: Replace with a real async pub/sub bus (Redis Streams, NATS, etc.)

This interface ensures all Floors in FactoryOS use the same event contract.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import Any


class AbstractEventBus(ABC):
    """Internal domain event bus.

    Workers and the pipeline publish domain events.
    The Overseer and Guardian subscribe to consume them.
    """

    @abstractmethod
    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        """Publish a domain event to all subscribers."""
        ...

    @abstractmethod
    async def subscribe(self, event_type: str, handler: Callable[..., Any]) -> None:
        """Register an async handler for a specific event type."""
        ...


class LoggingEventBus(AbstractEventBus):
    """Sprint 1 implementation: publishes events as structured log entries.

    Swap this for a Redis Streams or NATS implementation in Sprint 2.
    """

    import structlog as _structlog
    _log = _structlog.get_logger("event_bus")

    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        self._log.info("domain_event", event_type=event_type, **payload)

    async def subscribe(self, event_type: str, handler: Callable[..., Any]) -> None:
        # Sprint 1: subscriptions are no-ops (events are fire-and-forget logs)
        pass


# Module-level singleton — replace in Sprint 2
_event_bus: AbstractEventBus = LoggingEventBus()


def get_event_bus() -> AbstractEventBus:
    return _event_bus
