"""Typed exception hierarchy for Floor 07.

All exceptions carry an HTTP status code so the error-handler middleware
can produce consistent error responses without touching business logic.
"""

from __future__ import annotations

from http import HTTPStatus


class Floor07Error(Exception):
    """Base class for all Floor 07 exceptions."""

    status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR.value
    error_code: str = "internal_error"

    def __init__(self, message: str, *, detail: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.detail = detail or message


# ── 4xx Client Errors ─────────────────────────────────────────────────────────

class AuthenticationError(Floor07Error):
    """Raised when a request is missing or has an invalid API key."""

    status_code = HTTPStatus.UNAUTHORIZED.value
    error_code = "authentication_required"


class AuthorizationError(Floor07Error):
    """Raised when an authenticated caller lacks permission for the action."""

    status_code = HTTPStatus.FORBIDDEN.value
    error_code = "forbidden"


class ValidationError(Floor07Error):
    """Raised when input data fails validation."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY.value
    error_code = "validation_error"


class ArtifactNotFoundError(Floor07Error):
    """Raised when a requested artifact cannot be found."""

    status_code = HTTPStatus.NOT_FOUND.value
    error_code = "artifact_not_found"


class CertificateNotFoundError(Floor07Error):
    """Raised when a certificate record cannot be found."""

    status_code = HTTPStatus.NOT_FOUND.value
    error_code = "certificate_not_found"


class PolicyNotFoundError(Floor07Error):
    """Raised when no policy file exists for a given platform."""

    status_code = HTTPStatus.NOT_FOUND.value
    error_code = "policy_not_found"


# ── 5xx Server / Worker Errors ────────────────────────────────────────────────

class WorkerError(Floor07Error):
    """Raised when a pipeline worker fails unexpectedly."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR.value
    error_code = "worker_error"
    retryable: bool = False

    def __init__(
        self,
        message: str,
        *,
        worker_id: str,
        detail: str | None = None,
        retryable: bool = False,
    ) -> None:
        super().__init__(message, detail=detail)
        self.worker_id = worker_id
        self.retryable = retryable


class RetryableWorkerError(WorkerError):
    """Transient worker failure — the operation may succeed on retry."""

    error_code = "retryable_worker_error"

    def __init__(self, message: str, *, worker_id: str, detail: str | None = None) -> None:
        super().__init__(message, worker_id=worker_id, detail=detail, retryable=True)


class PipelineError(Floor07Error):
    """Raised when the certification pipeline cannot complete."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR.value
    error_code = "pipeline_error"


class DatabaseError(Floor07Error):
    """Raised when a database operation fails."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR.value
    error_code = "database_error"


class CacheError(Floor07Error):
    """Raised when a cache operation fails (non-fatal; pipelines continue)."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR.value
    error_code = "cache_error"


class SigningError(Floor07Error):
    """Raised when certificate signing fails."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR.value
    error_code = "signing_error"


# ── Clean Architecture Layer Exceptions ────────────────────────────────────────

class DomainException(Floor07Error):
    """Base class for domain rule violations."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY.value
    error_code = "domain_rule_violation"


class ApplicationException(Floor07Error):
    """Raised when a use case cannot complete its operation."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR.value
    error_code = "application_error"


class InfrastructureException(Floor07Error):
    """Raised when a database, cache, or external system call fails."""

    status_code = HTTPStatus.SERVICE_UNAVAILABLE.value
    error_code = "infrastructure_error"


class PolicyViolationException(DomainException):
    """Raised when content violates a CRITICAL platform policy rule."""

    error_code = "policy_violation"

    def __init__(self, message: str, *, rule_id: str, detail: str | None = None) -> None:
        super().__init__(message, detail=detail)
        self.rule_id = rule_id


class RateLimitError(Floor07Error):
    """Raised when a client exceeds the configured request rate limit."""

    status_code = HTTPStatus.TOO_MANY_REQUESTS.value
    error_code = "rate_limit_exceeded"
