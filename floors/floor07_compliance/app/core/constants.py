"""Application-wide typed constants.  No magic strings anywhere else."""

from __future__ import annotations

# ── API ───────────────────────────────────────────────────────────────────────
API_V1_PREFIX: str = "/v1"
API_TITLE: str = "Floor 07 — Content Integrity & Compliance"
API_DESCRIPTION: str = (
    "FactoryOS Floor 07 Quality Gate. "
    "Validates content against fact, policy, risk and issues a signed certificate."
)

# ── Headers ───────────────────────────────────────────────────────────────
CORRELATION_ID_HEADER: str = "X-Correlation-ID"
REQUEST_ID_HEADER: str = "X-Request-ID"
IDEMPOTENCY_HEADER: str = "Idempotency-Key"
X_FACTORY_KEY_HEADER: str = "X-Factory-Key"

# ── Pipeline ──────────────────────────────────────────────────────────────────
PIPELINE_VERSION: str = "1.0"
MAX_CORRECTION_CYCLES: int = 3

# ── Workers ───────────────────────────────────────────────────────────────────
FACT_WORKER_ID: str = "fact_worker"
POLICY_WORKER_ID: str = "policy_worker"
RISK_WORKER_ID: str = "risk_worker"
CERTIFICATE_WORKER_ID: str = "certificate_worker"

# ── Risk weights ─────────────────────────────────────────────────────────────
#  Must sum to 1.0
RISK_WEIGHT_FACT: float = 0.40
RISK_WEIGHT_POLICY: float = 0.60

# ── Cache keys ─────────────────────────────────────────────────────────────
CACHE_KEY_POLICY: str = "floor07:policy:{platform}"
CACHE_KEY_CERTIFICATE: str = "floor07:cert:{artifact_id}"
CACHE_KEY_IDEMPOTENCY: str = "floor07:idempotency:{key}"
CACHE_KEY_RATE_LIMIT_MINUTE: str = "floor07:ratelimit:{ip}:min:{ts}"
CACHE_KEY_RATE_LIMIT_HOUR: str = "floor07:ratelimit:{ip}:hour:{ts}"

# ── Idempotency ─────────────────────────────────────────────────────────────
IDEMPOTENCY_TTL_SECONDS: int = 3600

# ── Worker versions ──────────────────────────────────────────────────────────
FACT_WORKER_VERSION: str = "1.0.0"
POLICY_WORKER_VERSION: str = "1.0.0"
RISK_WORKER_VERSION: str = "1.0.0"
CERTIFICATE_WORKER_VERSION: str = "1.0.0"

# ── Fact verification ─────────────────────────────────────────────────────────
FACT_HIGH_CONFIDENCE_THRESHOLD: float = 0.85
FACT_MEDIUM_CONFIDENCE_THRESHOLD: float = 0.65
FACT_LOW_CONFIDENCE_THRESHOLD: float = 0.40

# ── Platforms ─────────────────────────────────────────────────────────────────
DEFAULT_PLATFORM: str = "default"
