"""Value object: PublishingDecision."""

from __future__ import annotations

from enum import StrEnum


class PublishingDecision(StrEnum):
    """Final publishing gate decision."""

    PASS = "PASS"
    FAIL = "FAIL"
    REPAIR = "REPAIR"
    HUMAN_REVIEW = "HUMAN_REVIEW"
