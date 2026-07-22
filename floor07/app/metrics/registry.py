"""Prometheus metrics registry for Floor07.

All metrics are module-level singletons — created once at import time.
Instruments are labeled for multi-tenant observability (Sprint 2: organization_id).

Exposed at: GET /metrics
"""

from __future__ import annotations

from prometheus_client import Counter, Histogram, Gauge

# ── Validation metrics ────────────────────────────────────────────────────────

validation_requests_total = Counter(
    "floor07_validation_requests_total",
    "Total number of validation requests received",
    ["platform", "content_type", "decision"],
)

validation_latency_seconds = Histogram(
    "floor07_validation_latency_seconds",
    "End-to-end validation pipeline latency",
    ["platform"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

validation_failures_total = Counter(
    "floor07_validation_failures_total",
    "Total number of validation pipeline failures",
    ["reason"],
)

# ── Worker stage metrics ──────────────────────────────────────────────────────

worker_stage_latency_seconds = Histogram(
    "floor07_worker_stage_latency_seconds",
    "Per-stage worker latency",
    ["worker_id"],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
)

# ── Policy metrics ────────────────────────────────────────────────────────────

rule_trigger_total = Counter(
    "floor07_rule_trigger_total",
    "Number of times each policy rule was triggered (violated)",
    ["rule_id", "severity", "platform"],
)

policy_cache_hits_total = Counter(
    "floor07_policy_cache_hits_total",
    "Number of policy cache hits",
    ["platform"],
)

policy_cache_misses_total = Counter(
    "floor07_policy_cache_misses_total",
    "Number of policy cache misses (loaded from disk)",
    ["platform"],
)

# ── Certificate metrics ───────────────────────────────────────────────────────

certificate_generated_total = Counter(
    "floor07_certificate_generated_total",
    "Total number of certificates issued",
    ["decision", "risk_rating"],
)

# ── Rate limiting metrics ─────────────────────────────────────────────────────

rate_limit_blocked_total = Counter(
    "floor07_rate_limit_blocked_total",
    "Number of requests rejected due to rate limiting",
    ["window"],
)

# ── Idempotency metrics ───────────────────────────────────────────────────────

idempotency_cache_hits_total = Counter(
    "floor07_idempotency_cache_hits_total",
    "Number of idempotency cache hits (duplicate requests served from cache)",
)
