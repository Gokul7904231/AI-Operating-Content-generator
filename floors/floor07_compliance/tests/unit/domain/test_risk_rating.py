"""Domain tests: RiskRating value object.

Tests ordering, from_score mapping, is_blocking predicate, label, and custom thresholds.
"""

from __future__ import annotations

import pytest

from app.domain.value_objects.risk_rating import RiskRating


# ── Ordering tests ────────────────────────────────────────────────────────────

def test_risk_rating_ordering_low_lt_medium() -> None:
    assert RiskRating.LOW < RiskRating.MEDIUM


def test_risk_rating_ordering_medium_lt_high() -> None:
    assert RiskRating.MEDIUM < RiskRating.HIGH


def test_risk_rating_ordering_high_lt_critical() -> None:
    assert RiskRating.HIGH < RiskRating.CRITICAL


def test_risk_rating_full_ordering() -> None:
    ordered = sorted([RiskRating.CRITICAL, RiskRating.LOW, RiskRating.HIGH, RiskRating.MEDIUM])
    assert ordered == [RiskRating.LOW, RiskRating.MEDIUM, RiskRating.HIGH, RiskRating.CRITICAL]


# ── from_score tests (default thresholds: low=0.25, medium=0.55, high=0.80) ──

def test_risk_rating_from_score_low() -> None:
    assert RiskRating.from_score(0.10) == RiskRating.LOW


def test_risk_rating_from_score_at_low_boundary() -> None:
    # score == 0.00 → LOW
    assert RiskRating.from_score(0.00) == RiskRating.LOW


def test_risk_rating_from_score_medium() -> None:
    assert RiskRating.from_score(0.40) == RiskRating.MEDIUM


def test_risk_rating_from_score_at_medium_boundary() -> None:
    # score == 0.25 → MEDIUM (not LOW: < low_threshold means LOW)
    assert RiskRating.from_score(0.25) == RiskRating.MEDIUM


def test_risk_rating_from_score_high() -> None:
    assert RiskRating.from_score(0.65) == RiskRating.HIGH


def test_risk_rating_from_score_at_high_boundary() -> None:
    assert RiskRating.from_score(0.55) == RiskRating.HIGH


def test_risk_rating_from_score_critical() -> None:
    assert RiskRating.from_score(0.90) == RiskRating.CRITICAL


def test_risk_rating_from_score_at_critical_boundary() -> None:
    assert RiskRating.from_score(0.80) == RiskRating.CRITICAL


def test_risk_rating_from_score_max() -> None:
    assert RiskRating.from_score(1.0) == RiskRating.CRITICAL


# ── is_blocking tests ─────────────────────────────────────────────────────────

def test_risk_rating_low_is_not_blocking() -> None:
    assert RiskRating.LOW.is_blocking() is False


def test_risk_rating_medium_is_not_blocking() -> None:
    assert RiskRating.MEDIUM.is_blocking() is False


def test_risk_rating_high_is_blocking() -> None:
    assert RiskRating.HIGH.is_blocking() is True


def test_risk_rating_critical_is_blocking() -> None:
    assert RiskRating.CRITICAL.is_blocking() is True


# ── label tests ───────────────────────────────────────────────────────────────

def test_risk_rating_label_low() -> None:
    assert RiskRating.LOW.label == "LOW"


def test_risk_rating_label_medium() -> None:
    assert RiskRating.MEDIUM.label == "MEDIUM"


def test_risk_rating_label_high() -> None:
    assert RiskRating.HIGH.label == "HIGH"


def test_risk_rating_label_critical() -> None:
    assert RiskRating.CRITICAL.label == "CRITICAL"


# ── Custom thresholds ─────────────────────────────────────────────────────────

def test_risk_rating_from_score_custom_thresholds_low() -> None:
    rating = RiskRating.from_score(0.10, low_threshold=0.20, medium_threshold=0.50, high_threshold=0.75)
    assert rating == RiskRating.LOW


def test_risk_rating_from_score_custom_thresholds_medium() -> None:
    rating = RiskRating.from_score(0.35, low_threshold=0.20, medium_threshold=0.50, high_threshold=0.75)
    assert rating == RiskRating.MEDIUM


def test_risk_rating_from_score_custom_thresholds_high() -> None:
    rating = RiskRating.from_score(0.60, low_threshold=0.20, medium_threshold=0.50, high_threshold=0.75)
    assert rating == RiskRating.HIGH


def test_risk_rating_from_score_custom_thresholds_critical() -> None:
    rating = RiskRating.from_score(0.80, low_threshold=0.20, medium_threshold=0.50, high_threshold=0.75)
    assert rating == RiskRating.CRITICAL


# ── IntEnum semantics ─────────────────────────────────────────────────────────

def test_risk_rating_is_int_enum() -> None:
    assert isinstance(RiskRating.LOW, int)


def test_risk_rating_values_are_ordered_integers() -> None:
    assert RiskRating.LOW.value == 1
    assert RiskRating.MEDIUM.value == 2
    assert RiskRating.HIGH.value == 3
    assert RiskRating.CRITICAL.value == 4
