"""Pacing Validator Worker for Floor 02.

Validates narration word count, speech duration math, and overall target duration bounds.
Formula:
  estimated_speech_duration_seconds = narration_word_count / words_per_second
  estimated_total_duration_seconds = estimated_speech_duration_seconds + estimated_pause_transition_duration_seconds
"""

from __future__ import annotations

from typing import Any, Dict, List

import structlog

from floors.floor02_scripting.app.domain.handoff import EvidenceType, ProvenanceEntry
from floors.floor02_scripting.app.domain.script_models import SceneSpecification

logger = structlog.get_logger(__name__)


class PacingValidatorWorker:
    """Logical worker responsible for duration math and pacing quality gate validation."""

    def execute(
        self,
        scenes: List[SceneSpecification],
        target_duration_seconds: int,
        words_per_second: float = 2.5,
    ) -> Dict[str, Any]:
        logger.info("pacing_validator_worker_started", target_duration=target_duration_seconds)

        total_words = sum(s.word_count for s in scenes)
        estimated_speech_duration = round(total_words / words_per_second, 1)

        # Unless a pause engine explicitly derives pause duration, default pause duration is 0.0s
        estimated_pause_duration = 0.0
        estimated_total_duration = round(estimated_speech_duration + estimated_pause_duration, 1)

        # Tolerance check (50% to 150% window of target duration)
        min_allowed = round(target_duration_seconds * 0.50, 1)
        max_allowed = round(target_duration_seconds * 1.50, 1)

        is_valid = min_allowed <= estimated_total_duration <= max_allowed

        provenance = [
            ProvenanceEntry(
                evidence_type=EvidenceType.DETERMINISTIC_RULE,
                source_type="pacing_rule_engine",
                source_identifier="words_per_second_calculator",
                method="validate_total_script_pacing",
                summary=(
                    f"Validated {total_words} total words at {words_per_second} wps = {estimated_speech_duration}s speech duration "
                    f"against target duration {target_duration_seconds}s."
                ),
                raw_data={
                    "total_words": total_words,
                    "words_per_second": words_per_second,
                    "estimated_speech_duration_seconds": estimated_speech_duration,
                    "estimated_pause_transition_duration_seconds": estimated_pause_duration,
                    "estimated_total_duration_seconds": estimated_total_duration,
                    "target_duration_seconds": target_duration_seconds,
                    "pacing_duration_gate": is_valid,
                },
            )
        ]

        logger.info(
            "pacing_validator_worker_completed",
            total_words=total_words,
            speech_duration=estimated_speech_duration,
            is_valid=is_valid,
        )

        return {
            "total_words": total_words,
            "estimated_speech_duration_seconds": estimated_speech_duration,
            "estimated_pause_transition_duration_seconds": estimated_pause_duration,
            "estimated_total_duration_seconds": estimated_total_duration,
            "pacing_duration_gate": is_valid,
            "provenance": provenance,
        }
