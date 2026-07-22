"""Policy Worker.

Loads platform-specific rules from local JSON files (cached in Redis),
evaluates each rule against the artifact, and returns violations.

Rule evaluation strategies:
  - REGEX:  The artifact field must not match the pattern.
  - MIN_LENGTH: The field must be >= min_length characters.
  - MAX_LENGTH: The field must be <= max_length characters.
  - REQUIRED_FIELD: The metadata dict must contain the key.
  - PROHIBITED_WORDS: The field must not contain any listed words.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import structlog

from app.core.config import get_settings
from app.core.constants import (
    CACHE_KEY_POLICY,
    DEFAULT_PLATFORM,
    POLICY_WORKER_ID,
)
from app.core.exceptions import PolicyNotFoundError, WorkerError
from app.infrastructure.cache.redis_client import get_redis_client
from app.workers.base import BaseWorker, WorkerInput, WorkerResult

logger = structlog.get_logger(__name__)


def _load_policy_file(platform: str) -> dict[str, Any]:
    """Load policy JSON from data/policies/{platform}.json."""
    settings = get_settings()
    policy_dir = Path(settings.policy_data_dir)

    # Try exact platform match, then fall back to default
    for candidate in (platform, DEFAULT_PLATFORM):
        path = policy_dir / f"{candidate}.json"
        if path.exists():
            with path.open() as fh:
                return json.load(fh)  # type: ignore[no-any-return]

    raise PolicyNotFoundError(
        f"No policy file found for platform '{platform}' and no default policy available.",
        detail=f"Searched: {policy_dir}/{platform}.json and {policy_dir}/default.json",
    )


async def _get_policy(platform: str) -> dict[str, Any]:
    """Return policy for platform, using Redis cache when available."""
    settings = get_settings()
    cache = get_redis_client()
    cache_key = CACHE_KEY_POLICY.format(platform=platform)

    cached = await cache.get_json(cache_key)
    if cached is not None:
        return cached  # type: ignore[return-value]

    policy = _load_policy_file(platform)
    await cache.set_json(cache_key, policy, ttl_seconds=settings.redis_policy_ttl_seconds)
    return policy


def _evaluate_rule(
    rule: dict[str, Any],
    inp: WorkerInput,
) -> tuple[bool, str | None]:
    """Evaluate a single rule.  Returns (passed, violation_message | None)."""
    rule_id: str = rule.get("id", "unknown")
    strategy: str = rule.get("strategy", "")
    field: str = rule.get("field", "")
    severity: str = rule.get("severity", "MEDIUM")

    # Resolve field value from the input
    field_value: str | None = None
    if field == "title":
        field_value = inp.title
    elif field == "script":
        field_value = inp.script
    elif field.startswith("metadata."):
        key = field.removeprefix("metadata.")
        field_value = str(inp.metadata.get(key, ""))
    else:
        field_value = ""

    field_value = field_value or ""

    if strategy == "MAX_LENGTH":
        max_len: int = rule.get("max_length", 9999)
        if len(field_value) > max_len:
            return False, (
                f"[{rule_id}] '{field}' exceeds max length {max_len} "
                f"(actual: {len(field_value)}) [{severity}]"
            )

    elif strategy == "MIN_LENGTH":
        min_len: int = rule.get("min_length", 0)
        if len(field_value) < min_len:
            return False, (
                f"[{rule_id}] '{field}' below min length {min_len} "
                f"(actual: {len(field_value)}) [{severity}]"
            )

    elif strategy == "REGEX":
        pattern: str = rule.get("pattern", "")
        if re.search(pattern, field_value, re.IGNORECASE):
            return False, (
                f"[{rule_id}] '{field}' matched prohibited pattern /{pattern}/ [{severity}]"
            )

    elif strategy == "PROHIBITED_WORDS":
        words: list[str] = rule.get("words", [])
        for word in words:
            if re.search(rf"\b{re.escape(word)}\b", field_value, re.IGNORECASE):
                return False, (
                    f"[{rule_id}] '{field}' contains prohibited word '{word}' [{severity}]"
                )

    elif strategy == "REQUIRED_FIELD":
        key: str = rule.get("key", "")
        if not inp.metadata.get(key):
            return False, (
                f"[{rule_id}] Required metadata field '{key}' is missing or empty [{severity}]"
            )

    return True, None


class PolicyWorker(BaseWorker):
    """Platform policy compliance worker."""

    worker_id = POLICY_WORKER_ID

    async def run(self, inp: WorkerInput) -> WorkerResult:
        log = logger.bind(
            worker=self.worker_id,
            artifact_id=inp.artifact_id,
            platform=inp.platform,
        )
        log.info("policy_worker_started")

        try:
            policy = await _get_policy(inp.platform)
        except PolicyNotFoundError:
            # Fall back to default policy
            try:
                policy = await _get_policy(DEFAULT_PLATFORM)
                log.warning("policy_fallback_to_default", platform=inp.platform)
            except PolicyNotFoundError as exc:
                raise WorkerError(
                    f"Policy worker failed: {exc.message}",
                    worker_id=self.worker_id,
                    detail=exc.detail,
                ) from exc

        rules: list[dict[str, Any]] = policy.get("rules", [])
        violations: list[str] = []
        critical_violations: list[str] = []
        recommendations: list[str] = policy.get("recommendations", [])

        for rule in rules:
            passed, message = _evaluate_rule(rule, inp)
            if not passed and message:
                violations.append(message)
                if rule.get("severity") == "CRITICAL":
                    critical_violations.append(message)

        total = len(rules)
        violation_count = len(violations)
        passed_count = total - violation_count

        # Score: fraction of rules passed
        score = passed_count / total if total > 0 else 1.0
        passed = len(critical_violations) == 0 and violation_count <= (total * 0.20)

        log.info(
            "policy_worker_completed",
            total_rules=total,
            violations=violation_count,
            critical=len(critical_violations),
            score=score,
            passed=passed,
        )

        return WorkerResult(
            worker_id=self.worker_id,
            passed=passed,
            score=score,
            details={
                "platform": inp.platform,
                "policy_version": policy.get("version", "unknown"),
                "total_rules": total,
                "passed_rules": passed_count,
                "violation_count": violation_count,
                "critical_violations": critical_violations,
            },
            issues=violations,
            recommendations=recommendations,
        )
