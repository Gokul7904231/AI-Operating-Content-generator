"""Value object: RiskRating.

An ordered enumeration of risk levels.  Lower ordinal = lower risk.
"""

from __future__ import annotations

from enum import IntEnum


class RiskRating(IntEnum):
    """Ordered risk levels.  Compare with < > == naturally."""

    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

    @property
    def label(self) -> str:
        return self.name

    def is_blocking(self) -> bool:
        """Returns True if this risk rating should block publishing."""
        return self >= RiskRating.HIGH

    @classmethod
    def from_score(
        cls,
        score: float,
        low_threshold: float = 0.25,
        medium_threshold: float = 0.55,
        high_threshold: float = 0.80,
    ) -> "RiskRating":
        """Map a 0.0–1.0 risk score to a RiskRating."""
        if score < low_threshold:
            return cls.LOW
        if score < medium_threshold:
            return cls.MEDIUM
        if score < high_threshold:
            return cls.HIGH
        return cls.CRITICAL
