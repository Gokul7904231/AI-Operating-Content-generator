"""Formal Storage & Provenance Registry for Floor 04 Media Assets."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field
import structlog

from factoryos.guardian.core.exceptions import GuardianValidationError
from floors.floor04_media_synthesis.app.domain.handoff import RightsMetadata

logger = structlog.get_logger(__name__)


class MediaAssetRecord(BaseModel):
    """Detailed metadata record for physical media asset registered in Floor 04 Storage Registry."""

    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(...)
    asset_version: int = Field(default=1, ge=1)
    scene_id: str = Field(...)
    source_spec_hash: str = Field(..., description="Hash tying physical asset directly back to Floor 03 specification")
    sha256_checksum: str = Field(...)
    file_size_bytes: int = Field(..., gt=0)
    mime_type: str = Field(...)
    media_type: str = Field(..., description="visual | audio | background_audio")
    width: Optional[int] = Field(default=None)
    height: Optional[int] = Field(default=None)
    duration_seconds: Optional[float] = Field(default=None)
    codec: Optional[str] = Field(default=None)
    sample_rate_hz: Optional[int] = Field(default=None)
    provider_name: str = Field(...)
    model_name: str = Field(default="deterministic_engine")
    generation_request_id: str = Field(...)
    transaction_id: str = Field(...)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    validation_status: str = Field(default="VALIDATED")
    storage_path: str = Field(...)
    rights_metadata: RightsMetadata = Field(...)


class MediaAssetRegistry:
    """Persistent registry tracking physical media assets and provenance linkage to Floor 03 specs."""

    def __init__(self, registry_file_path: Optional[str] = None):
        if registry_file_path:
            self.file_path = Path(registry_file_path).resolve()
        else:
            self.file_path = Path("data/media_storage/media_registry.json").resolve()

        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self._records: Dict[str, MediaAssetRecord] = {}
        self._load()

    def _load(self) -> None:
        if self.file_path.exists():
            try:
                raw = json.loads(self.file_path.read_text(encoding="utf-8"))
                for k, v in raw.items():
                    self._records[k] = MediaAssetRecord.model_validate(v)
            except Exception as e:
                logger.error("media_registry_load_failed", error=str(e))
                self._records = {}

    def _save(self) -> None:
        raw = {k: v.model_dump(mode="json") for k, v in self._records.items()}
        self.file_path.write_text(json.dumps(raw, indent=2, default=str), encoding="utf-8")

    def register_asset(self, record: MediaAssetRecord) -> None:
        """Register physical media asset in storage registry."""
        if not record.source_spec_hash:
            raise GuardianValidationError(f"Provenance Violation: Asset '{record.asset_id}' missing source_spec_hash.")
        if not record.sha256_checksum:
            raise GuardianValidationError(f"Integrity Violation: Asset '{record.asset_id}' missing sha256_checksum.")

        self._records[record.asset_id] = record
        self._save()
        logger.info("media_asset_registered", asset_id=record.asset_id, spec_hash=record.source_spec_hash, sha256=record.sha256_checksum)

    def get_asset(self, asset_id: str) -> Optional[MediaAssetRecord]:
        return self._records.get(asset_id)

    def list_assets(self) -> List[MediaAssetRecord]:
        return list(self._records.values())

    def verify_spec_linkage(self, asset_id: str, expected_spec_hash: str) -> bool:
        rec = self.get_asset(asset_id)
        if not rec:
            return False
        return rec.source_spec_hash == expected_spec_hash
