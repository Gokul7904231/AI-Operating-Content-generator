"""Exception hierarchy for Floor 02 (Scripting & Narrative)."""


class Floor02Error(Exception):
    """Base exception for all Floor 02 errors."""
    pass


class Floor02ValidationError(Floor02Error):
    """Raised when input validation or script schema checks fail."""
    pass


class Floor02PacingError(Floor02Error):
    """Raised when script word count violates target duration constraints."""
    pass


class Floor02SecurityError(Floor02Error):
    """Raised when authentication, rate limits, or input sanitization checks fail."""
    pass


class Floor02WorkerError(Floor02Error):
    """Raised when a logical worker fails execution."""
    pass


class Floor02PipelineError(Floor02Error):
    """Raised when pipeline orchestration fails."""
    pass
