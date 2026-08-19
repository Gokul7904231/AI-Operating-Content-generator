"""Pipeline Orchestration for Floor 02 (Scripting & Narrative).

Orchestrates logical workers (Narrative Architect, Dialogue Scriptwriter, Scene Narrative Planner, Pacing Validator),
checks idempotency, enforces quality gates, generates downstream handoff payloads and Overseer execution reports,
and persists local execution artifacts.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from uuid import uuid4

import structlog

from floors.floor02_scripting.app.core.exceptions import Floor02PipelineError, Floor02ValidationError
from floors.floor02_scripting.app.domain.handoff import (
    ExecutionMode,
    ExecutionModeDetails,
    Floor02HandoffPayload,
    Floor02Input,
    FloorExecutionReport,
    HandoffStatus,
    WorkerExecutionSummary,
)
from floors.floor02_scripting.app.infrastructure.llm_narrative_adapter import LLMNarrativeAdapter
from floors.floor02_scripting.app.infrastructure.memory_store import ScriptMemoryStore
from floors.floor02_scripting.app.logical_workers.dialogue_scriptwriter import DialogueScriptwriterWorker
from floors.floor02_scripting.app.logical_workers.narrative_architect import NarrativeArchitectWorker
from floors.floor02_scripting.app.logical_workers.pacing_validator import PacingValidatorWorker
from floors.floor02_scripting.app.logical_workers.scene_planner import SceneNarrativePlannerWorker

logger = structlog.get_logger(__name__)


class Floor02Pipeline:
    """Master orchestration pipeline for Floor 02."""

    def __init__(
        self,
        memory_store: Optional[ScriptMemoryStore] = None,
        llm_adapter: Optional[LLMNarrativeAdapter] = None,
        artifact_report_dir: Optional[str] = "used_artifact/reports",
    ) -> None:
        self.memory_store = memory_store or ScriptMemoryStore()
        self.llm_adapter = llm_adapter or LLMNarrativeAdapter()
        self.artifact_report_dir = Path(artifact_report_dir) if artifact_report_dir else None

        self.narrative_architect = NarrativeArchitectWorker(llm_adapter=self.llm_adapter)
        self.dialogue_scriptwriter = DialogueScriptwriterWorker()
        self.scene_planner = SceneNarrativePlannerWorker()
        self.pacing_validator = PacingValidatorWorker()

    def execute_with_report(
        self,
        inp: Floor02Input,
        strict_rejection: bool = False,
    ) -> Tuple[Floor02HandoffPayload, FloorExecutionReport]:
        """Execute Floor 02 pipeline and return (Floor02HandoffPayload, FloorExecutionReport)."""
        start_time = time.time()
        start_iso = datetime.now(timezone.utc).isoformat()
        execution_id = str(uuid4())

        logger.info(
            "floor02_pipeline_started",
            floor_id="floor02",
            floor_version="1.0.0",
            request_id=inp.request_id,
            topic=inp.topic_query,
        )

        # Idempotency check
        cached_payload_dict = self.memory_store.get_idempotent_payload(inp.request_id)
        if cached_payload_dict:
            logger.info("floor02_idempotency_hit", request_id=inp.request_id)
            try:
                cached_payload = Floor02HandoffPayload.model_validate(cached_payload_dict)
                if inp.topic_query and cached_payload.title and inp.topic_query.lower() not in cached_payload.title.lower():
                    # Reject request_id mismatch with conflicting topic
                    raise Floor02ValidationError(
                        f"Idempotency conflict: request_id '{inp.request_id}' previously processed for a different topic"
                    )

                end_time = time.time()
                duration_ms = round((end_time - start_time) * 1000, 2)
                report = self._build_execution_report(
                    execution_id=execution_id,
                    inp=inp,
                    payload=cached_payload,
                    worker_summaries=[],
                    start_iso=start_iso,
                    duration_ms=duration_ms,
                    is_idempotent=True,
                )
                return cached_payload, report
            except Exception as exc:
                if isinstance(exc, Floor02ValidationError):
                    raise exc
                logger.warning("failed_to_parse_cached_payload_reprocessing", error=str(exc))

        worker_summaries: List[WorkerExecutionSummary] = []
        all_provenance = []

        try:
            # Step 1: Narrative Architect
            w1_start = time.time()
            arch_res = self.narrative_architect.execute(inp)
            w1_dur = round((time.time() - w1_start) * 1000, 2)
            worker_summaries.append(
                WorkerExecutionSummary(
                    worker_name="NarrativeArchitectWorker",
                    execution_mode=arch_res["execution_mode"],
                    duration_ms=w1_dur,
                    status="SUCCESS",
                    summary=f"Planned script outline with {len(arch_res['raw_scenes'])} scenes.",
                )
            )
            all_provenance.extend(arch_res["provenance"])

            # Step 2: Dialogue Scriptwriter
            w2_start = time.time()
            diag_res = self.dialogue_scriptwriter.execute(
                raw_scenes=arch_res["raw_scenes"],
                words_per_second=inp.words_per_second,
            )
            w2_dur = round((time.time() - w2_start) * 1000, 2)
            worker_summaries.append(
                WorkerExecutionSummary(
                    worker_name="DialogueScriptwriterWorker",
                    execution_mode=ExecutionMode.DETERMINISTIC,
                    duration_ms=w2_dur,
                    status="SUCCESS",
                    summary=f"Wrote narration containing {diag_res['total_words']} words.",
                )
            )
            all_provenance.extend(diag_res["provenance"])

            # Step 3: Scene Narrative Planner
            w3_start = time.time()
            topic_str = inp.floor01_payload.topic.selected_topic if inp.floor01_payload else inp.topic_query
            scene_res = self.scene_planner.execute(
                processed_scenes=diag_res["processed_scenes"],
                topic=topic_str,
            )
            w3_dur = round((time.time() - w3_start) * 1000, 2)
            worker_summaries.append(
                WorkerExecutionSummary(
                    worker_name="SceneNarrativePlannerWorker",
                    execution_mode=ExecutionMode.DETERMINISTIC,
                    duration_ms=w3_dur,
                    status="SUCCESS",
                    summary=f"Planned visual intent for {len(scene_res['scenes'])} scenes.",
                )
            )
            all_provenance.extend(scene_res["provenance"])

            # Step 4: Pacing Validator
            w4_start = time.time()
            pacing_res = self.pacing_validator.execute(
                scenes=scene_res["scenes"],
                target_duration_seconds=inp.target_duration_seconds,
                words_per_second=inp.words_per_second,
            )
            w4_dur = round((time.time() - w4_start) * 1000, 2)
            pacing_gate = pacing_res["pacing_duration_gate"]
            worker_summaries.append(
                WorkerExecutionSummary(
                    worker_name="PacingValidatorWorker",
                    execution_mode=ExecutionMode.DETERMINISTIC,
                    duration_ms=w4_dur,
                    status="SUCCESS" if pacing_gate else "WARNING",
                    summary=f"Pacing gate passed: {pacing_gate} ({pacing_res['total_words']} words).",
                )
            )
            all_provenance.extend(pacing_res["provenance"])

            # Determine handoff status
            handoff_status = HandoffStatus.VALIDATED if pacing_gate else HandoffStatus.DEGRADED

            if not pacing_gate and strict_rejection:
                raise Floor02ValidationError("Pacing duration quality gate failed")

            plan_id_str = inp.floor01_payload.plan_id if inp.floor01_payload else str(uuid4())

            payload = Floor02HandoffPayload(
                script_id=str(uuid4()),
                script_version=1,
                plan_id=plan_id_str,
                request_id=inp.request_id,
                floor_id="floor02",
                floor_version="1.0.0",
                created_at=datetime.now(timezone.utc).isoformat(),
                execution_mode=arch_res["execution_mode"],
                format=inp.narrative_format,
                title=arch_res["title"],
                logline=arch_res["logline"],
                target_duration_seconds=inp.target_duration_seconds,
                estimated_total_duration_seconds=pacing_res["estimated_total_duration_seconds"],
                estimated_speech_duration_seconds=pacing_res["estimated_speech_duration_seconds"],
                estimated_pause_transition_duration_seconds=pacing_res["estimated_pause_transition_duration_seconds"],
                scenes=scene_res["scenes"],
                character_profiles=[],
                educational_beats={},
                decision_quality_score=None,  # Derived only when heuristic evaluator executes
                handoff_status=handoff_status,
                provenance=all_provenance,
            )

            # Persist to memory store under idempotency key
            self.memory_store.add_record(
                script_id=payload.script_id,
                title=payload.title,
                request_id=inp.request_id,
                payload=payload.model_dump(),
                metadata={"request_id": inp.request_id, "format": payload.format.value},
            )

            end_time = time.time()
            duration_ms = round((end_time - start_time) * 1000, 2)

            report = self._build_execution_report(
                execution_id=execution_id,
                inp=inp,
                payload=payload,
                worker_summaries=worker_summaries,
                start_iso=start_iso,
                duration_ms=duration_ms,
                is_idempotent=False,
            )

            self._persist_report_artifact(report)

            logger.info(
                "floor02_pipeline_completed",
                floor_id="floor02",
                floor_version="1.0.0",
                script_id=payload.script_id,
                request_id=inp.request_id,
                status=handoff_status.value,
                duration_ms=duration_ms,
            )

            return payload, report

        except Exception as exc:
            logger.error("floor02_pipeline_execution_failed", error=str(exc))
            if isinstance(exc, (Floor02ValidationError, Floor02PipelineError)):
                raise exc
            raise Floor02PipelineError(f"Floor 02 pipeline failed for topic '{inp.topic_query}'") from exc

    def execute(self, inp: Floor02Input, strict_rejection: bool = False) -> Floor02HandoffPayload:
        payload, _ = self.execute_with_report(inp, strict_rejection=strict_rejection)
        return payload

    def _build_execution_report(
        self,
        execution_id: str,
        inp: Floor02Input,
        payload: Floor02HandoffPayload,
        worker_summaries: List[WorkerExecutionSummary],
        start_iso: str,
        duration_ms: float,
        is_idempotent: bool,
    ) -> FloorExecutionReport:
        end_iso = datetime.now(timezone.utc).isoformat()
        is_llm_active = self.llm_adapter.is_available()

        exec_mode_details = ExecutionModeDetails(
            global_mode=payload.execution_mode,
            worker_modes={w.worker_name: w.execution_mode for w in worker_summaries},
            configured_provider=self.llm_adapter.provider,
            configured_model=self.llm_adapter.model,
            selected_provider=self.llm_adapter.provider,
            selected_model=self.llm_adapter.model,
            executed=is_llm_active and payload.execution_mode == ExecutionMode.MODEL,
            executed_model=self.llm_adapter.model if (is_llm_active and payload.execution_mode == ExecutionMode.MODEL) else None,
        )

        return FloorExecutionReport(
            execution_id=execution_id,
            request_id=inp.request_id,
            plan_id=payload.plan_id,
            script_id=payload.script_id,
            floor_id="floor02",
            floor_version="1.0.0",
            started_at=start_iso,
            completed_at=end_iso,
            duration_ms=duration_ms,
            execution_mode=exec_mode_details,
            status=payload.handoff_status,
            input_summary={
                "request_id": inp.request_id,
                "topic_query": inp.topic_query,
                "narrative_format": inp.narrative_format.value,
                "target_duration_seconds": inp.target_duration_seconds,
            },
            worker_results=worker_summaries,
            decisions=[
                {
                    "scenes_generated": len(payload.scenes),
                    "total_words": sum(s.word_count for s in payload.scenes),
                    "estimated_speech_duration_seconds": payload.estimated_speech_duration_seconds,
                    "estimated_pause_transition_duration_seconds": payload.estimated_pause_transition_duration_seconds,
                    "estimated_total_duration_seconds": payload.estimated_total_duration_seconds,
                }
            ],
            decision_quality_score=payload.decision_quality_score,
            component_gates={
                "pacing_duration_gate": payload.handoff_status == HandoffStatus.VALIDATED,
                "structural_completeness_gate": len(payload.scenes) >= 1,
            },
            provenance_audit=payload.provenance,
            warnings=["Idempotent cached payload returned"] if is_idempotent else [],
            errors=[],
            handoff_reference={"script_id": payload.script_id, "status": payload.handoff_status.value},
        )

    def _persist_report_artifact(self, report: FloorExecutionReport) -> None:
        if not self.artifact_report_dir:
            return
        try:
            self.artifact_report_dir.mkdir(parents=True, exist_ok=True)
            report_path = self.artifact_report_dir / f"floor02_execution_{report.execution_id}.json"
            with report_path.open("w", encoding="utf-8") as f:
                json.dump(report.model_dump(), f, indent=2, ensure_ascii=False)
            logger.info("floor02_execution_report_persisted", report_path=str(report_path))
        except Exception as exc:
            logger.warning("failed_to_persist_floor02_execution_report", error=str(exc))
