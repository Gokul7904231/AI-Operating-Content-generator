"""Core configuration and settings for Floor 02 (Scripting & Narrative)."""

import os
from pydantic import BaseModel


class Settings(BaseModel):
    FLOOR_ID: str = "floor02"
    FLOOR_NAME: str = "Scripting & Narrative"
    FLOOR_VERSION: str = "1.0.0"

    DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "gemini")
    DEFAULT_LLM_MODEL: str = os.getenv("DEFAULT_LLM_MODEL", "gemini-1.5-flash")
    DEFAULT_API_KEY: str = os.getenv("FLOOR02_API_KEY", "dev-secret-key-floor02")

    # Speech rate bounds & defaults
    DEFAULT_WORDS_PER_SECOND: float = 2.5  # ~150 wpm for short-form content
    DURATION_TOLERANCE_PCT: float = 0.15   # +/- 15% tolerance on target vs estimated duration

    # Rate Limiter settings
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 100

    # Memory storage
    MEMORY_STORAGE_PATH: str = os.getenv(
        "FLOOR02_MEMORY_PATH",
        "floors/floor02_scripting/storage/script_memory.json",
    )


settings = Settings()
