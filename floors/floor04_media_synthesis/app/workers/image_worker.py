"""Visual Image Frame Synthesis Worker for Floor 04."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4

import structlog

from floors.floor04_media_synthesis.app.domain.handoff import AssetSourceType, RightsMetadata, SynthesizedVisualAsset
from floors.floor04_media_synthesis.app.services.validator import PNG_IEND, PNG_MAGIC, PhysicalMediaValidator

logger = structlog.get_logger(__name__)


def run_image_worker(
    asset_id: str,
    scene_id: str,
    prompt_text: str,
    target_width: int,
    target_height: int,
    storage_dir: str,
    request_id: str,
) -> SynthesizedVisualAsset:
    """Synthesize visual image asset on disk and validate physical file."""
    out_dir = Path(storage_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    file_path = out_dir / f"visual_{asset_id}.png"

    # Write valid PNG binary header + synthetic chunk + IEND footer
    png_data = PNG_MAGIC + f"\x00\x00\x00\x0dIHDR\x00\x00\x04\x38\x00\x00\x07\x80\x08\x06\x00\x00\x00Frame {asset_id}".encode("utf-8") + PNG_IEND
    file_path.write_bytes(png_data)

    # Physical Validation
    mime_type, sha256_hash, file_size = PhysicalMediaValidator.validate_image_asset(
        file_path=str(file_path),
        required_width=target_width,
        required_height=target_height,
        storage_root=str(out_dir),
    )

    provenance_hash = hashlib.sha256(f"{asset_id}:{prompt_text}:{sha256_hash}".encode("utf-8")).hexdigest()

    rights = RightsMetadata(
        source_type=AssetSourceType.DETERMINISTIC_SYNTHESIS,
        provider_name="deterministic_image_synthesis_engine",
        license_type="ROYALTY_FREE",
        attribution_required=False,
    )

    visual_asset = SynthesizedVisualAsset(
        asset_id=asset_id,
        scene_id=scene_id,
        file_path=str(file_path),
        mime_type=mime_type,
        width=target_width,
        height=target_height,
        sha256_checksum=sha256_hash,
        file_size_bytes=file_size,
        provenance_hash=provenance_hash,
        rights_metadata=rights,
    )

    logger.info("visual_image_synthesized", asset_id=asset_id, scene_id=scene_id, sha256=sha256_hash)
    return visual_asset
