"""Scene Regenerator Worker for Floor 02.

Executes single-scene narrative regeneration.
Preserves overall script_id and unaffected scenes while incrementing scene_version and script_version.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import structlog

from floors.floor02_scripting.app.domain.handoff import EvidenceType, Floor02HandoffPayload, ProvenanceEntry
from floors.floor02_scripting.app.domain.script_models import SceneSpecification
from floors.floor02_scripting.app.logical_workers.dialogue_scriptwriter import count_words

logger = structlog.get_logger(__name__)


class SceneRegeneratorWorker:
    """Logical worker responsible for context-preserving single-scene regeneration."""

    def execute(
        self,
        current_payload: Floor02HandoffPayload,
        target_scene_id: str,
        regeneration_instruction: Optional[str] = None,
        words_per_second: float = 2.5,
    ) -> Floor02HandoffPayload:
        logger.info(
            "scene_regenerator_worker_started",
            script_id=current_payload.script_id,
            target_scene_id=target_scene_id,
        )

        updated_scenes: List[SceneSpecification] = []
        target_found = False

        for sc in current_payload.scenes:
            if sc.scene_id == target_scene_id:
                target_found = True

                # Generate updated narration text reflecting instruction
                instruction_note = f" ({regeneration_instruction})" if regeneration_instruction else ""
                new_narration = f"{sc.narration_text.rstrip('.')}{instruction_note}."
                new_word_cnt = count_words(new_narration)
                new_speech_dur = round(new_word_cnt / words_per_second, 1)

                updated_scene = SceneSpecification(
                    scene_id=sc.scene_id,
                    scene_version=sc.scene_version + 1,  # Increment scene version
                    sequence_index=sc.sequence_index,
                    section_type=sc.section_type,
                    narration_text=new_narration,
                    on_screen_text=sc.on_screen_text,
                    visual_intent=f"{sc.visual_intent} (Updated visual pacing).",
                    target_duration_seconds=sc.target_duration_seconds,
                    word_count=new_word_cnt,
                    estimated_speech_duration_seconds=new_speech_dur,
                    character_references=sc.character_references,
                    continuity_rules=sc.continuity_rules,
                )
                updated_scenes.append(updated_scene)
            else:
                # Keep unaffected scenes untouched
                updated_scenes.append(sc)

        if not target_found:
            raise ValueError(f"Target scene_id '{target_scene_id}' not found in script '{current_payload.script_id}'")

        # Recalculate script metrics
        total_words = sum(s.word_count for s in updated_scenes)
        total_speech_dur = round(total_words / words_per_second, 1)

        regen_provenance = ProvenanceEntry(
            evidence_type=EvidenceType.DETERMINISTIC_RULE,
            source_type="scene_regenerator_worker",
            source_identifier="single_scene_updater",
            method="regenerate_target_scene",
            summary=f"Regenerated scene '{target_scene_id}' (version incremented). Unaffected scenes preserved.",
            raw_data={"target_scene_id": target_scene_id, "instruction": regeneration_instruction},
        )

        updated_payload = Floor02HandoffPayload(
            script_id=current_payload.script_id,
            script_version=current_payload.script_version + 1,  # Increment script version
            plan_id=current_payload.plan_id,
            request_id=current_payload.request_id,
            floor_id=current_payload.floor_id,
            floor_version=current_payload.floor_version,
            execution_mode=current_payload.execution_mode,
            format=current_payload.format,
            title=current_payload.title,
            logline=current_payload.logline,
            target_duration_seconds=current_payload.target_duration_seconds,
            estimated_total_duration_seconds=total_speech_dur,
            estimated_speech_duration_seconds=total_speech_dur,
            estimated_pause_transition_duration_seconds=0.0,
            scenes=updated_scenes,
            character_profiles=current_payload.character_profiles,
            educational_beats=current_payload.educational_beats,
            decision_quality_score=current_payload.decision_quality_score,
            handoff_status=current_payload.handoff_status,
            provenance=current_payload.provenance + [regen_provenance],
        )

        logger.info("scene_regenerator_worker_completed", new_script_version=updated_payload.script_version)

        return updated_payload
