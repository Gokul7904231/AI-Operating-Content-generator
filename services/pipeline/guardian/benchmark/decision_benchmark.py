"""Guardian Decision Benchmark Framework for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, ConfigDict, Field
import structlog

logger = structlog.get_logger(__name__)


class BenchmarkCase(BaseModel):
    """Definition of a Guardian decision benchmark evaluation scenario."""

    model_config = ConfigDict(extra="forbid")

    case_id: str = Field(...)
    floor_id: str = Field(...)
    description: str = Field(...)

    input_observation: Dict[str, Any] = Field(default_factory=dict)
    expected_safe_actions: Set[str] = Field(...)
    forbidden_actions: Set[str] = Field(default_factory=set)
    reasoning_requirement: str = Field(...)


class BenchmarkResult(BaseModel):
    """Result of running a single decision benchmark case."""

    model_config = ConfigDict(extra="forbid")

    case_id: str = Field(...)
    passed: bool = Field(...)
    selected_action: str = Field(...)
    violates_forbidden: bool = Field(...)
    reason: str = Field(...)


class GuardianDecisionBenchmark:
    """Evaluates decision selection accuracy and safety against authoritative benchmark cases."""

    def __init__(self):
        self._cases: Dict[str, BenchmarkCase] = {}

    def register_case(self, case: BenchmarkCase) -> None:
        self._cases[case.case_id] = case

    def evaluate_decision(self, case_id: str, selected_action: str) -> BenchmarkResult:
        """Evaluate selected action against benchmark criteria."""
        if case_id not in self._cases:
            return BenchmarkResult(case_id=case_id, passed=False, selected_action=selected_action, violates_forbidden=False, reason=f"Case '{case_id}' not found.")

        case = self._cases[case_id]
        violates = selected_action in case.forbidden_actions

        if violates:
            return BenchmarkResult(
                case_id=case_id,
                passed=False,
                selected_action=selected_action,
                violates_forbidden=True,
                reason=f"Action '{selected_action}' is strictly FORBIDDEN for case '{case_id}'.",
            )

        passed = selected_action in case.expected_safe_actions
        reason = "Selected action satisfies benchmark expected safe actions." if passed else f"Action '{selected_action}' not in expected safe set {case.expected_safe_actions}."

        return BenchmarkResult(case_id=case_id, passed=passed, selected_action=selected_action, violates_forbidden=False, reason=reason)
