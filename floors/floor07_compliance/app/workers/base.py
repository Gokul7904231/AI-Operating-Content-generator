"""Abstract base worker.

Every worker receives a typed ``WorkerInput`` and returns a typed
``WorkerResult``.  Workers are stateless pure-async functions wrapped in a
class for dependency injection.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class WorkerInput:
    """Data passed into every worker in the pipeline."""

    artifact_id: str
    pipeline_run_id: str
    title: str
    script: str
    metadata: dict[str, Any]
    platform: str
    language: str
    content_type: str


@dataclass
class WorkerResult:
    """Standardised output from every worker."""

    worker_id: str
    passed: bool
    score: float  # 0.0 (worst) – 1.0 (best)
    details: dict[str, Any] = field(default_factory=dict)
    issues: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)


class BaseWorker(ABC):
    """All pipeline workers implement this interface."""

    worker_id: str = "base_worker"

    @abstractmethod
    async def run(self, inp: WorkerInput) -> WorkerResult:
        """Execute the worker and return a result."""
