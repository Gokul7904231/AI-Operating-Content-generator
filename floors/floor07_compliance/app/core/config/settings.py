"""Application settings loaded from environment variables via Pydantic v2."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All application settings.  Loaded once from the environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    app_env: str = Field(default="development")
    app_name: str = Field(default="floor07")
    app_version: str = Field(default="0.1.0")
    debug: bool = Field(default=False)
    guardian_version: str = Field(default="0.1.0")

    # ── API ──────────────────────────────────────────────────────────────────
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000, ge=1, le=65535)
    api_workers: int = Field(default=1, ge=1)

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://floor07:floor07secret@localhost:5432/floor07"
    )
    database_pool_size: int = Field(default=10, ge=1, le=100)
    database_max_overflow: int = Field(default=20, ge=0, le=100)
    database_pool_timeout: int = Field(default=30, ge=1)

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = Field(default="redis://localhost:6379/0")
    redis_policy_ttl_seconds: int = Field(default=3600, ge=60)
    redis_certificate_ttl_seconds: int = Field(default=300, ge=10)

    # ── Security ─────────────────────────────────────────────────────────────
    signing_secret_key: str = Field(min_length=32)

    # ── Authentication ────────────────────────────────────────────────────────
    auth_enabled: bool = Field(default=True)
    factory_api_keys: list[str] = Field(default_factory=list)

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    rate_limit_per_minute: int = Field(default=100, ge=1)
    rate_limit_per_hour: int = Field(default=1000, ge=1)
    rate_limit_enabled: bool = Field(default=True)
    trusted_proxy_ips: list[str] = Field(default_factory=list)

    # ── Policy ───────────────────────────────────────────────────────────────
    policy_data_dir: Path = Field(default=Path("./data/policies"))

    # ── Logging ──────────────────────────────────────────────────────────────
    log_level: str = Field(default="INFO")
    log_format: str = Field(default="json")

    # ── Risk thresholds ───────────────────────────────────────────────────────
    risk_low_threshold: float = Field(default=0.25, ge=0.0, le=1.0)
    risk_medium_threshold: float = Field(default=0.55, ge=0.0, le=1.0)
    risk_high_threshold: float = Field(default=0.80, ge=0.0, le=1.0)

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.upper()
        if upper not in allowed:
            raise ValueError(f"log_level must be one of {allowed}")
        return upper

    @field_validator("log_format")
    @classmethod
    def validate_log_format(cls, v: str) -> str:
        allowed = {"json", "console"}
        lower = v.lower()
        if lower not in allowed:
            raise ValueError(f"log_format must be one of {allowed}")
        return lower

    @model_validator(mode="after")
    def validate_risk_thresholds(self) -> "Settings":
        if not (self.risk_low_threshold < self.risk_medium_threshold < self.risk_high_threshold):
            raise ValueError(
                "Risk thresholds must satisfy: low < medium < high. "
                f"Got: {self.risk_low_threshold} < {self.risk_medium_threshold} < {self.risk_high_threshold}"
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached Settings singleton.  Call this everywhere."""
    return Settings()
