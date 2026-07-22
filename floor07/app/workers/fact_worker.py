"""Fact Verification Worker.

Analyses the script for unsupported claims and estimates factual confidence
using a deterministic heuristic model (Sprint 1 — no external AI calls).

Confidence is scored on:
  - presence of numeric claims without context (e.g. "100%", "always", "never")
  - use of absolute language patterns
  - script length (very short scripts are under-specified)
  - suspicious phrase patterns (common hallucination indicators)

The scoring model is calibrated so that clean educational content scores
above 0.85 (FACT_HIGH_CONFIDENCE_THRESHOLD).
"""

from __future__ import annotations

import re
import structlog

from app.core.constants import (
    FACT_HIGH_CONFIDENCE_THRESHOLD,
    FACT_LOW_CONFIDENCE_THRESHOLD,
    FACT_MEDIUM_CONFIDENCE_THRESHOLD,
    FACT_WORKER_ID,
)
from app.workers.base import BaseWorker, WorkerInput, WorkerResult

logger = structlog.get_logger(__name__)

# ── Patterns that reduce confidence ───────────────────────────────────────────
_ABSOLUTE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\b(always|never|everyone|nobody|all|none|every|no one)\b", re.IGNORECASE),
    re.compile(r"\b100\s*%\b"),
    re.compile(r"\b(proven|guaranteed|definitely|certainly|undeniably)\b", re.IGNORECASE),
]

_HALLUCINATION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\b(according to a study|research shows|scientists say)\b", re.IGNORECASE),
    re.compile(r"\b(as of \d{4}|in \d{4} studies?)\b", re.IGNORECASE),
    re.compile(r"\b(experts agree|widely accepted)\b", re.IGNORECASE),
]

_NUMERIC_CLAIM_PATTERN = re.compile(r"\b\d+(\.\d+)?\s*(times|x|%|percent|million|billion)\b")

# Minimum script word count for a reasonable fact check
_MIN_WORDS_FOR_RELIABLE_FACT: int = 20


class FactWorker(BaseWorker):
    """Sprint 1 fact verification using deterministic heuristics."""

    worker_id = FACT_WORKER_ID

    async def run(self, inp: WorkerInput) -> WorkerResult:
        log = logger.bind(
            worker=self.worker_id,
            artifact_id=inp.artifact_id,
            pipeline_run_id=inp.pipeline_run_id,
        )
        log.info("fact_worker_started")

        script = inp.script.strip()
        words = script.split()
        word_count = len(words)

        issues: list[str] = []
        evidence: list[dict[str, str]] = []
        penalty: float = 0.0

        # ── Check 1: Minimum content length ─────────────────────────────────
        if word_count < _MIN_WORDS_FOR_RELIABLE_FACT:
            issues.append(
                f"Script too short for reliable fact verification ({word_count} words; "
                f"minimum {_MIN_WORDS_FOR_RELIABLE_FACT})"
            )
            penalty += 0.10

        # ── Check 2: Absolute language ───────────────────────────────────────
        for pattern in _ABSOLUTE_PATTERNS:
            matches = pattern.findall(script)
            if matches:
                for m in set(matches):
                    issue = f"Absolute language detected: '{m}'"
                    issues.append(issue)
                    evidence.append({"type": "absolute_language", "match": m})
                    penalty += 0.05

        # ── Check 3: Hallucination phrase indicators ──────────────────────────
        for pattern in _HALLUCINATION_PATTERNS:
            matches = pattern.findall(script)
            if matches:
                for m in set(matches):
                    issue = f"Hallucination-risk phrase detected: '{m}'"
                    issues.append(issue)
                    evidence.append({"type": "hallucination_risk", "match": str(m)})
                    penalty += 0.10

        # ── Check 4: Unsourced numeric claims ─────────────────────────────────
        numeric_matches = _NUMERIC_CLAIM_PATTERN.findall(script)
        unsourced_count = len(numeric_matches)
        if unsourced_count > 3:
            issues.append(
                f"{unsourced_count} unsourced numeric claims detected. "
                "Consider citing sources."
            )
            penalty += min(0.05 * (unsourced_count - 3), 0.25)

        # ── Compute confidence ────────────────────────────────────────────────
        confidence: float = max(0.0, min(1.0, 1.0 - penalty))
        passed: bool = confidence >= FACT_HIGH_CONFIDENCE_THRESHOLD

        recommendations: list[str] = []
        if confidence < FACT_HIGH_CONFIDENCE_THRESHOLD:
            recommendations.append(
                "Reduce absolute language (always/never/100%) and add source citations."
            )
        if confidence < FACT_MEDIUM_CONFIDENCE_THRESHOLD:
            recommendations.append(
                "Content has significant factual risk. Manual review recommended."
            )

        log.info(
            "fact_worker_completed",
            confidence=confidence,
            passed=passed,
            issue_count=len(issues),
        )

        return WorkerResult(
            worker_id=self.worker_id,
            passed=passed,
            score=confidence,
            details={
                "word_count": word_count,
                "unsourced_numeric_claims": unsourced_count,
                "evidence": evidence,
            },
            issues=issues,
            recommendations=recommendations,
        )
