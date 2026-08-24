"""Continuity Worker for Floor 03.

Enforces character reference matching and visual continuity constraints across asset specifications.
"""

from __future__ import annotations

from typing import List, Tuple

import structlog

from floors.floor02_scripting.app.domain.script_models import CharacterProfile
from floors.floor03_asset_realization.app.domain.asset_models import VisualAssetRequirement
from floors.floor03_asset_realization.app.domain.handoff import EvidenceType, ExecutionMode, ProvenanceEntry

logger = structlog.get_logger(__name__)


class ContinuityWorker:
    """Logical worker responsible for attaching visual continuity metadata to asset requirements."""

    def execute(
        self,
        visual_reqs: List[VisualAssetRequirement],
        character_profiles: List[CharacterProfile],
    ) -> Tuple[List[VisualAssetRequirement], ExecutionMode, List[ProvenanceEntry]]:
        logger.info("continuity_worker_started", visual_req_count=len(visual_reqs))

        char_map = {c.character_id: c for c in character_profiles}
        provenance: List[ProvenanceEntry] = []

        for req in visual_reqs:
            matched_chars = [char_map[cid] for cid in req.character_references if cid in char_map]
            if matched_chars:
                char_descriptors = [f"{c.name} ({c.role})" for c in matched_chars]
                req.continuity_constraints["character_descriptors"] = char_descriptors

            provenance.append(
                ProvenanceEntry(
                    evidence_type=EvidenceType.DETERMINISTIC_RULE,
                    source_type="continuity_worker",
                    source_identifier=req.scene_id,
                    method="attach_visual_continuity_constraints",
                    summary=f"Attached {len(matched_chars)} character profiles to scene {req.scene_id} continuity constraints.",
                    raw_data={"scene_id": req.scene_id, "character_count": len(matched_chars)},
                )
            )

        logger.info("continuity_worker_completed", visual_req_count=len(visual_reqs))
        return visual_reqs, ExecutionMode.DETERMINISTIC, provenance
