"""Core configuration settings for Floor 03 (Asset Specification & Realization Planning)."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    FLOOR_ID: str = "floor03"
    FLOOR_VERSION: str = "1.0.0"
    DEFAULT_API_KEY: str = "factoryos-floor03-dev-key"
    STORAGE_PATH: str = "floors/floor03_asset_realization/storage/asset_memory.json"
    MAX_MEMORY_RECORDS: int = 1000

    # Platform default spec mappings (used ONLY when platform is resolved)
    PLATFORM_SPECS: dict = {
        "youtube_shorts": {"aspect_ratio": "9:16", "resolution": "1080x1920"},
        "tiktok": {"aspect_ratio": "9:16", "resolution": "1080x1920"},
        "instagram_reels": {"aspect_ratio": "9:16", "resolution": "1080x1920"},
        "linkedin_video": {"aspect_ratio": "16:9", "resolution": "1920x1080"},
        "twitter_video": {"aspect_ratio": "16:9", "resolution": "1920x1080"},
    }

    # Configuration default fallback platform (used ONLY if no upstream platform exists and no caller override provided)
    DEFAULT_FALLBACK_PLATFORM: str = "youtube_shorts"


settings = Settings()
