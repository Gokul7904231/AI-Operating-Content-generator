"""Master Guardian Engine for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

import structlog

from factoryos.guardian.capabilities.registry import CapabilityRegistry
from factoryos.guardian.contracts.action import ActionRequest
from factoryos.guardian.contracts.decision import DecisionActionType, GuardianDecision, GuardianDecisionProposal, ReasonCategory
from factoryos.guardian.contracts.guardian_report import GuardianReport
from factoryos.guardian.contracts.guardian_state import ExecutionMode, GuardianLifecycleState, GuardianState
from factoryos.guardian.contracts.worker_result import ExecutionStatus, WorkerResult
from factoryos.guardian.core.exceptions import GuardianError, GuardianStateError, GuardianValidationError
from factoryos.guardian.core.state_machine import GuardianStateMachine
from factoryos.guardian.execution.circuit_breaker import CircuitBreaker
from factoryos.guardian.execution.runner import WorkerRunner
from factoryos.guardian.execution.transaction import TransactionalActionGate
from factoryos.guardian.memory.provenance import ProvenanceMemory, ProvenanceRecord
from factoryos.guardian.memory.working import WorkingMemory
from factoryos.guardian.policy.engine import PolicyEngine
from factoryos.guardian.reasoning.base import ReasoningEngine
from factoryos.guardian.reasoning.hybrid import HybridReasoningEngine
from factoryos.guardian.recovery.engine import RecoveryEngine, RecoveryStrategy
from factoryos.guardian.security.privilege import PrivilegeLimiter
from factoryos.guardian.verification.validator import DomainValidator

logger = structlog.get_logger(__name__)


class GuardianEngine:
    """Core autonomous Guardian Kernel orchestrating perception, policy, execution, domain verification, transactional safety, and recovery."""

    def __init__(
        self,
        floor_id: str,
        registry: CapabilityRegistry,
        reasoning_engine: Optional[ReasoningEngine] = None,
        policy_engine: Optional[PolicyEngine] = None,
        circuit_breaker: Optional[CircuitBreaker] = None,
    ):
        self.floor_id = floor_id
        self.registry = registry
        self.reasoning_engine = reasoning_engine or HybridReasoningEngine()
        self.policy_engine = policy_engine or PolicyEngine(self.registry)
        self.circuit_breaker = circuit_breaker or CircuitBreaker()

        self.runner = WorkerRunner(self.registry, self.circuit_breaker)
        self.transaction_gate = TransactionalActionGate()
        self.recovery_engine = RecoveryEngine()
        self.provenance_memory = ProvenanceMemory()

    def run_autonomous_loop(
        self,
        request_id: str,
        objective: str,
        input_contract_hash: str,
        initial_context: Dict[str, Any],
        max_steps: int = 10,
        execution_mode: ExecutionMode = ExecutionMode.HYBRID,
    ) -> GuardianReport:
        """Execute complete autonomous Guardian decision and execution loop."""
        start_time = time.time()
        logger.info("guardian_autonomous_loop_started", floor_id=self.floor_id, request_id=request_id)

        # 1. State Machine Initialization
        initial_state = GuardianState(
            request_id=request_id,
            floor_id=self.floor_id,
            objective=objective,
            input_contract_hash=input_contract_hash,
            max_steps=max_steps,
            execution_mode=execution_mode,
        )
        sm = GuardianStateMachine(initial_state)
        working_memory = WorkingMemory(sm.state)
        working_memory.context = initial_context

        sm.transition_to(GuardianLifecycleState.VALIDATING, "Validating input parameters")
        sm.transition_to(GuardianLifecycleState.READY, "Input validated, ready for execution loop")

        decisions_history: List[Dict[str, Any]] = []
        worker_results_history: List[Dict[str, Any]] = []
        warnings: List[str] = []
        errors: List[str] = []

        # Audit initial readiness
        self.provenance_memory.add_record(
            ProvenanceRecord(
                evidence_type="GUARDIAN_INITIALIZED",
                floor_id=self.floor_id,
                execution_id=str(sm.state.execution_id),
                source_identifier="GuardianEngine",
                method="run_autonomous_loop",
                summary=f"Initialized Guardian loop for {self.floor_id}.",
                raw_data={"request_id": request_id, "objective": objective},
            )
        )

        # 2. Main Autonomous Loop
        while sm.state.lifecycle_state not in (
            GuardianLifecycleState.COMPLETED,
            GuardianLifecycleState.FAILED,
            GuardianLifecycleState.ESCALATED,
            GuardianLifecycleState.CANCELLED,
        ):
            sm.state.step_count += 1
            if sm.state.step_count > sm.state.max_steps:
                logger.warning("guardian_step_limit_reached", max_steps=sm.state.max_steps)
                sm.transition_to(GuardianLifecycleState.FAILED, f"Exceeded max steps ({sm.state.max_steps}).")
                errors.append(f"Exceeded max steps limit of {sm.state.max_steps}.")
                break

            if sm.state.lifecycle_state != GuardianLifecycleState.PLANNING:
                sm.transition_to(GuardianLifecycleState.PLANNING, f"Planning step {sm.state.step_count}")

            # A. PERCEIVE & PROPOSE DECISION
            available_caps = self.registry.list_capabilities()
            proposal = self.reasoning_engine.propose(sm.state, available_caps, working_memory.context)
            sm.transition_to(GuardianLifecycleState.DECISION_PENDING, f"Proposed action '{proposal.action_type.value}'")

            # B. POLICY EVALUATION
            policy_results = self.policy_engine.evaluate_proposal(sm.state, proposal)
            disallowed = [p for p in policy_results if not p.allowed]

            if disallowed:
                reason_str = "; ".join(p.reason for p in disallowed)
                logger.warning("guardian_decision_policy_rejected", reason=reason_str)
                warnings.append(f"Decision policy rejected: {reason_str}")
                sm.state.failure_count += 1

                rec_strat = self.recovery_engine.classify_and_resolve(sm.state, working_memory.get_last_result())
                if rec_strat == RecoveryStrategy.ESCALATE:
                    sm.transition_to(GuardianLifecycleState.ESCALATED, f"Policy violation recovery limit reached: {reason_str}")
                    errors.append(f"Escalated due to repeated policy violations: {reason_str}")
                    break
                else:
                    sm.transition_to(GuardianLifecycleState.RECOVERING, f"Recovering from policy rejection: {reason_str}")
                    sm.transition_to(GuardianLifecycleState.PLANNING, "Retrying planning after recovery")
                    continue

            # C. DECISION VALIDATION & AUTHORIZATION (STRUCTURED DECISION RECORD)
            target_name = proposal.target_worker or proposal.target_capability or proposal.action_type.value
            validated_decision = GuardianDecision(
                execution_id=sm.state.execution_id,
                floor_id=self.floor_id,
                objective=sm.state.objective,
                action_type=proposal.action_type,
                target_capability=proposal.target_capability,
                target_worker=proposal.target_worker,
                observation=f"Step {sm.state.step_count}: {len(sm.state.completed_actions)} actions completed.",
                candidate_actions=[c.name for c in available_caps],
                rejected_actions=[{"policy_id": p.policy_id, "reason": p.reason} for p in disallowed],
                selected_action=target_name,
                selection_reason=proposal.reasoning_summary,
                reason_category=proposal.reason_category,
                reasoning_summary=proposal.reasoning_summary,
                expected_outcome=proposal.expected_outcome,
                fallback_action=proposal.fallback_action,
                parameters=proposal.parameters,
                policy_ids=[p.policy_id for p in policy_results],
                policy_checks=[p.model_dump() for p in policy_results],
            )
            decisions_history.append(validated_decision.model_dump())

            if proposal.action_type == DecisionActionType.COMPLETE:
                sm.transition_to(GuardianLifecycleState.ACTION_AUTHORIZED, "Completion decision authorized")
                sm.transition_to(GuardianLifecycleState.EXECUTING, "Executing completion finalize")
                sm.transition_to(GuardianLifecycleState.OBSERVING, "Observing final outputs")
                sm.transition_to(GuardianLifecycleState.VERIFYING, "Verifying completion invariants")

                # Verify domain invariants on handoff payload if present
                if "handoff_payload" in working_memory.context:
                    try:
                        h_dict = working_memory.context["handoff_payload"]
                        if self.floor_id == "floor01":
                            DomainValidator.verify_floor01_output(h_dict)
                        elif self.floor_id == "floor02":
                            DomainValidator.verify_floor02_output(h_dict)
                        elif self.floor_id == "floor03":
                            DomainValidator.verify_floor03_output(h_dict)
                    except GuardianValidationError as exc:
                        logger.error("domain_verification_failed", error=str(exc))
                        sm.transition_to(GuardianLifecycleState.FAILED, f"Domain verification failed: {exc}")
                        errors.append(str(exc))
                        break

                sm.transition_to(GuardianLifecycleState.COMPLETED, "Objective satisfied completely.")
                break

            target_name = proposal.target_worker or proposal.target_capability
            if not target_name:
                sm.transition_to(GuardianLifecycleState.FAILED, "Missing target capability name.")
                errors.append("Action decision missing target capability.")
                break

            # Security privilege check
            try:
                PrivilegeLimiter.validate_capability_privilege(target_name)
            except Exception as exc:
                sm.transition_to(GuardianLifecycleState.FAILED, f"Privilege violation: {exc}")
                errors.append(str(exc))
                break

            # D. TRANSACTIONAL ACTION AUTHORIZATION & PREPARATION
            action_req = ActionRequest(
                execution_id=sm.state.execution_id,
                decision_id=validated_decision.decision_id,
                floor_id=self.floor_id,
                capability_name=target_name,
                target_worker=target_name,
                parameters=proposal.parameters,
            )
            sm.transition_to(GuardianLifecycleState.ACTION_AUTHORIZED, f"Action '{target_name}' authorized")

            tx = self.transaction_gate.prepare_transaction(action_req, preconditions={"completed_count": len(sm.state.completed_actions)})

            # E. EXECUTION & OBSERVATION
            sm.transition_to(GuardianLifecycleState.EXECUTING, f"Running worker '{target_name}'")
            worker_res = self.runner.execute_action(action_req, working_memory.context)
            working_memory.add_worker_result(worker_res)
            worker_results_history.append(worker_res.model_dump())

            sm.transition_to(GuardianLifecycleState.OBSERVING, f"Observing result for '{target_name}'")

            # F. VERIFICATION, COMMIT & RECOVERY
            sm.transition_to(GuardianLifecycleState.VERIFYING, f"Verifying output of '{target_name}'")

            if worker_res.status == ExecutionStatus.SUCCESS:
                self.transaction_gate.commit_transaction(tx.transaction_id, postconditions={"duration_ms": worker_res.duration_ms})
                sm.state.completed_actions.append(target_name)
                working_memory.context.update(worker_res.output_data)

                self.provenance_memory.add_record(
                    ProvenanceRecord(
                        evidence_type="GUARDIAN_ACTION_SUCCESS",
                        floor_id=self.floor_id,
                        execution_id=str(sm.state.execution_id),
                        source_identifier=target_name,
                        method="execute_action",
                        summary=f"Worker capability '{target_name}' committed successfully in {worker_res.duration_ms}ms.",
                        raw_data={"duration_ms": worker_res.duration_ms, "transaction_id": str(tx.transaction_id)},
                    )
                )
                sm.transition_to(GuardianLifecycleState.READY, f"Worker '{target_name}' completed. Ready for next step.")
            else:
                err_msg = worker_res.error_message or "Worker execution failed."
                self.transaction_gate.rollback_transaction(tx.transaction_id, err_msg)
                sm.state.failure_count += 1
                logger.warning("guardian_worker_failed", target=target_name, error=err_msg)
                warnings.append(f"Worker '{target_name}' failed: {err_msg}")

                rec_strat = self.recovery_engine.classify_and_resolve(sm.state, worker_res)
                if rec_strat == RecoveryStrategy.ESCALATE:
                    sm.transition_to(GuardianLifecycleState.ESCALATED, f"Worker failure escalation limit reached: {err_msg}")
                    errors.append(f"Escalated following failure of '{target_name}': {err_msg}")
                    break
                else:
                    sm.state.recovery_count += 1
                    sm.transition_to(GuardianLifecycleState.RECOVERING, f"Recovering strategy {rec_strat.value}")
                    sm.transition_to(GuardianLifecycleState.PLANNING, "Retrying planning step")

        # 3. Construct Final Guardian Report
        duration_ms = round((time.time() - start_time) * 1000.0, 2)
        report = GuardianReport(
            execution_id=sm.state.execution_id,
            request_id=request_id,
            floor_id=self.floor_id,
            started_at=datetime.fromtimestamp(start_time, tz=timezone.utc),
            duration_ms=duration_ms,
            status=sm.state.lifecycle_state,
            execution_mode=sm.state.execution_mode,
            step_count=sm.state.step_count,
            decision_count=len(decisions_history),
            action_count=len(worker_results_history),
            retry_count=sm.state.failure_count,
            recovery_count=sm.state.recovery_count,
            worker_results=worker_results_history,
            decisions=decisions_history,
            provenance_audit=[r.model_dump() for r in self.provenance_memory.get_records()],
            warnings=warnings,
            errors=errors,
            handoff_payload=working_memory.context.get("handoff_payload"),
            handoff_reference={"execution_id": str(sm.state.execution_id), "status": sm.state.lifecycle_state.value},
        )

        logger.info(
            "guardian_autonomous_loop_completed",
            floor_id=self.floor_id,
            status=report.status.value,
            duration_ms=duration_ms,
        )
        return report
