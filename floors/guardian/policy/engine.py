"""Expanded Deterministic Policy Engine for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

import re
from typing import List, Optional

import structlog

from factoryos.guardian.capabilities.registry import CapabilityRegistry
from factoryos.guardian.contracts.decision import DecisionActionType, GuardianDecisionProposal
from factoryos.guardian.contracts.guardian_state import GuardianState
from factoryos.guardian.policy.models import PolicyResult, PolicySeverity

logger = structlog.get_logger(__name__)

FORBIDDEN_SYSTEM_PATTERN = re.compile(r"\b(shell|exec|system|sudo|eval|file_delete|raw_socket)\b", re.IGNORECASE)
SECRET_EXPOSURE_PATTERN = re.compile(r"(api[_-]?key|secret|password|bearer\s+[a-z0-9_\-\.]+)", re.IGNORECASE)


class PolicyEngine:
    """Evaluates deterministic policy rules before authorizing any Guardian action."""

    def __init__(self, registry: CapabilityRegistry):
        self.registry = registry

    def evaluate_proposal(self, state: GuardianState, proposal: GuardianDecisionProposal) -> List[PolicyResult]:
        """Evaluate mandatory security, capability, budget, secret isolation, and cross-floor policies."""
        results: List[PolicyResult] = []

        # 1. POLICY_MAX_STEPS
        if state.step_count >= state.max_steps:
            results.append(
                PolicyResult(
                    allowed=False,
                    policy_id="POLICY_MAX_STEPS",
                    severity=PolicySeverity.FATAL,
                    reason=f"Step limit of {state.max_steps} exceeded (current step {state.step_count}).",
                )
            )

        # 2. POLICY_MAX_RETRIES
        if state.failure_count > state.max_retries:
            results.append(
                PolicyResult(
                    allowed=False,
                    policy_id="POLICY_MAX_RETRIES",
                    severity=PolicySeverity.FATAL,
                    reason=f"Failure limit of {state.max_retries} exceeded (failures: {state.failure_count}).",
                )
            )

        # 3. POLICY_BUDGET_NOT_EXCEEDED (LLM Calls Budget)
        if state.llm_call_count > 20:
            results.append(
                PolicyResult(
                    allowed=False,
                    policy_id="POLICY_BUDGET_NOT_EXCEEDED",
                    severity=PolicySeverity.FATAL,
                    reason="LLM call budget limit of 20 queries exceeded.",
                )
            )

        # 4. POLICY_CAPABILITY_AUTHORIZED / POLICY_WORKER_AUTHORIZED
        if proposal.action_type == DecisionActionType.RUN_WORKER:
            target = proposal.target_worker or proposal.target_capability
            if not target:
                results.append(
                    PolicyResult(
                        allowed=False,
                        policy_id="POLICY_CAPABILITY_AUTHORIZED",
                        severity=PolicySeverity.FATAL,
                        reason="RUN_WORKER decision missing target_worker or target_capability.",
                    )
                )
            elif not self.registry.is_registered(target):
                results.append(
                    PolicyResult(
                        allowed=False,
                        policy_id="POLICY_WORKER_AUTHORIZED",
                        severity=PolicySeverity.FATAL,
                        reason=f"Requested worker capability '{target}' is not registered in the allowlist registry.",
                    )
                )
            else:
                cap = self.registry.get(target)
                if cap.floor_id != state.floor_id:
                    results.append(
                        PolicyResult(
                            allowed=False,
                            policy_id="POLICY_NO_CROSS_FLOOR_MUTATION",
                            severity=PolicySeverity.FATAL,
                            reason=f"Cross-floor mutation attempt rejected: Capability '{target}' belongs to '{cap.floor_id}', active floor is '{state.floor_id}'.",
                        )
                    )

        # 5. POLICY_ZERO_TOOL_PRIVILEGE
        for key in [proposal.target_worker, proposal.target_capability, proposal.reasoning_summary]:
            if key and FORBIDDEN_SYSTEM_PATTERN.search(key):
                results.append(
                    PolicyResult(
                        allowed=False,
                        policy_id="POLICY_ZERO_TOOL_PRIVILEGE",
                        severity=PolicySeverity.FATAL,
                        reason=f"Forbidden system keyword detected in proposal: '{key}'. System command execution forbidden.",
                    )
                )

        # 6. POLICY_NO_SECRET_EXPOSURE
        for key in [proposal.reasoning_summary, proposal.expected_outcome, str(proposal.parameters)]:
            if key and SECRET_EXPOSURE_PATTERN.search(key):
                results.append(
                    PolicyResult(
                        allowed=False,
                        policy_id="POLICY_NO_SECRET_EXPOSURE",
                        severity=PolicySeverity.FATAL,
                        reason=f"Potential credential or secret pattern detected in proposal string: '{key}'.",
                    )
                )

        # 7. POLICY_PROVENANCE_REQUIRED
        if not proposal.reasoning_summary or len(proposal.reasoning_summary.strip()) < 5:
            results.append(
                PolicyResult(
                    allowed=False,
                    policy_id="POLICY_PROVENANCE_REQUIRED",
                    severity=PolicySeverity.FATAL,
                    reason="Reasoning summary must be provided and at least 5 characters long for provenance audit.",
                )
            )

        # Default pass if no failures
        if not results:
            results.append(
                PolicyResult(
                    allowed=True,
                    policy_id="POLICY_ALL_CHECKS_PASSED",
                    severity=PolicySeverity.INFO,
                    reason="All deterministic policy rules satisfied.",
                )
            )

        return results
