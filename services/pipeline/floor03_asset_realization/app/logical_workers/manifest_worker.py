"""Manifest Worker for Floor 03.

Assembles overall AssetManifest grouping all visual and audio specifications.
"""

from __future__ import annotations

from typing import List, Tuple

import structlog

from floors.floor03_asset_realization.app.domain.asset_models import AssetManifest, AudioAssetRequirement, VisualAssetRequirement
from floors.floor03_asset_realization.app.domain.handoff import EvidenceType, ExecutionMode, ProvenanceEntry

logger = structlog.get_logger(__name__)


class ManifestWorker:
    """Logical worker responsible for assembling AssetManifest."""

    def execute(
        self,
        script_id: str,
        script_version: int,
        resolved_platform: str,
        resolved_aspect_ratio: str,
        resolved_resolution: str,
        visual_reqs: List[VisualAssetRequirement],
        audio_reqs: List[AudioAssetRequirement],
    ) -> Tuple[AssetManifest, ExecutionMode, List[ProvenanceEntry]]:
        logger.info("manifest_worker_started", script_id=script_id, resolved_platform=resolved_platform)

        manifest = AssetManifest(
            script_id=script_id,
            script_version=script_version,
            total_visual_assets=len(visual_reqs),
            total_audio_assets=len(audio_reqs),
            resolved_platform=resolved_platform,
            resolved_aspect_ratio=resolved_aspect_ratio,
            resolved_resolution=resolved_resolution,
        )

        provenance = [
            ProvenanceEntry(
                evidence_type=EvidenceType.DETERMINISTIC_RULE,
                source_type="manifest_worker",
                source_identifier=manifest.manifest_id,
                method="assemble_asset_manifest",
                summary=(
                    f"Assembled AssetManifest for script {script_id} (platform={resolved_platform}, "
                    f"visual={len(visual_reqs)}, audio={len(audio_reqs)})."
                ),
                raw_data={
                    "manifest_id": manifest.manifest_id,
                    "resolved_platform": resolved_platform,
                    "resolved_aspect_ratio": resolved_aspect_ratio,
                    "resolved_resolution": resolved_resolution,
                },
            )
        ]

        logger.info("manifest_worker_completed", manifest_id=manifest.manifest_id)
        return manifest, ExecutionMode.DETERMINISTIC, provenance
