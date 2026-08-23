"""Working Memory for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from factoryos.guardian.contracts.guardian_state import GuardianState
from factoryos.guardian.contracts.worker_result import WorkerResult


class WorkingMemory:
    """In-memory active execution state and worker output cache."""

    def __init__(self, state: GuardianState):
        self.state = state
        self.worker_results: List[WorkerResult] = []
        self.context: Dict[str, Any] = {}

    def add_worker_result(self, result: WorkerResult) -> None:
        self.worker_results.append(result)

    def get_last_result(self) -> Optional[WorkerResult]:
        return self.worker_results[-1] if self.worker_results else None
