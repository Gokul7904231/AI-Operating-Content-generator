"""Narrative Architect Worker for Floor 02.

Transforms upstream strategic direction into a high-level narrative structure, title, logline, and scene outlines.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import structlog

from floors.floor02_scripting.app.domain.handoff import EvidenceType, ExecutionMode, Floor02Input, ProvenanceEntry
from floors.floor02_scripting.app.domain.script_models import NarrativeFormat, NarrativeStructure
from floors.floor02_scripting.app.infrastructure.llm_narrative_adapter import LLMNarrativeAdapter

logger = structlog.get_logger(__name__)


class NarrativeArchitectWorker:
    """Logical worker responsible for high-level narrative structure planning."""

    def __init__(self, llm_adapter: Optional[LLMNarrativeAdapter] = None) -> None:
        self.llm_adapter = llm_adapter or LLMNarrativeAdapter()

    def execute(self, inp: Floor02Input) -> Dict[str, Any]:
        logger.info("narrative_architect_worker_started", request_id=inp.request_id)

        topic = inp.topic_query
        target_duration = inp.target_duration_seconds
        core_objective = None
        key_takeaways = None

        if inp.floor01_payload:
            topic = inp.floor01_payload.topic.selected_topic
            target_duration = inp.floor01_payload.strategy.target_duration_seconds
            core_objective = inp.floor01_payload.content_plan.core_objective
            key_takeaways = inp.floor01_payload.content_plan.key_takeaways

        raw_narrative, mode, executed_model = self.llm_adapter.generate_narrative(
            topic=topic,
            format_type=inp.narrative_format,
            target_duration_seconds=target_duration,
            core_objective=core_objective,
            key_takeaways=key_takeaways,
        )

        provenance = [
            ProvenanceEntry(
                evidence_type=EvidenceType.UPSTREAM_HANDOFF if inp.floor01_payload else EvidenceType.DETERMINISTIC_RULE,
                source_type="floor01_handoff_payload" if inp.floor01_payload else "floor02_input",
                source_identifier="Floor01HandoffPayload" if inp.floor01_payload else "Floor02Input",
                method="ingest_upstream_content_plan",
                summary=f"Ingested topic '{topic}' and objective '{core_objective or topic}' for narrative structure.",
                raw_data={"topic": topic, "target_duration": target_duration},
            ),
            ProvenanceEntry(
                evidence_type=EvidenceType.MODEL_INFERENCE if mode == ExecutionMode.MODEL else EvidenceType.DETERMINISTIC_RULE,
                source_type="llm_narrative_adapter" if mode == ExecutionMode.MODEL else "deterministic_fallback_templates",
                source_identifier=executed_model or "narrative_architect_template_v1",
                method="generate_narrative_structure",
                summary=f"Structured script into {len(raw_narrative.get('scenes', []))} narrative scenes.",
                raw_data={"format": inp.narrative_format, "scene_count": len(raw_narrative.get('scenes', []))},
            ),
        ]

        logger.info("narrative_architect_worker_completed", scene_count=len(raw_narrative.get("scenes", [])))

        return {
            "title": raw_narrative.get("title", f"{topic} Breakdown"),
            "logline": raw_narrative.get("logline", f"Educational breakdown of {topic}"),
            "target_duration_seconds": target_duration,
            "raw_scenes": raw_narrative.get("scenes", []),
            "execution_mode": mode,
            "executed_model": executed_model,
            "provenance": provenance,
        }
