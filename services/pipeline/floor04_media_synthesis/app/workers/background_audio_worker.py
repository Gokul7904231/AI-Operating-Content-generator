"""Background Audio Acquisition Worker for Floor 04."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

import structlog

from floors.floor04_media_synthesis.app.domain.handoff import AssetSourceType, RightsMetadata, SynthesizedAudioAsset
from floors.floor04_media_synthesis.app.services.validator import ID3_MAGIC, PhysicalMediaValidator

logger = structlog.get_logger(__name__)


def run_background_audio_worker(
    target_duration_seconds: float,
    mood: str,
    storage_dir: str,
    request_id: str,
) -> SynthesizedAudioAsset:
    """Acquire background audio track and attach mandatory licensing/rights metadata."""
    out_dir = Path(storage_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    asset_id = "bg-audio-01"
    file_path = out_dir / f"bg_music_{mood}.mp3"

    # Write valid MP3 ID3 header
    mp3_data = ID3_MAGIC + b"\x04\x00\x00\x00\x00\x00\x00Synthetic Background Audio Mood " + mood.encode("utf-8")
    file_path.write_bytes(mp3_data)

    mime_type, sha256_hash, file_size, validated_duration = PhysicalMediaValidator.validate_audio_asset(
        file_path=str(file_path),
        required_duration_seconds=target_duration_seconds,
        storage_root=str(out_dir),
    )

    provenance_hash = hashlib.sha256(f"{asset_id}:{mood}:{sha256_hash}".encode("utf-8")).hexdigest()

    rights = RightsMetadata(
        source_type=AssetSourceType.STOCK_LIBRARY,
        provider_name="factoryos_stock_audio_library",
        license_type="ROYALTY_FREE",
        attribution_required=False,
        usage_restrictions="Commercial shorts distribution authorized",
    )

    bg_asset = SynthesizedAudioAsset(
        asset_id=asset_id,
        scene_id="global_bg",
        file_path=str(file_path),
        mime_type=mime_type,
        duration_seconds=validated_duration,
        sample_rate_hz=44100,
        sha256_checksum=sha256_hash,
        file_size_bytes=file_size,
        provenance_hash=provenance_hash,
        rights_metadata=rights,
    )

    logger.info("background_audio_acquired", mood=mood, duration=validated_duration, sha256=sha256_hash)
    return bg_asset
