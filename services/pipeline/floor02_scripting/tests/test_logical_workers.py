"""Unit tests for Floor 02 logical workers."""

import pytest

from floors.floor02_scripting.app.core.exceptions import Floor02ValidationError
from floors.floor02_scripting.app.domain.handoff import Floor02Input
from floors.floor02_scripting.app.domain.script_models import NarrativeFormat, SceneSpecification
from floors.floor02_scripting.app.logical_workers.dialogue_scriptwriter import DialogueScriptwriterWorker, count_words
from floors.floor02_scripting.app.logical_workers.narrative_architect import NarrativeArchitectWorker
from floors.floor02_scripting.app.logical_workers.pacing_validator import PacingValidatorWorker
from floors.floor02_scripting.app.logical_workers.scene_planner import SceneNarrativePlannerWorker
from floors.floor02_scripting.app.pipeline import Floor02Pipeline


def test_word_count_algorithm():
    """Verify deterministic lexical word count algorithm across contractions, code syntax, and punctuation."""
    assert count_words("Hello world!") == 2
    assert count_words("Did you know functions are objects in Python?") == 8
    assert count_words("don't stop learning") == 3
    assert count_words("@decorator syntax in C++") == 4
    assert count_words("") == 0


def test_narrative_architect_worker():
    inp = Floor02Input(topic_query="Asyncio Event Loop", narrative_format=NarrativeFormat.EDUCATIONAL_EXPLAINER)
    worker = NarrativeArchitectWorker()
    res = worker.execute(inp)

    assert "title" in res
    assert "logline" in res
    assert len(res["raw_scenes"]) >= 3
    assert len(res["provenance"]) >= 2


def test_dialogue_scriptwriter_worker():
    raw_scenes = [
        {"scene_id": "sc-1", "narration_text": "Did you know functions are objects in Python?", "target_duration_seconds": 10},
        {"scene_id": "sc-2", "narration_text": "Here is how wrapper functions work in practice.", "target_duration_seconds": 15},
    ]
    worker = DialogueScriptwriterWorker()
    res = worker.execute(raw_scenes, words_per_second=2.5)

    assert len(res["processed_scenes"]) == 2
    assert res["total_words"] == 16  # 8 words + 8 words = 16 words
    assert res["processed_scenes"][0]["word_count"] == 8
    assert res["processed_scenes"][0]["estimated_speech_duration_seconds"] == 3.2


def test_scene_narrative_planner_worker():
    processed_scenes = [
        {
            "scene_id": "sc-1",
            "scene_version": 1,
            "sequence_index": 1,
            "section_type": "Curiosity Hook",
            "narration_text": "Hello world",
            "on_screen_text": "Hello",
            "target_duration_seconds": 10,
            "word_count": 2,
            "estimated_speech_duration_seconds": 0.8,
        }
    ]
    worker = SceneNarrativePlannerWorker()
    res = worker.execute(processed_scenes, topic="Python")

    assert len(res["scenes"]) == 1
    assert isinstance(res["scenes"][0], SceneSpecification)
    assert "visual_intent" in res["scenes"][0].model_dump()


def test_pacing_validator_exact_math():
    scenes = [
        SceneSpecification(
            scene_id="sc-1",
            scene_version=1,
            sequence_index=1,
            section_type="Hook",
            narration_text="Did you know functions are secretly objects? Here is why that changes everything.",
            on_screen_text="Functions = Objects",
            visual_intent="Code editor close up",
            target_duration_seconds=10,
            word_count=14,
            estimated_speech_duration_seconds=5.6,
        )
    ]
    worker = PacingValidatorWorker()
    res = worker.execute(scenes, target_duration_seconds=10, words_per_second=2.5)

    assert res["total_words"] == 14
    # 14 / 2.5 = 5.6s
    assert res["estimated_speech_duration_seconds"] == 5.6
    assert res["estimated_pause_transition_duration_seconds"] == 0.0
    # Total duration equals speech duration when pause engine is inactive (no manufactured 4.5s)
    assert res["estimated_total_duration_seconds"] == 5.6
    assert res["pacing_duration_gate"] is True


def test_pacing_impossible_duration_rejection():
    """Verify strict rejection when narration word count violates target duration window."""
    # 500 words in 10 seconds is impossible
    scenes = [
        SceneSpecification(
            scene_id=f"sc-{i}",
            scene_version=1,
            sequence_index=i,
            section_type="Overloaded",
            narration_text="Word " * 100,
            on_screen_text="Text",
            visual_intent="Visual",
            target_duration_seconds=10,
            word_count=100,
            estimated_speech_duration_seconds=40.0,
        )
        for i in range(1, 6)
    ]
    worker = PacingValidatorWorker()
    res = worker.execute(scenes, target_duration_seconds=10, words_per_second=2.5)
    assert res["pacing_duration_gate"] is False
