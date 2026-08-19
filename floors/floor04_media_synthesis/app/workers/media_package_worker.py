"""Media Package Assembly Worker for Floor 04."""

from __future__ import annotations

import hashlib
from typing import List, Optional
from uuid import UUID, uuid4

import structlog

from factoryos.guardian.contracts.guardian_state import ExecutionMode
from floors.floor03_asset_realization.app.domain.handoff import Floor03HandoffPayload
from floors.floor04_media_synthesis.app.domain.handoff import Floor04HandoffPayload, MediaPackageManifest, SynthesizedAudioAsset, SynthesizedVisualAsset

logger = structlog.get_logger(__name__)


def run_media_package_worker(
    request_id: str,
    execution_id: UUID,
    f03_payload: Floor03HandoffPayload,
    visual_assets: List[SynthesizedVisualAsset],
    audio_assets: List[SynthesizedAudioAsset],
    bg_audio_asset: Optional[SynthesizedAudioAsset],
    execution_mode: ExecutionMode,
) -> Floor04HandoffPayload:
    """Bundle synthesized visual and audio assets into the authoritative Floor 04 handoff contract."""
    total_size = sum(v.file_size_bytes for v in visual_assets) + sum(a.file_size_bytes for a in audio_assets)
    if bg_audio_asset:
        total_size += bg_audio_asset.file_size_bytes

    manifest = MediaPackageManifest(
        total_visual_assets=len(visual_assets),
        total_audio_assets=len(audio_assets),
        has_background_audio=bg_audio_asset is not None,
        total_size_bytes=total_size,
    )

    all_hashes = "".join(v.sha256_checksum for v in visual_assets) + "".join(a.sha256_checksum for a in audio_assets)
    provenance_hash = hashlib.sha256(f"{request_id}:{execution_id}:{all_hashes}".encode("utf-8")).hexdigest()

    handoff = Floor04HandoffPayload(
        request_id=request_id,
        execution_id=execution_id,
        floor03_payload=f03_payload,
        synthesized_visual_assets=visual_assets,
        synthesized_audio_assets=audio_assets,
        background_audio_asset=bg_audio_asset,
        media_manifest=manifest,
        execution_mode=execution_mode,
        provenance_hash=provenance_hash,
    )

    logger.info("media_package_assembled", request_id=request_id, visual_count=len(visual_assets), audio_count=len(audio_assets))
    return handoff
