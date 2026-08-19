"""Domain models for Floor 03 (Asset Specification & Realization Planning)."""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class AssetType(str, Enum):
    VISUAL = "visual"
    AUDIO = "audio"


class AssetRole(str, Enum):
    BACKGROUND_VISUAL = "background_visual"
    CHARACTER_OVERLAY = "character_overlay"
    VOICEOVER_AUDIO = "voiceover_audio"
    SOUND_EFFECT = "sound_effect"


class VisualAssetRequirement(BaseModel):
    """Machine-consumable specification for a single visual asset requirement."""

    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(default_factory=lambda: str(uuid4()))
    asset_version: int = Field(default=1, ge=1)
    asset_type: AssetType = Field(default=AssetType.VISUAL)
    asset_role: AssetRole = Field(default=AssetRole.BACKGROUND_VISUAL)
    scene_id: str = Field(...)
    scene_version: int = Field(default=1, ge=1)
    sequence_index: int = Field(..., ge=1)
    prompt_text: str = Field(...)
    aspect_ratio: str = Field(...)
    resolution: str = Field(...)
    style_preset: Optional[str] = Field(default=None)
    target_duration_seconds: float = Field(..., ge=0.0)
    character_references: List[str] = Field(default_factory=list)
    continuity_constraints: Dict[str, Any] = Field(default_factory=dict)


class AudioAssetRequirement(BaseModel):
    """Machine-consumable specification for a single audio asset requirement."""

    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(default_factory=lambda: str(uuid4()))
    asset_version: int = Field(default=1, ge=1)
    asset_type: AssetType = Field(default=AssetType.AUDIO)
    asset_role: AssetRole = Field(default=AssetRole.VOICEOVER_AUDIO)
    scene_id: str = Field(...)
    scene_version: int = Field(default=1, ge=1)
    sequence_index: int = Field(..., ge=1)
    voice_id: Optional[str] = Field(default=None)
    narration_text: str = Field(...)
    speech_rate: float = Field(default=2.5, ge=0.1, le=10.0)
    estimated_speech_duration_seconds: float = Field(..., ge=0.0)


class AssetManifest(BaseModel):
    """Overall floor asset manifest grouping visual and audio specifications."""

    model_config = ConfigDict(extra="forbid")

    manifest_id: str = Field(default_factory=lambda: str(uuid4()))
    script_id: str = Field(...)
    script_version: int = Field(default=1, ge=1)
    total_visual_assets: int = Field(..., ge=0)
    total_audio_assets: int = Field(..., ge=0)
    resolved_platform: str = Field(...)
    resolved_aspect_ratio: str = Field(...)
    resolved_resolution: str = Field(...)
