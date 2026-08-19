"""Canonical render input hasher service for Floor 05 Timeline Composition."""

import hashlib
import json
from typing import Any, Dict

from floors.floor04_media_synthesis.app.domain.handoff import Floor04HandoffPayload
from floors.floor05_timeline_composition.app.domain.handoff import TimelineSpec


class CanonicalHasher:
    """Computes deterministic SHA-256 identity for render inputs incorporating key sorting and versioning."""

    CANONICALIZATION_VERSION = "v1"

    @classmethod
    def compute_render_input_hash(
        cls,
        floor04_payload: Floor04HandoffPayload,
        timeline_spec: TimelineSpec,
        renderer_id: str,
        renderer_version: str,
        render_profile: str = "STANDARD_SHORTS",
    ) -> str:
        """Calculate canonical SHA-256 hash across all input properties."""
        # 1. Canonical Floor 04 Asset Snapshot
        f04_snapshot = {
            "provenance_hash": floor04_payload.provenance_hash,
            "visual_assets": sorted(
                [
                    {
                        "asset_id": v.asset_id,
                        "scene_id": v.scene_id,
                        "sha256": v.sha256_checksum,
                        "size": v.file_size_bytes,
                    }
                    for v in floor04_payload.synthesized_visual_assets
                ],
                key=lambda x: x["asset_id"],
            ),
            "audio_assets": sorted(
                [
                    {
                        "asset_id": a.asset_id,
                        "scene_id": a.scene_id,
                        "sha256": a.sha256_checksum,
                        "duration": a.duration_seconds,
                    }
                    for a in floor04_payload.synthesized_audio_assets
                ],
                key=lambda x: x["asset_id"],
            ),
            "bgm_sha256": floor04_payload.background_audio_asset.sha256_checksum if floor04_payload.background_audio_asset else None,
        }

        # 2. Canonical Timeline Spec Snapshot
        timeline_snapshot = {
            "timeline_id": timeline_spec.timeline_id,
            "version": timeline_spec.version,
            "target_width": timeline_spec.target_width,
            "target_height": timeline_spec.target_height,
            "target_fps": timeline_spec.target_fps,
            "aspect_ratio": timeline_spec.aspect_ratio,
            "total_duration": timeline_spec.total_duration_seconds,
            "clips": sorted(
                [
                    {
                        "clip_id": c.clip_id,
                        "track_type": c.track_type.value,
                        "start_time": c.start_time,
                        "end_time": c.end_time,
                        "source_asset_id": c.source_asset_id,
                        "source_version": c.source_asset_version,
                        "volume": c.volume,
                    }
                    for c in timeline_spec.clips
                ],
                key=lambda x: x["clip_id"],
            ),
        }

        # 3. Canonical Render Spec Snapshot
        render_spec_snapshot = {
            "render_profile": render_profile,
            "output_container": "mp4",
            "output_video_codec": "h264",
            "output_audio_codec": "aac",
        }

        # 4. Master Payload Array
        master_payload = {
            "canonicalization_version": cls.CANONICALIZATION_VERSION,
            "f04_snapshot": f04_snapshot,
            "timeline_snapshot": timeline_snapshot,
            "render_spec_snapshot": render_spec_snapshot,
            "renderer_identity": renderer_id,
            "renderer_version": renderer_version,
        }

        # Deterministic JSON string serialization
        canonical_str = json.dumps(master_payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
