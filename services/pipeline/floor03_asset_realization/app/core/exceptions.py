"""Exception hierarchy for Floor 03 (Asset Specification & Realization Planning)."""


class Floor03Error(Exception):
    """Base exception for Floor 03 errors."""

    pass


class Floor03ValidationError(Floor03Error):
    """Raised when contract or payload validation fails."""

    pass


class Floor03PlatformError(Floor03Error):
    """Raised when platform resolution fails or an unauthorized platform override is supplied."""

    pass


class Floor03SecurityError(Floor03Error):
    """Raised when input text or path sanitization fails security boundaries."""

    pass


class Floor03WorkerError(Floor03Error):
    """Raised when a logical worker encounters an execution error."""

    pass


class Floor03PipelineError(Floor03Error):
    """Raised when pipeline orchestration fails."""

    pass
