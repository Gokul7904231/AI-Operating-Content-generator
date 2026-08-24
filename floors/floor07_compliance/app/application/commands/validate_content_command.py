"""Application command: ValidateContentCommand.

A frozen dataclass that represents a user's intent to validate a content artifact.
This is the input to ValidateContentUseCase and carries no HTTP/framework concerns.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ValidateContentCommand:
    """Immutable command object passed into the ValidateContentUseCase.

    Carries all data required to run the validation pipeline, plus caller
    identity resolved by the authentication layer.
    """

    title: str
    script: str
    platform: str
    language: str
    content_type: str

    # Caller identity (resolved by auth layer — Sprint 2: org/project quota)
    requester_id: str = "anonymous"
    organization_id: str | None = None
    project_id: str | None = None

    # Optional metadata dict
    metadata: dict[str, Any] = field(default_factory=dict)

    # Idempotency key from the HTTP header (None if not provided)
    idempotency_key: str | None = None
