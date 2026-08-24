"""Configuration settings for Floor 01 (Strategy & Intelligence).

Managed via Pydantic Settings with env override support.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List, Set

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Floor01Settings(BaseSettings):
    """Central configuration for Floor 01."""

    model_config = SettingsConfigDict(
        env_prefix="FLOOR01_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    floor_id: str = Field(default="floor01")
    floor_name: str = Field(default="Strategy & Intelligence")
    floor_version: str = Field(default="1.0.0")

    # Thresholds
    similarity_warning_threshold: float = Field(default=0.45, ge=0.0, le=1.0)
    similarity_rejection_threshold: float = Field(default=0.75, ge=0.0, le=1.0)
    min_confidence_threshold: float = Field(default=0.70, ge=0.0, le=1.0)

    # Supported Enums / Parameters
    supported_platforms: List[str] = Field(
        default_factory=lambda: [
            "youtube_shorts",
            "tiktok",
            "instagram_reels",
            "linkedin_video",
            "twitter_video",
        ]
    )
    supported_formats: List[str] = Field(
        default_factory=lambda: [
            "educational_short",
            "quiz_short",
            "story_short",
            "news_breakdown",
        ]
    )
    supported_difficulties: List[str] = Field(
        default_factory=lambda: ["beginner", "intermediate", "advanced"]
    )

    # Duration Boundaries
    min_duration_seconds: int = Field(default=15, ge=5)
    max_duration_seconds: int = Field(default=180, le=600)
    default_duration_seconds: int = Field(default=60)

    # Memory Store File Path
    memory_file_path: str = Field(default="floors/floor01_strategy/data/memory.json")

    # Logging
    log_level: str = Field(default="INFO")


@lru_cache(maxsize=1)
def get_settings() -> Floor01Settings:
    """Return cached Settings instance."""
    return Floor01Settings()
