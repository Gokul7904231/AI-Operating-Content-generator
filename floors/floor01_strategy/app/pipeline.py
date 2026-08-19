"""Floor 01 Pipeline (Vertical Slice Orchestration).

Orchestrates the logical workers:
Input -> Topic Intelligence -> Strategy -> Content Planning -> Curriculum Mapping -> Floor01HandoffPayload + FloorExecutionReport.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Tuple

import structlog

from floors.floor01_strategy.app.core.config import get_settings
from floors.floor01_strategy.app.core.exceptions import (
    DuplicateTopicError,
    Floor01ValidationError,
    LowConfidenceError,
    StrategyPipelineError,
)
from floors.floor01_strategy.app.domain.handoff import (
    ExecutionMode,
    ExecutionModeDetails,
    Floor01HandoffPayload,
    Floor01Input,
    FloorExecutionReport,
    HandoffStatus,
    UniquenessVerdict,
    WorkerExecutionSummary,
)
from floors.floor01_strategy.app.infrastructure.llm_provider import LLMStrategyAdapter
from floors.floor01_strategy.app.infrastructure.memory_store import StrategyMemoryStore
from floors.floor01_strategy.app.logical_workers.content_planner import ContentPlannerWorker
from floors.floor01_strategy.app.logical_workers.curriculum_mapper import CurriculumMapperWorker
from floors.floor01_strategy.app.logical_workers.strategy_planner import StrategyPlannerWorker
from floors.floor01_strategy.app.logical_workers.topic_intelligence import TopicIntelligenceWorker

logger = structlog.get_logger(__name__)


def calculate_decision_quality_score(
    topic_prov: list, strategy_prov: list, content_prov: list, curriculum_prov: list
) -> float:
    """Calculate defined weighted heuristic decision quality score.
    
    Formula:
      Score = w_topic * c_topic + w_strategy * c_strategy + w_content * c_content + w_curriculum * c_curriculum
    Weights:
      w_topic = 0.30, w_strategy = 0.25, w_content = 0.25, w_curriculum = 0.20
    """
    c_topic = sum(p.confidence_score for p in topic_prov) / max(1, len(topic_prov))
    c_strat = sum(p.confidence_score for p in strategy_prov) / max(1, len(strategy_prov))
    c_content = sum(p.confidence_score for p in content_prov) / max(1, len(content_prov))
    c_curr = sum(p.confidence_score for p in curriculum_prov) / max(1, len(curriculum_prov))

    score = 0.30 * c_topic + 0.25 * c_strat + 0.25 * c_content + 0.20 * c_curr
    return round(score, 4)


class Floor01Pipeline:
    """Orchestrates the execution of Floor 01 logical workers to produce handoff payload and Overseer report."""

    def __init__(
        self,
        memory_store: Optional[StrategyMemoryStore] = None,
        llm_adapter: Optional[LLMStrategyAdapter] = None,
    ) -> None:
        self.memory_store = memory_store or StrategyMemoryStore()
        self.llm_adapter = llm_adapter or LLMStrategyAdapter()
        self.topic_worker = TopicIntelligenceWorker(memory_store=self.memory_store)
        self.strategy_worker = StrategyPlannerWorker()
        self.content_worker = ContentPlannerWorker()
        self.curriculum_worker = CurriculumMapperWorker()

    def execute_with_report(
        self, inp: Floor01Input, strict_rejection: bool = False
    ) -> Tuple[Floor01HandoffPayload, FloorExecutionReport]:
        start_time = time.time()
        started_at = datetime.now(timezone.utc).isoformat()
        settings = get_settings()

        log = logger.bind(
            request_id=inp.request_id,
            topic=inp.topic_query,
            platform=inp.platform,
            floor_id=settings.floor_id,
            floor_version=settings.floor_version,
        )

        # ── Idempotency Check & Conflict Verification ───────────────────────────
        cached_payload_data = self.memory_store.get_idempotent_payload(inp.request_id)
        if cached_payload_data:
            cached_topic = cached_payload_data.get("topic", {}).get("selected_topic", "")
            if cached_topic and cached_topic.lower() != inp.topic_query.strip().lower():
                raise Floor01ValidationError(
                    f"Idempotency conflict: request_id '{inp.request_id}' was previously processed for topic '{cached_topic}', but current request is for '{inp.topic_query}'"
                )
            log.info("returning_idempotent_cached_payload", request_id=inp.request_id)
            payload = Floor01HandoffPayload.model_validate(cached_payload_data)

            duration_ms = round((time.time() - start_time) * 1000, 2)
            report = FloorExecutionReport(
                request_id=inp.request_id,
                plan_id=payload.plan_id,
                floor_id=settings.floor_id,
                floor_version=settings.floor_version,
                started_at=started_at,
                duration_ms=duration_ms,
                execution_mode=ExecutionModeDetails(
                    global_mode=payload.execution_mode,
                    worker_modes={"topic": ExecutionMode.DETERMINISTIC, "strategy": payload.execution_mode},
                    configured_provider="gemini",
                    configured_model=self.llm_adapter.model_name,
                    executed=self.llm_adapter.enabled,
                    executed_model=self.llm_adapter.model_name if self.llm_adapter.enabled else None,
                ),
                status=payload.handoff_status,
                input_summary=inp.model_dump(),
                decision_quality_score=payload.decision_quality_score,
                handoff_reference={"plan_id": payload.plan_id, "cached": True},
            )
            return payload, report

        log.info("floor01_pipeline_started")

        worker_summaries: List[WorkerExecutionSummary] = []
        warnings: List[str] = []
        errors: List[str] = []

        global_mode = ExecutionMode.MODEL if self.llm_adapter.enabled else ExecutionMode.DETERMINISTIC_FALLBACK

        try:
            # ── Step 1: Topic Intelligence ────────────────────────────────────
            t0 = time.time()
            topic_res = self.topic_worker.run(inp)
            t_topic_ms = round((time.time() - t0) * 1000, 2)

            worker_summaries.append(
                WorkerExecutionSummary(
                    worker_name="TopicIntelligenceWorker",
                    execution_mode=ExecutionMode.DETERMINISTIC,
                    duration_ms=t_topic_ms,
                    confidence_score=topic_res.provenance[0].confidence_score if topic_res.provenance else 0.8,
                    evidence_count=len(topic_res.provenance),
                )
            )

            if strict_rejection and topic_res.uniqueness_verdict == UniquenessVerdict.DUPLICATE_IN_MEMORY:
                raise DuplicateTopicError(
                    topic=inp.topic_query,
                    matched_topic=topic_res.selected_topic,
                    similarity_score=topic_res.similarity_risk_score,
                )

            # Optional LLM Strategy Insight
            if self.llm_adapter.enabled:
                _, llm_prov = self.llm_adapter.generate_strategy_insight(
                    topic_res.selected_topic, topic_res.category, inp.target_audience, inp.platform
                )
                topic_res.provenance.append(llm_prov)

            # ── Step 2: Strategy Planning ──────────────────────────────────────
            t0 = time.time()
            strategy_res = self.strategy_worker.run(inp, topic_res, execution_mode=global_mode)
            t_strat_ms = round((time.time() - t0) * 1000, 2)

            worker_summaries.append(
                WorkerExecutionSummary(
                    worker_name="StrategyPlannerWorker",
                    execution_mode=global_mode,
                    duration_ms=t_strat_ms,
                    confidence_score=strategy_res.provenance[0].confidence_score if strategy_res.provenance else 0.8,
                    evidence_count=len(strategy_res.provenance),
                )
            )

            # ── Step 3: Content Planning ───────────────────────────────────────
            t0 = time.time()
            content_res = self.content_worker.run(inp, topic_res, strategy_res)
            t_content_ms = round((time.time() - t0) * 1000, 2)

            worker_summaries.append(
                WorkerExecutionSummary(
                    worker_name="ContentPlannerWorker",
                    execution_mode=ExecutionMode.DETERMINISTIC,
                    duration_ms=t_content_ms,
                    confidence_score=content_res.provenance[0].confidence_score if content_res.provenance else 0.8,
                    evidence_count=len(content_res.provenance),
                )
            )

            # ── Step 4: Curriculum Mapping ─────────────────────────────────────
            t0 = time.time()
            curriculum_res = self.curriculum_worker.run(inp, topic_res)
            t_curr_ms = round((time.time() - t0) * 1000, 2)

            worker_summaries.append(
                WorkerExecutionSummary(
                    worker_name="CurriculumMapperWorker",
                    execution_mode=ExecutionMode.DETERMINISTIC,
                    duration_ms=t_curr_ms,
                    confidence_score=curriculum_res.provenance[0].confidence_score if curriculum_res.provenance else 0.8,
                    evidence_count=len(curriculum_res.provenance),
                )
            )

            # ── Defined Weighted Heuristic Decision Quality Score ──────────────
            quality_score = calculate_decision_quality_score(
                topic_res.provenance,
                strategy_res.provenance,
                content_res.provenance,
                curriculum_res.provenance,
            )

            gate_topic = topic_res.uniqueness_verdict != UniquenessVerdict.DUPLICATE_IN_MEMORY
            gate_score = quality_score >= settings.min_confidence_threshold
            component_gates = {
                "topic_uniqueness_gate": gate_topic,
                "confidence_score_gate": gate_score,
            }

            if strict_rejection and quality_score < settings.min_confidence_threshold:
                raise LowConfidenceError(quality_score, settings.min_confidence_threshold)

            # ── Determine Handoff Status ───────────────────────────────────────
            if topic_res.uniqueness_verdict == UniquenessVerdict.DUPLICATE_IN_MEMORY:
                status = HandoffStatus.REJECTED
                warnings.append(f"Topic rejected as duplicate of memory record (similarity: {topic_res.similarity_risk_score:.2f})")
            elif topic_res.uniqueness_verdict == UniquenessVerdict.SIMILAR_TO_MEMORY or quality_score < settings.min_confidence_threshold:
                status = HandoffStatus.DEGRADED
                warnings.append("Strategy quality marked DEGRADED due to keyword similarity or sub-optimal quality score.")
            else:
                status = HandoffStatus.VALIDATED

            payload = Floor01HandoffPayload(
                request_id=inp.request_id,
                floor_id=settings.floor_id,
                floor_version=settings.floor_version,
                execution_mode=global_mode,
                topic=topic_res,
                strategy=strategy_res,
                content_plan=content_res,
                curriculum=curriculum_res,
                decision_quality_score=quality_score,
                handoff_status=status,
            )

            # Persist topic and payload in strategy memory if validated or degraded
            if status != HandoffStatus.REJECTED:
                self.memory_store.add_record(
                    topic=inp.topic_query,
                    plan_id=payload.plan_id,
                    request_id=inp.request_id,
                    payload=payload.model_dump(),
                    metadata={"request_id": inp.request_id, "category": topic_res.category},
                )

            total_duration_ms = round((time.time() - start_time) * 1000, 2)
            all_provenance = (
                topic_res.provenance + strategy_res.provenance + content_res.provenance + curriculum_res.provenance
            )

            report = FloorExecutionReport(
                request_id=inp.request_id,
                plan_id=payload.plan_id,
                floor_id=settings.floor_id,
                floor_version=settings.floor_version,
                started_at=started_at,
                duration_ms=total_duration_ms,
                execution_mode=ExecutionModeDetails(
                    global_mode=global_mode,
                    worker_modes={
                        "topic": ExecutionMode.DETERMINISTIC,
                        "strategy": global_mode,
                        "content": ExecutionMode.DETERMINISTIC,
                        "curriculum": ExecutionMode.DETERMINISTIC,
                    },
                    configured_provider="gemini",
                    configured_model=self.llm_adapter.model_name,
                    executed=self.llm_adapter.enabled,
                    executed_model=self.llm_adapter.model_name if self.llm_adapter.enabled else None,
                ),
                status=status,
                input_summary={
                    "topic_query": inp.topic_query,
                    "platform": inp.platform,
                    "target_audience": inp.target_audience,
                    "format": inp.content_format,
                },
                worker_results=worker_summaries,
                decisions=[
                    {"topic": topic_res.selected_topic, "category": topic_res.category},
                    {"angle": strategy_res.content_angle, "duration": strategy_res.target_duration_seconds},
                    {"outline": content_res.structural_outline},
                    {"bloom_level": curriculum_res.bloom_taxonomy_level.value},
                    {"concept_dependencies": curriculum_res.concept_dependencies},
                ],
                decision_quality_score=quality_score,
                component_gates=component_gates,
                provenance_audit=all_provenance,
                warnings=warnings,
                errors=errors,
                handoff_reference={"plan_id": payload.plan_id, "status": status.value},
            )

            # Persist execution report to used_artifact/reports/ for local audit tracing
            self._persist_report_artifact(report)

            log.info("floor01_pipeline_completed", status=status.value, plan_id=payload.plan_id)
            return payload, report

        except (Floor01ValidationError, DuplicateTopicError, LowConfidenceError):
            raise
        except Exception as exc:
            log.error("floor01_pipeline_failed", error=str(exc))
            raise StrategyPipelineError(
                f"Floor 01 pipeline failed for topic '{inp.topic_query}'",
                detail=str(exc),
            ) from exc

    def execute(self, inp: Floor01Input, strict_rejection: bool = False) -> Floor01HandoffPayload:
        """Standard execution method returning Floor01HandoffPayload."""
        payload, _ = self.execute_with_report(inp, strict_rejection=strict_rejection)
        return payload

    def _persist_report_artifact(self, report: FloorExecutionReport) -> None:
        """Persist Overseer execution report to used_artifact/reports/."""
        try:
            reports_dir = Path("used_artifact/reports")
            reports_dir.mkdir(parents=True, exist_ok=True)
            report_file = reports_dir / f"floor01_execution_{report.execution_id}.json"
            report_file.write_text(json.dumps(report.model_dump(), indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            logger.warning("failed_to_persist_execution_report_artifact", error=str(e))
