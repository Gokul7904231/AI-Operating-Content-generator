"""Domain models and handoff contracts for Floor 04 Media Synthesis & Provider Execution."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from factoryos.guardian.contracts.guardian_state import ExecutionMode
from floors.floor03_asset_realization.app.domain.handoff import Floor03HandoffPayload


class AssetSourceType(str, Enum):
    DETERMINISTIC_SYNTHESIS = "DETERMINISTIC_SYNTHESIS"
    STOCK_LIBRARY = "STOCK_LIBRARY"
    AI_PROVIDER = "AI_PROVIDER"
    ROYALTY_FREE = "ROYALTY_FREE"


class RightsMetadata(BaseModel):
    """Licensing and usage rights metadata for media assets."""

    model_config = ConfigDict(extra="forbid")

    source_type: AssetSourceType = Field(...)
    provider_name: str = Field(...)
    license_type: str = Field(default="ROYALTY_FREE")
    attribution_required: bool = Field(default=False)
    usage_restrictions: Optional[str] = Field(default=None)
    acquired_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SynthesizedVisualAsset(BaseModel):
    """Verified physical visual asset generated/acquired by Floor 04."""

    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(...)
    scene_id: str = Field(...)
    file_path: str = Field(...)
    mime_type: str = Field(...)
    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)
    sha256_checksum: str = Field(...)
    file_size_bytes: int = Field(..., gt=0)
    provenance_hash: str = Field(...)
    rights_metadata: RightsMetadata = Field(...)


class SynthesizedAudioAsset(BaseModel):
    """Verified physical audio asset generated/acquired by Floor 04."""

    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(...)
    scene_id: str = Field(...)
    file_path: str = Field(...)
    mime_type: str = Field(...)
    duration_seconds: float = Field(..., gt=0.0)
    sample_rate_hz: int = Field(..., gt=0)
    sha256_checksum: str = Field(...)
    file_size_bytes: int = Field(..., gt=0)
    provenance_hash: str = Field(...)
    rights_metadata: RightsMetadata = Field(...)


class MediaPackageManifest(BaseModel):
    """Manifest summarizing all verified media package assets."""

    model_config = ConfigDict(extra="forbid")

    total_visual_assets: int = Field(..., ge=0)
    total_audio_assets: int = Field(..., ge=0)
    has_background_audio: bool = Field(default=False)
    total_size_bytes: int = Field(..., ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Floor04Input(BaseModel):
    """Input payload for Floor 04 execution."""

    model_config = ConfigDict(extra="forbid")

    floor03_payload: Floor03HandoffPayload = Field(...)
    request_id: Optional[str] = Field(default=None)
    execution_mode: ExecutionMode = Field(default=ExecutionMode.HYBRID)


class Floor04HandoffPayload(BaseModel):
    """Authoritative handoff payload produced by Floor 04 for Floor 05."""

    model_config = ConfigDict(extra="forbid")

    request_id: str = Field(...)
    execution_id: UUID = Field(default_factory=uuid4)
    floor03_payload: Floor03HandoffPayload = Field(...)

    synthesized_visual_assets: List[SynthesizedVisualAsset] = Field(default_factory=list)
    synthesized_audio_assets: List[SynthesizedAudioAsset] = Field(default_factory=list)
    background_audio_asset: Optional[SynthesizedAudioAsset] = Field(default=None)

    media_manifest: MediaPackageManifest = Field(...)
    execution_mode: ExecutionMode = Field(default=ExecutionMode.HYBRID)
    provenance_hash: str = Field(...)
    version: str = Field(default="1.0.0")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
