"""Dialogue & Scriptwriter Worker for Floor 02.

Generates exact spoken narration text, on-screen caption text, and word counts for each scene.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List

import structlog

from floors.floor02_scripting.app.domain.handoff import EvidenceType, ProvenanceEntry

logger = structlog.get_logger(__name__)


def count_words(text: str) -> int:
    """Calculate exact word count of narration text using word-token matching (handles apostrophe contractions)."""
    if not text:
        return 0
    words = re.findall(r"\b[\w']+\b", text)
    return len(words)


class DialogueScriptwriterWorker:
    """Logical worker responsible for writing spoken narration and caption text."""

    def execute(self, raw_scenes: List[Dict[str, Any]], words_per_second: float = 2.5) -> Dict[str, Any]:
        logger.info("dialogue_scriptwriter_worker_started", input_scene_count=len(raw_scenes))

        processed_scenes = []
        total_words = 0
        provenance = []

        for idx, sc in enumerate(raw_scenes, start=1):
            narration = sc.get("narration_text", "").strip()
            on_screen = sc.get("on_screen_text", "").strip()
            word_cnt = count_words(narration)
            total_words += word_cnt

            speech_dur = round(word_cnt / words_per_second, 1)

            scene_item = {
                "scene_id": sc.get("scene_id", f"scene-0{idx}"),
                "scene_version": sc.get("scene_version", 1),
                "sequence_index": idx,
                "section_type": sc.get("section_type", "Core Narrative"),
                "narration_text": narration,
                "on_screen_text": on_screen or narration[:30],
                "target_duration_seconds": sc.get("target_duration_seconds", 10),
                "word_count": word_cnt,
                "estimated_speech_duration_seconds": speech_dur,
            }
            processed_scenes.append(scene_item)

        provenance.append(
            ProvenanceEntry(
                evidence_type=EvidenceType.DETERMINISTIC_RULE,
                source_type="dialogue_scriptwriter",
                source_identifier="word_counter_and_line_formatter",
                method="calculate_narration_word_count",
                summary=f"Processed {len(processed_scenes)} scenes containing {total_words} total spoken words.",
                raw_data={"total_words": total_words, "words_per_second": words_per_second},
            )
        )

        logger.info("dialogue_scriptwriter_worker_completed", total_words=total_words)

        return {
            "processed_scenes": processed_scenes,
            "total_words": total_words,
            "provenance": provenance,
        }
