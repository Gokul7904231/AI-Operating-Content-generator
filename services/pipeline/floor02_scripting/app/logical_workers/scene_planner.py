"""Scene Narrative Planner Worker for Floor 02.

Generates semantic visual narrative intent, character references, and continuity rules for each scene.
Scope Note: Floor 02 produces WHAT the scene communicates visually; Floor 03 produces HOW assets are rendered.
"""

from __future__ import annotations

from typing import Any, Dict, List

import structlog

from floors.floor02_scripting.app.domain.handoff import EvidenceType, ProvenanceEntry
from floors.floor02_scripting.app.domain.script_models import SceneSpecification

logger = structlog.get_logger(__name__)


class SceneNarrativePlannerWorker:
    """Logical worker responsible for visual narrative intent and scene continuity planning."""

    def execute(self, processed_scenes: List[Dict[str, Any]], topic: str) -> Dict[str, Any]:
        logger.info("scene_narrative_planner_worker_started", scene_count=len(processed_scenes))

        final_scenes: List[SceneSpecification] = []
        provenance = []

        for sc in processed_scenes:
            visual_intent = sc.get("visual_intent") or f"Cinematic visual illustrating {sc.get('section_type', 'narrative')} for {topic}."

            scene_spec = SceneSpecification(
                scene_id=sc["scene_id"],
                scene_version=sc.get("scene_version", 1),
                sequence_index=sc["sequence_index"],
                section_type=sc.get("section_type", "Core Narrative"),
                narration_text=sc["narration_text"],
                on_screen_text=sc["on_screen_text"],
                visual_intent=visual_intent,
                target_duration_seconds=sc["target_duration_seconds"],
                word_count=sc["word_count"],
                estimated_speech_duration_seconds=sc["estimated_speech_duration_seconds"],
                character_references=[],
                continuity_rules={"lighting": "cinematic_contrast", "environment": "educational_context"},
            )
            final_scenes.append(scene_spec)

        provenance.append(
            ProvenanceEntry(
                evidence_type=EvidenceType.DETERMINISTIC_RULE,
                source_type="scene_narrative_planner",
                source_identifier="narrative_intent_generator",
                method="attach_visual_narrative_intent",
                summary=f"Attached visual narrative intent and continuity tags across {len(final_scenes)} scenes.",
                raw_data={"topic": topic, "scene_count": len(final_scenes)},
            )
        )

        logger.info("scene_narrative_planner_worker_completed", scene_count=len(final_scenes))

        return {
            "scenes": final_scenes,
            "provenance": provenance,
        }
