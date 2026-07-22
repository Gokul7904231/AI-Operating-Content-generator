"""Risk Assessment Worker.

Aggregates fact and policy worker scores into a final risk score and rating.

Weights (must sum to 1.0):
  FACT  : 0.40
  POLICY: 0.60

Risk rating thresholds are loaded from settings so they can be tuned
without redeployment.
"""

from __future__ import annotations

import structlog

from app.core.config import get_settings
from app.core.constants import RISK_WEIGHT_FACT, RISK_WEIGHT_POLICY, RISK_WORKER_ID
from app.domain.value_objects.risk_rating import RiskRating
from app.workers.base import BaseWorker, WorkerInput, WorkerResult

logger = structlog.get_logger(__name__)


class RiskWorker(BaseWorker):
    """Weighted risk aggregation worker."""

    worker_id = RISK_WORKER_ID

    async def run(
        self,
        inp: WorkerInput,
        *,
        fact_score: float,
        policy_score: float,
    ) -> WorkerResult:
        """Compute aggregate risk from upstream worker scores.

        Note: RiskWorker.run takes extra keyword arguments for the scores
        from upstream workers.  The pipeline passes them explicitly.
        """
        log = logger.bind(
            worker=self.worker_id,
            artifact_id=inp.artifact_id,
        )
        log.info("risk_worker_started", fact_score=fact_score, policy_score=policy_score)

        settings = get_settings()

        # Fact score is "confidence" — high is good.
        # Policy score is "compliance fraction" — high is good.
        # Risk = 1 - weighted_goodness
        goodness = (fact_score * RISK_WEIGHT_FACT) + (policy_score * RISK_WEIGHT_POLICY)
        risk_score = max(0.0, min(1.0, 1.0 - goodness))

        rating = RiskRating.from_score(
            risk_score,
            low_threshold=settings.risk_low_threshold,
            medium_threshold=settings.risk_medium_threshold,
            high_threshold=settings.risk_high_threshold,
        )

        passed = not rating.is_blocking()

        issues: list[str] = []
        recommendations: list[str] = []

        if rating == RiskRating.CRITICAL:
            issues.append(
                "CRITICAL risk level — content must not be published without human review."
            )
            recommendations.append("Escalate to human review immediately.")
        elif rating == RiskRating.HIGH:
            issues.append("HIGH risk level — content requires repair before publishing.")
            recommendations.append("Address all policy violations and re-run validation.")
        elif rating == RiskRating.MEDIUM:
            recommendations.append(
                "MEDIUM risk — consider addressing minor issues before publishing."
            )

        log.info(
            "risk_worker_completed",
            risk_score=risk_score,
            risk_rating=rating.label,
            passed=passed,
        )

        return WorkerResult(
            worker_id=self.worker_id,
            passed=passed,
            score=risk_score,
            details={
                "risk_score": risk_score,
                "risk_rating": rating.label,
                "fact_score": fact_score,
                "policy_score": policy_score,
                "weight_fact": RISK_WEIGHT_FACT,
                "weight_policy": RISK_WEIGHT_POLICY,
                "thresholds": {
                    "low": settings.risk_low_threshold,
                    "medium": settings.risk_medium_threshold,
                    "high": settings.risk_high_threshold,
                },
            },
            issues=issues,
            recommendations=recommendations,
        )
