"""Unit tests for domain-aware verification rules (Floor 01, Floor 02, Floor 03)."""

import pytest

from factoryos.guardian.core.exceptions import GuardianValidationError
from factoryos.guardian.verification.validator import DomainValidator


def test_floor01_verification_success():
    valid_f01 = {
        "topic": {"selected_topic": "Python Decorators"},
        "strategy": {"platform": "youtube_shorts"},
        "curriculum": {"learning_objectives": ["Understand higher order functions"]},
    }
    DomainValidator.verify_floor01_output(valid_f01)


def test_floor01_verification_missing_topic_rejection():
    invalid_f01 = {
        "topic": {},
        "strategy": {"platform": "youtube_shorts"},
        "curriculum": {"learning_objectives": ["Obj"]},
    }
    with pytest.raises(GuardianValidationError) as exc_info:
        DomainValidator.verify_floor01_output(invalid_f01)

    assert "Missing selected topic" in str(exc_info.value)


def test_floor02_verification_success():
    valid_f02 = {
        "scenes": [
            {"scene_id": "sc-1", "word_count": 10},
            {"scene_id": "sc-2", "word_count": 15},
        ]
    }
    DomainValidator.verify_floor02_output(valid_f02)


def test_floor02_verification_empty_scenes_rejection():
    invalid_f02 = {"scenes": []}
    with pytest.raises(GuardianValidationError) as exc_info:
        DomainValidator.verify_floor02_output(invalid_f02)

    assert "contains 0 scenes" in str(exc_info.value)


def test_floor03_verification_asset_id_equals_scene_id_rejection():
    """Verify invariant: asset_id must NOT equal scene_id."""
    invalid_f03 = {
        "visual_asset_requirements": [
            {"asset_id": "sc-1", "scene_id": "sc-1", "prompt_text": "Prompt"}
        ],
        "manifest": {"total_visual_assets": 1},
    }
    with pytest.raises(GuardianValidationError) as exc_info:
        DomainValidator.verify_floor03_output(invalid_f03)

    assert "asset_id 'sc-1' must NOT equal scene_id 'sc-1'" in str(exc_info.value)
