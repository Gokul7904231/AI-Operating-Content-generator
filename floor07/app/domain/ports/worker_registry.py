"""Abstract port: WorkerRegistry.

Defines the interface that a concrete WorkerRegistry must implement.
Sprint 1: Workers are hardcoded in the pipeline.
Sprint 2: Replace with a registry that auto-discovers and loads workers.

All subsequent Floor services should implement this same port.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.workers.base import BaseWorker


class AbstractWorkerRegistry(ABC):
    """Plugin registry for pipeline workers.

    Workers register themselves by ID.  The pipeline queries the registry
    instead of instantiating workers directly.  This makes adding new workers
    (e.g., CopyrightWorker, AIDetectionWorker, SEOWorker) a pure configuration
    change — no pipeline code modifications required.
    """

    @abstractmethod
    def register(self, worker: BaseWorker) -> None:
        """Register a worker instance."""
        ...

    @abstractmethod
    def get_worker(self, worker_id: str) -> BaseWorker | None:
        """Return the worker for the given ID, or None if not registered."""
        ...

    @abstractmethod
    def get_all_workers(self) -> list[BaseWorker]:
        """Return all registered workers in execution order."""
        ...

    @abstractmethod
    def worker_ids(self) -> list[str]:
        """Return IDs of all registered workers."""
        ...
