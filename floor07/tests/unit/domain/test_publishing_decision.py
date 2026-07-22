"""Domain tests: PublishingDecision value object.

Tests all decision values, StrEnum semantics, and comparison behaviour.
"""

from __future__ import annotations

import pytest

from app.domain.value_objects.decision import PublishingDecision


def test_decision_pass_value() -> None:
    assert PublishingDecision.PASS == "PASS"


def test_decision_repair_value() -> None:
    assert PublishingDecision.REPAIR == "REPAIR"


def test_decision_human_review_value() -> None:
    assert PublishingDecision.HUMAN_REVIEW == "HUMAN_REVIEW"


def test_decision_fail_value() -> None:
    assert PublishingDecision.FAIL == "FAIL"


def test_decision_is_str() -> None:
    """PublishingDecision instances must be regular strings (StrEnum)."""
    assert isinstance(PublishingDecision.PASS, str)
    assert isinstance(PublishingDecision.HUMAN_REVIEW, str)


def test_decision_comparison_with_string_pass() -> None:
    assert PublishingDecision.PASS == "PASS"


def test_decision_comparison_with_string_repair() -> None:
    assert PublishingDecision.REPAIR == "REPAIR"


def test_decision_comparison_with_string_human_review() -> None:
    assert PublishingDecision.HUMAN_REVIEW == "HUMAN_REVIEW"


def test_decision_comparison_inequality() -> None:
    assert PublishingDecision.PASS != PublishingDecision.REPAIR
    assert PublishingDecision.REPAIR != PublishingDecision.HUMAN_REVIEW


def test_decision_all_members_enumerable() -> None:
    members = list(PublishingDecision)
    assert PublishingDecision.PASS in members
    assert PublishingDecision.FAIL in members
    assert PublishingDecision.REPAIR in members
    assert PublishingDecision.HUMAN_REVIEW in members


def test_decision_from_string_pass() -> None:
    decision = PublishingDecision("PASS")
    assert decision == PublishingDecision.PASS


def test_decision_from_string_human_review() -> None:
    decision = PublishingDecision("HUMAN_REVIEW")
    assert decision == PublishingDecision.HUMAN_REVIEW


def test_decision_invalid_string_raises() -> None:
    with pytest.raises(ValueError):
        PublishingDecision("BLOCK")  # Not a valid member


def test_decision_name_attribute() -> None:
    assert PublishingDecision.PASS.name == "PASS"
    assert PublishingDecision.HUMAN_REVIEW.name == "HUMAN_REVIEW"


def test_decision_value_attribute() -> None:
    assert PublishingDecision.PASS.value == "PASS"
    assert PublishingDecision.REPAIR.value == "REPAIR"
